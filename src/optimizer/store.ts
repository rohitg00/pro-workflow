import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { initializeDatabase, getDefaultDbPath } from '../db/index';
import type {
  Candidate,
  OptimizationRun,
  Patch,
  Rejection,
  TrainerConfig,
  Trajectory,
  ValidationItem,
} from './types';

export interface OptimizerStore {
  db: Database.Database;
  createRun: (run: Omit<OptimizationRun, 'id'>) => number;
  updateRun: (id: number, fields: Partial<OptimizationRun>) => void;
  endRun: (id: number, status: OptimizationRun['status'], reason?: string) => void;
  saveCandidate: (c: Omit<Candidate, 'id'>) => number;
  markCandidate: (id: number, status: Candidate['status'], score: number) => void;
  recordPatches: (runId: number, candidateId: number, step: number, epoch: number, patches: Patch[], status?: string) => void;
  rejectPatches: (runId: number, candidateId: number, step: number, epoch: number, patches: Patch[], reason: string) => void;
  saveRejection: (r: Rejection) => void;
  getRejections: (runId: number, limit: number) => Rejection[];
  collectTrajectories: (skillSlug: string, limit: number) => Trajectory[];
  listValidation: (skillSlug: string) => ValidationItem[];
  upsertValidation: (
    skillSlug: string,
    items: Array<Omit<ValidationItem, 'id' | 'frozenAt'> & { learningId?: number | null }>,
  ) => number;
  close: () => void;
}

