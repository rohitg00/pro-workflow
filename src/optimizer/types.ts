export type PatchOp = 'add' | 'delete' | 'replace';

export interface Patch {
  op: PatchOp;
  anchor: string;
  payload: string;
}

export interface Trajectory {
  learningId: number;
  category: string;
  rule: string;
  mistake: string | null;
  correction: string | null;
  timesApplied: number;
  createdAt: string;
}

export interface ValidationItem {
  id: number;
  skillSlug: string;
  prompt: string;
  expected: string;
  weight: number;
  frozenAt: string;
}

export interface ValidationOutcome {
  itemId: number;
  pass: boolean;
  score: number;
  rationale: string;
}

export interface ValidationResult {
  total: number;
  passed: number;
  weightedScore: number;
  outcomes: ValidationOutcome[];
}

export interface Candidate {
  id?: number;
  runId: number;
  parentHash: string;
  contentHash: string;
  content: string;
  sourcePatches: Patch[];
  step: number;
  epoch: number;
  score?: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface OptimizationRun {
  id?: number;
  skillSlug: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  initialSkillHash: string;
  bestSkillHash: string | null;
  initialScore: number | null;
  bestScore: number | null;
  epochsCompleted: number;
  acceptedSteps: number;
  rejectedSteps: number;
  budgetUsd: number;
  spentUsd: number;
  config: TrainerConfig;
  reason: string | null;
}

export interface TrainerConfig {
  epochs: number;
  batchSize: number;
  minibatches: number;
  lrBudget: LRBudget;
  validationHoldout: number;
  budgetUsd: number;
  optimizerModel: string;
  optimizerProvider: 'anthropic' | 'openai' | 'openrouter' | 'fireworks';
  evaluatorModel: string;
  evaluatorProvider: 'anthropic' | 'openai' | 'openrouter' | 'fireworks';
  slowUpdateEveryEpochs: number;
  metaUpdateEveryEpochs: number;
  acceptThreshold: number;
  maxSkillTokens: number;
  killSwitchPath: string;
}

export interface LRBudget {
  maxAdds: number;
  maxDeletes: number;
  maxReplaces: number;
}

export interface Rejection {
  runId: number;
  candidateHash: string;
  patches: Patch[];
  reason: string;
  deltaScore: number | null;
}

export interface ReflectInput {
  currentSkill: string;
  trajectories: Trajectory[];
  rejectedHistory: Rejection[];
  lrBudget: LRBudget;
}

export interface ReflectOutput {
  patches: Patch[];
  reasoning: string;
  costUsd: number;
}
