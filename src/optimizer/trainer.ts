import { aggregatePatches } from './aggregate';
import { applyPatches } from './apply';
import { clipByLR } from './clip';
import { skillHash } from './hash';
import { reflect } from './reflect';
import { runSlowUpdate } from './slow';
import { validateSkill } from './validate';
import { createOptimizerStore, trajectoriesToValidation, type OptimizerStore } from './store';
import type {
  Candidate,
  OptimizationRun,
  Patch,
  TrainerConfig,
  Trajectory,
  ValidationItem,
} from './types';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export interface TrainerArgs {
  skillSlug: string;
  skillPath: string;
  config: TrainerConfig;
  trajectoryLimit?: number;
  logger?: (line: string) => void;
  store?: OptimizerStore;
}

export interface TrainerOutcome {
  runId: number;
  bestSkill: string;
  bestSkillHash: string;
  bestScore: number;
  initialScore: number;
  epochsCompleted: number;
  acceptedSteps: number;
  rejectedSteps: number;
  spentUsd: number;
  stoppedReason: string;
}

export async function train(args: TrainerArgs): Promise<TrainerOutcome> {
  const log = args.logger ?? ((line: string) => process.stderr.write(`[skill-optimizer] ${line}\n`));
  const store = args.store ?? createOptimizerStore();
  let ownStore = !args.store;

  try {
    const initialSkill = readFileSync(args.skillPath, 'utf8');
    const initialHash = skillHash(initialSkill);

    const trajectories = store.collectTrajectories(args.skillSlug, args.trajectoryLimit ?? 200);
    if (trajectories.length < 8) {
      throw new Error(`only ${trajectories.length} trajectories for "${args.skillSlug}"; need >= 8`);
    }

    const { train: trainTraj, validation: valSeeds } = trajectoriesToValidation(
      args.skillSlug,
      trajectories,
      args.config.validationHoldout,
    );
    store.upsertValidation(args.skillSlug, valSeeds);
    const validationItems = store.listValidation(args.skillSlug);
    log(`trajectories: train=${trainTraj.length} validation=${validationItems.length}`);

    const runId = store.createRun({
      skillSlug: args.skillSlug,
      status: 'running',
      initialSkillHash: initialHash,
      bestSkillHash: initialHash,
      initialScore: null,
      bestScore: null,
      epochsCompleted: 0,
      acceptedSteps: 0,
      rejectedSteps: 0,
      budgetUsd: args.config.budgetUsd,
      spentUsd: 0,
      config: args.config,
      reason: null,
    });

    const initialEval = await validateSkill({
      skill: initialSkill,
      items: validationItems,
      provider: args.config.evaluatorProvider,
      model: args.config.evaluatorModel,
    });
    let spent = initialEval.costUsd;
    let bestSkill = initialSkill;
    let bestScore = initialEval.result.weightedScore;
    let bestHash = initialHash;
    store.updateRun(runId, { initialScore: bestScore, bestScore });
    log(`baseline: score=${bestScore.toFixed(3)} (${initialEval.result.passed}/${initialEval.result.total})`);

    let accepted = 0;
    let rejected = 0;
    let epoch = 0;
    let stoppedReason = 'completed';

    for (epoch = 1; epoch <= args.config.epochs; epoch++) {
      if (existsSync(args.config.killSwitchPath)) {
        stoppedReason = `kill-switch ${args.config.killSwitchPath}`;
        break;
      }
      if (spent >= args.config.budgetUsd) {
        stoppedReason = `budget exhausted at $${spent.toFixed(2)}`;
        break;
      }

      const batches = makeMinibatches(trainTraj, args.config.batchSize, args.config.minibatches);
      log(`epoch ${epoch}: ${batches.length} minibatch(es) of ~${args.config.batchSize}`);

      const epochPatchBatches: Patch[][] = [];
      for (let b = 0; b < batches.length; b++) {
        const batchPatches = await reflect({
          input: {
            currentSkill: bestSkill,
            trajectories: batches[b],
            rejectedHistory: store.getRejections(runId, 10),
            lrBudget: args.config.lrBudget,
          },
          provider: args.config.optimizerProvider,
          model: args.config.optimizerModel,
        });
        spent += batchPatches.costUsd;
        store.updateRun(runId, { spentUsd: spent });
        epochPatchBatches.push(batchPatches.patches);
        log(`  minibatch ${b + 1}/${batches.length}: ${batchPatches.patches.length} raw patches (spent $${spent.toFixed(3)})`);
        if (spent >= args.config.budgetUsd) break;
      }

      const aggregated = aggregatePatches(epochPatchBatches);
      const clipped = clipByLR(aggregated.merged, args.config.lrBudget);
      if (clipped.selected.length === 0) {
        log(`  no patches selected; continuing`);
        continue;
      }

      const { content: candContent, applied, skipped } = applyPatches(bestSkill, clipped.selected);
      const candidateHash = skillHash(candContent);
      if (candidateHash === bestHash) {
        log(`  candidate identical to best after apply; skipping`);
        continue;
      }
      if (candidateTokens(candContent) > args.config.maxSkillTokens) {
        log(`  candidate exceeds maxSkillTokens (${args.config.maxSkillTokens}); rejecting`);
        rejected++;
        store.saveRejection({
          runId,
          candidateHash,
          patches: applied,
          reason: 'exceeds_max_tokens',
          deltaScore: null,
        });
        continue;
      }

      const cand: Omit<Candidate, 'id'> = {
        runId,
        parentHash: bestHash,
        contentHash: candidateHash,
        content: candContent,
        sourcePatches: applied,
        step: accepted + rejected + 1,
        epoch,
        status: 'pending',
      };
      const candidateId = store.saveCandidate(cand);
      store.recordPatches(runId, candidateId, cand.step, epoch, applied, 'applied');
      if (skipped.length > 0) {
        store.rejectPatches(runId, candidateId, cand.step, epoch, skipped.map((s) => s.patch), 'anchor_missing');
      }

      const evalRes = await validateSkill({
        skill: candContent,
        items: validationItems,
        provider: args.config.evaluatorProvider,
        model: args.config.evaluatorModel,
      });
      spent += evalRes.costUsd;
      store.updateRun(runId, { spentUsd: spent });

      const delta = evalRes.result.weightedScore - bestScore;
      log(`  candidate score=${evalRes.result.weightedScore.toFixed(3)} (delta=${delta >= 0 ? '+' : ''}${delta.toFixed(3)})`);

      if (delta >= args.config.acceptThreshold) {
        accepted++;
        bestSkill = candContent;
        bestScore = evalRes.result.weightedScore;
        bestHash = candidateHash;
        store.markCandidate(candidateId, 'accepted', evalRes.result.weightedScore);
        store.updateRun(runId, {
          bestSkillHash: bestHash,
          bestScore,
          acceptedSteps: accepted,
          rejectedSteps: rejected,
          epochsCompleted: epoch,
        });
        log(`  ACCEPTED step ${cand.step}`);
      } else {
        rejected++;
        store.markCandidate(candidateId, 'rejected', evalRes.result.weightedScore);
        store.saveRejection({
          runId,
          candidateHash,
          patches: applied,
          reason: `delta ${delta.toFixed(3)} < threshold ${args.config.acceptThreshold}`,
          deltaScore: delta,
        });
        store.updateRun(runId, {
          rejectedSteps: rejected,
          epochsCompleted: epoch,
        });
        log(`  REJECTED step ${cand.step}`);
      }

      if (args.config.slowUpdateEveryEpochs > 0 && epoch % args.config.slowUpdateEveryEpochs === 0) {
        log(`  epoch boundary: running slow update`);
        const slow = await runSlowUpdate({
          bestSkill,
          recentlyAcceptedDiffs: [],
          acceptedTrajectories: trainTraj.slice(0, 12),
          provider: args.config.optimizerProvider,
          model: args.config.optimizerModel,
        });
        spent += slow.costUsd;
        store.updateRun(runId, { spentUsd: spent });
        if (slow.changed) {
          const slowEval = await validateSkill({
            skill: slow.skill,
            items: validationItems,
            provider: args.config.evaluatorProvider,
            model: args.config.evaluatorModel,
          });
          spent += slowEval.costUsd;
          if (slowEval.result.weightedScore >= bestScore) {
            bestSkill = slow.skill;
            bestScore = slowEval.result.weightedScore;
            bestHash = skillHash(bestSkill);
            store.updateRun(runId, { bestSkillHash: bestHash, bestScore, spentUsd: spent });
            log(`  slow update ACCEPTED (score ${bestScore.toFixed(3)})`);
          } else {
            log(`  slow update rejected (score ${slowEval.result.weightedScore.toFixed(3)} < ${bestScore.toFixed(3)})`);
            store.updateRun(runId, { spentUsd: spent });
          }
        }
      }
    }

    writeBestSkill(args.skillPath, bestSkill, bestHash, args.skillSlug);
    store.endRun(runId, 'completed', stoppedReason);

    return {
      runId,
      bestSkill,
      bestSkillHash: bestHash,
      bestScore,
      initialScore: initialEval.result.weightedScore,
      epochsCompleted: epoch - 1,
      acceptedSteps: accepted,
      rejectedSteps: rejected,
      spentUsd: spent,
      stoppedReason,
    };
  } finally {
    if (ownStore) store.close();
  }
}

function makeMinibatches(traj: Trajectory[], batchSize: number, count: number): Trajectory[][] {
  const out: Trajectory[][] = [];
  for (let i = 0; i < count; i++) {
    const shuffled = [...traj].sort(() => Math.random() - 0.5);
    out.push(shuffled.slice(0, batchSize));
  }
  return out;
}

function candidateTokens(s: string): number {
  return Math.ceil(s.length / 3.5);
}

function writeBestSkill(path: string, content: string, hash: string, slug: string): void {
  const stamp = `<!-- skill-optimizer: hash=${hash} slug=${slug} -->\n`;
  writeFileSync(path, content.endsWith('\n') ? content + stamp : content + '\n' + stamp, 'utf8');
}