export function createOptimizerStore(dbPath: string = getDefaultDbPath()): OptimizerStore {
  const db = initializeDatabase(dbPath);

  const createRunStmt = db.prepare(`
    INSERT INTO optimization_runs (
      skill_slug, status, initial_skill_hash, best_skill_hash,
      initial_score, best_score, epochs_completed, accepted_steps, rejected_steps,
      budget_usd, spent_usd, config_json, reason
    ) VALUES (
      @skill_slug, @status, @initial_skill_hash, @best_skill_hash,
      @initial_score, @best_score, @epochs_completed, @accepted_steps, @rejected_steps,
      @budget_usd, @spent_usd, @config_json, @reason
    )
  `);

  const endRunStmt = db.prepare(`
    UPDATE optimization_runs
    SET status = @status, reason = COALESCE(@reason, reason), ended_at = datetime('now')
    WHERE id = @id
  `);

  const insertCandStmt = db.prepare(`
    INSERT INTO optimization_candidates (
      run_id, parent_hash, content_hash, content, source_patches_json,
      step, epoch, score, status
    ) VALUES (
      @run_id, @parent_hash, @content_hash, @content, @source_patches_json,
      @step, @epoch, @score, @status
    )
    ON CONFLICT(run_id, content_hash) DO UPDATE SET
      score = excluded.score,
      status = excluded.status
    RETURNING id
  `);

  const markCandStmt = db.prepare(`
    UPDATE optimization_candidates
    SET status = @status, score = @score, evaluated_at = datetime('now')
    WHERE id = @id
  `);

  const insertPatchStmt = db.prepare(`
    INSERT INTO optimization_patches (
      run_id, candidate_id, step, epoch, op, anchor, payload, status, rejected_reason
    ) VALUES (
      @run_id, @candidate_id, @step, @epoch, @op, @anchor, @payload, @status, @rejected_reason
    )
  `);

  const insertRejectionStmt = db.prepare(`
    INSERT INTO optimization_rejections (run_id, candidate_hash, patches_json, reason, delta_score)
    VALUES (@run_id, @candidate_hash, @patches_json, @reason, @delta_score)
  `);

  const listRejectionsStmt = db.prepare(`
    SELECT run_id, candidate_hash, patches_json, reason, delta_score
    FROM optimization_rejections
    WHERE run_id = ?
    ORDER BY id DESC
    LIMIT ?
  `);

  const collectTrajStmt = db.prepare(`
    SELECT id, category, rule, mistake, correction, times_applied, created_at
    FROM learnings
    WHERE project IS NULL OR project = @slug
    ORDER BY times_applied DESC, created_at DESC
    LIMIT @limit
  `);

  const listValidationStmt = db.prepare(`
    SELECT id, skill_slug, prompt, expected, weight, frozen_at
    FROM optimization_validation
    WHERE skill_slug = ?
  `);

  const insertValidationStmt = db.prepare(`
    INSERT INTO optimization_validation (skill_slug, learning_id, prompt_hash, prompt, expected, weight)
    VALUES (@skill_slug, @learning_id, @prompt_hash, @prompt, @expected, @weight)
    ON CONFLICT(skill_slug, prompt_hash) DO UPDATE SET
      expected = excluded.expected,
      weight = excluded.weight
  `);

  return {
    db,
    createRun(run) {
      const info = createRunStmt.run({
        skill_slug: run.skillSlug,
        status: run.status,
        initial_skill_hash: run.initialSkillHash,
        best_skill_hash: run.bestSkillHash,
        initial_score: run.initialScore,
        best_score: run.bestScore,
        epochs_completed: run.epochsCompleted,
        accepted_steps: run.acceptedSteps,
        rejected_steps: run.rejectedSteps,
        budget_usd: run.budgetUsd,
        spent_usd: run.spentUsd,
        config_json: JSON.stringify(run.config),
        reason: run.reason,
      });
      return Number(info.lastInsertRowid);
    },

    updateRun(id, fields) {
      const sets: string[] = [];
      const params: Record<string, unknown> = { id };
      if (fields.bestSkillHash !== undefined) { sets.push('best_skill_hash = @bestSkillHash'); params.bestSkillHash = fields.bestSkillHash; }
      if (fields.bestScore !== undefined) { sets.push('best_score = @bestScore'); params.bestScore = fields.bestScore; }
      if (fields.initialScore !== undefined) { sets.push('initial_score = @initialScore'); params.initialScore = fields.initialScore; }
      if (fields.epochsCompleted !== undefined) { sets.push('epochs_completed = @epochsCompleted'); params.epochsCompleted = fields.epochsCompleted; }
      if (fields.acceptedSteps !== undefined) { sets.push('accepted_steps = @acceptedSteps'); params.acceptedSteps = fields.acceptedSteps; }
      if (fields.rejectedSteps !== undefined) { sets.push('rejected_steps = @rejectedSteps'); params.rejectedSteps = fields.rejectedSteps; }
      if (fields.spentUsd !== undefined) { sets.push('spent_usd = @spentUsd'); params.spentUsd = fields.spentUsd; }
      if (sets.length === 0) return;
      db.prepare(`UPDATE optimization_runs SET ${sets.join(', ')} WHERE id = @id`).run(params);
    },

    endRun(id, status, reason) {
      endRunStmt.run({ id, status, reason: reason ?? null });
    },

    saveCandidate(c) {
      const row = insertCandStmt.get({
        run_id: c.runId,
        parent_hash: c.parentHash,
        content_hash: c.contentHash,
        content: c.content,
        source_patches_json: JSON.stringify(c.sourcePatches),
        step: c.step,
        epoch: c.epoch,
        score: c.score ?? null,
        status: c.status,
      }) as { id: number };
      return row.id;
    },

    markCandidate(id, status, score) {
      markCandStmt.run({ id, status, score });
    },

    recordPatches(runId, candidateId, step, epoch, patches, status = 'applied') {
      const insert = db.transaction(() => {
        for (const p of patches) {
          insertPatchStmt.run({
            run_id: runId,
            candidate_id: candidateId,
            step,
            epoch,
            op: p.op,
            anchor: p.anchor,
            payload: p.payload,
            status,
            rejected_reason: null,
          });
        }
      });
      insert();
    },

    rejectPatches(runId, candidateId, step, epoch, patches, reason) {
      const insert = db.transaction(() => {
        for (const p of patches) {
          insertPatchStmt.run({
            run_id: runId,
            candidate_id: candidateId,
            step,
            epoch,
            op: p.op,
            anchor: p.anchor,
            payload: p.payload,
            status: 'rejected',
            rejected_reason: reason,
          });
        }
      });
      insert();
    },

    saveRejection(r) {
      insertRejectionStmt.run({
        run_id: r.runId,
        candidate_hash: r.candidateHash,
        patches_json: JSON.stringify(r.patches),
        reason: r.reason,
        delta_score: r.deltaScore,
      });
    },

    getRejections(runId, limit) {
      const rows = listRejectionsStmt.all(runId, limit) as Array<{
        run_id: number;
        candidate_hash: string;
        patches_json: string;
        reason: string;
        delta_score: number | null;
      }>;
      return rows.map((row) => ({
        runId: row.run_id,
        candidateHash: row.candidate_hash,
        patches: JSON.parse(row.patches_json) as Patch[],
        reason: row.reason,
        deltaScore: row.delta_score,
      }));
    },

    collectTrajectories(slug, limit) {
      const rows = collectTrajStmt.all({ slug, limit }) as Array<{
        id: number;
        category: string;
        rule: string;
        mistake: string | null;
        correction: string | null;
        times_applied: number;
        created_at: string;
      }>;
      return rows.map((r) => ({
        learningId: r.id,
        category: r.category,
        rule: r.rule,
        mistake: r.mistake,
        correction: r.correction,
        timesApplied: r.times_applied,
        createdAt: r.created_at,
      }));
    },

    listValidation(slug) {
      const rows = listValidationStmt.all(slug) as Array<{
        id: number; skill_slug: string; prompt: string; expected: string; weight: number; frozen_at: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        skillSlug: r.skill_slug,
        prompt: r.prompt,
        expected: r.expected,
        weight: r.weight,
        frozenAt: r.frozen_at,
      }));
    },

    upsertValidation(slug, items) {
      const insert = db.transaction(() => {
        for (const it of items) {
          const promptHash = createHash('sha256').update(it.prompt, 'utf8').digest('hex').slice(0, 16);
          insertValidationStmt.run({
            skill_slug: slug,
            learning_id: it.learningId ?? null,
            prompt_hash: promptHash,
            prompt: it.prompt,
            expected: it.expected,
            weight: it.weight,
          });
        }
      });
      insert();
      return items.length;
    },

    close() {
      db.close();
    },
  };
}

export function trajectoriesToValidation(
  slug: string,
  trajectories: Trajectory[],
  holdout: number,
): {
  train: Trajectory[];
  validation: Array<Omit<ValidationItem, 'id' | 'frozenAt'> & { learningId: number }>;
} {
  const sorted = [...trajectories].sort((a, b) => (a.timesApplied - b.timesApplied) || (a.learningId - b.learningId));
  const valCount = Math.min(holdout, Math.floor(sorted.length / 4));
  const validationRows = sorted.slice(-valCount);
  const trainRows = sorted.slice(0, sorted.length - valCount);
  const validation = validationRows.map((t) => ({
    skillSlug: slug,
    learningId: t.learningId,
    prompt: t.mistake ?? `Scenario from category "${t.category}"`,
    expected: t.correction ?? t.rule,
    weight: 1 + Math.min(2, Math.log2(1 + t.timesApplied)),
  }));
  return { train: trainRows, validation };
}

export const __test = { trajectoriesToValidation };
