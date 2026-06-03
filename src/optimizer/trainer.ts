import { aggregatePatches } from './aggregate';
import { applyPatches } from './apply';
import { clipByLR } from './clip';
import { skillHash } from './hash';
import { reflect } from './reflect';
import { runSlowUpdate } from './slow';
import { validateSkill } from './validate';
import { createOptimizerStore, trajectoriesToValidation, type OptimizerStore } from './store';
import type { Candidate, Patch, TrainerConfig, Trajectory } from './types';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const STAMP_RE = /\n?<!-- skill-optimizer: [^>]*-->\s*/g;

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
  const ownStore = !args.store;

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
    if (validationItems.length < 2) {
      throw new Error(
        `validation set too small (${validationItems.length} items). ` +
        `Need at least 2; increase --holdout or accumulate more learn-rule rows.`,
      );
    }
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

    let spent = 0;
    let bestSkill = initialSkill;
    let bestHash = initialHash;
    let accepted = 0;
    let rejected = 0;
    let epoch = 0;
    let stoppedReason = 'completed';
    const recentlyAcceptedDiffs: string[] = [];
    let initialScoreValue = 0;
    let bestScore = 0;

    const flushAndEnd = (status: 'completed' | 'failed' | 'stopped', reason: string) => {
      store.updateRun(runId, {
        spentUsd: spent,
        acceptedSteps: accepted,
        rejectedSteps: rejected,
        epochsCompleted: epoch,
        bestSkillHash: bestHash,
        bestScore,
      });
      store.endRun(runId, status, reason);
    };

    const guardBudget = (estimateUsd: number, label: string): boolean => {
      const remaining = args.config.budgetUsd - spent;
      if (remaining <= 0 || remaining < estimateUsd) {
        log(`  budget guard: $${remaining.toFixed(3)} left, skipping ${label}`);
        stoppedReason = `budget exhausted before ${label} (spent $${spent.toFixed(3)})`;
        return false;
      }
      return true;
    };

    try {
      if (!guardBudget(0.005, 'baseline eval')) {
        flushAndEnd('stopped', stoppedReason);
        return outcome(runId, bestSkill, bestHash, 0, 0, epoch, accepted, rejected, spent, stoppedReason);
      }
      const initialEval = await validateSkill({
        skill: initialSkill,
        items: validationItems,
        provider: args.config.evaluatorProvider,
        model: args.config.evaluatorModel,
      });
      spent += initialEval.costUsd;
      initialScoreValue = initialEval.result.weightedScore;
      bestScore = initialScoreValue;
      store.updateRun(runId, { spentUsd: spent, initialScore: initialScoreValue, bestScore });
      log(`baseline: score=${bestScore.toFixed(3)} (${initialEval.result.passed}/${initialEval.result.total})`);

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
          if (!guardBudget(0.02, `reflect minibatch ${b + 1}`)) break;
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

        const candStep = accepted + rejected + 1;
        if (!guardBudget(0.01, `evaluate step ${candStep}`)) break;

        const cand: Omit<Candidate, 'id'> = {
          runId,
          parentHash: bestHash,
          contentHash: candidateHash,
          content: candContent,
          sourcePatches: applied,
          step: candStep,
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
          recentlyAcceptedDiffs.push(summarizeDiff(bestSkill, candContent, applied));
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
          store.updateRun(runId, { rejectedSteps: rejected, epochsCompleted: epoch });
          log(`  REJECTED step ${cand.step}`);
        }

        if (args.config.slowUpdateEveryEpochs > 0 && epoch % args.config.slowUpdateEveryEpochs === 0) {
          if (!guardBudget(0.05, 'slow update')) break;
          log(`  epoch boundary: running slow update`);
          const slow = await runSlowUpdate({
            bestSkill,
            recentlyAcceptedDiffs: recentlyAcceptedDiffs.slice(-8),
            acceptedTrajectories: trainTraj.slice(0, 12),
            provider: args.config.optimizerProvider,
            model: args.config.optimizerModel,
          });
          spent += slow.costUsd;
          store.updateRun(runId, { spentUsd: spent });
          if (slow.changed) {
            if (!guardBudget(0.01, 'slow update eval')) break;
            const slowEval = await validateSkill({
              skill: slow.skill,
              items: validationItems,
              provider: args.config.evaluatorProvider,
              model: args.config.evaluatorModel,
            });
            spent += slowEval.costUsd;
            const slowDelta = slowEval.result.weightedScore - bestScore;
            if (slowDelta >= args.config.acceptThreshold) {
              bestSkill = slow.skill;
              bestScore = slowEval.result.weightedScore;
              bestHash = skillHash(bestSkill);
              store.updateRun(runId, { bestSkillHash: bestHash, bestScore, spentUsd: spent });
              log(`  slow update ACCEPTED (score ${bestScore.toFixed(3)})`);
            } else {
              log(`  slow update rejected (delta ${slowDelta.toFixed(3)} < threshold ${args.config.acceptThreshold})`);
              store.updateRun(runId, { spentUsd: spent });
            }
          }
        }
      }

      if (bestHash !== initialHash) {
        writeBestSkill(args.skillPath, bestSkill, bestHash, args.skillSlug);
      } else {
        log(`no candidate beat baseline; SKILL.md left untouched`);
      }
      flushAndEnd('completed', stoppedReason);
      return outcome(runId, bestSkill, bestHash, bestScore, initialScoreValue, epoch - 1, accepted, rejected, spent, stoppedReason);
    } catch (err) {
      flushAndEnd('failed', (err as Error).message ?? 'unknown error');
      throw err;
    }
  } finally {
    if (ownStore) store.close();
  }
}

function outcome(
  runId: number,
  bestSkill: string,
  bestSkillHash: string,
  bestScore: number,
  initialScore: number,
  epochsCompleted: number,
  acceptedSteps: number,
  rejectedSteps: number,
  spentUsd: number,
  stoppedReason: string,
): TrainerOutcome {
  return {
    runId,
    bestSkill,
    bestSkillHash,
    bestScore,
    initialScore,
    epochsCompleted,
    acceptedSteps,
    rejectedSteps,
    spentUsd,
    stoppedReason,
  };
}

function makeMinibatches(traj: Trajectory[], batchSize: number, count: number): Trajectory[][] {
  const out: Trajectory[][] = [];
  for (let i = 0; i < count; i++) {
    const shuffled = fisherYatesShuffle([...traj]);
    out.push(shuffled.slice(0, batchSize));
  }
  return out;
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function candidateTokens(s: string): number {
  return Math.ceil(s.length / 3.5);
}

function summarizeDiff(before: string, after: string, applied: Patch[]): string {
  const beforeLen = before.length;
  const afterLen = after.length;
  return `step len ${beforeLen}->${afterLen} (${applied.length} patches: ${applied.map((p) => p.op).join(',')})`;
}

export function stripExistingStamp(content: string): string {
  return content.replace(STAMP_RE, '');
}

function writeBestSkill(path: string, content: string, hash: string, slug: string): void {
  const cleaned = stripExistingStamp(content).replace(/\s+$/, '');
  const stamp = `<!-- skill-optimizer: hash=${hash} slug=${slug} -->\n`;
  writeFileSync(path, cleaned + '\n' + stamp, 'utf8');
}
