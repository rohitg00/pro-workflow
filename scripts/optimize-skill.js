#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = {
    slug: null,
    skillPath: null,
    epochs: 3,
    batchSize: 8,
    minibatches: 2,
    holdout: 6,
    budgetUsd: 0.5,
    optimizerModel: 'claude-sonnet-4-6',
    optimizerProvider: 'anthropic',
    evaluatorModel: 'claude-haiku-4-5-20251001',
    evaluatorProvider: 'anthropic',
    slowEvery: 2,
    metaEvery: 5,
    acceptThreshold: 0.0,
    maxSkillTokens: 2000,
    maxAdds: 3,
    maxDeletes: 2,
    maxReplaces: 3,
    json: false,
  };
  const intKeys = new Set(['epochs', 'batchSize', 'minibatches', 'holdout', 'slowEvery', 'metaEvery', 'maxSkillTokens', 'maxAdds', 'maxDeletes', 'maxReplaces']);
  const floatKeys = new Set(['budgetUsd', 'acceptThreshold']);
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') { out.json = true; continue; }
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const v = argv[++i];
    if (v === undefined || v === '') {
      throw new Error(`Missing value for --${key}`);
    }
    if (intKeys.has(key)) {
      const parsed = parseInt(v, 10);
      if (!Number.isFinite(parsed)) throw new Error(`Invalid integer value for --${key}: ${v}`);
      out[key] = parsed;
    } else if (floatKeys.has(key)) {
      const parsed = parseFloat(v);
      if (!Number.isFinite(parsed)) throw new Error(`Invalid number value for --${key}: ${v}`);
      out[key] = parsed;
    } else {
      out[key] = v;
    }
  }
  return out;
}

function inferProvider(model) {
  if (!model) return null;
  if (/^claude-/.test(model)) return 'anthropic';
  if (/^(gpt-|o\d|chatgpt-)/i.test(model) || /openai/i.test(model)) return 'openai';
  if (/(?:^|\/)(?:llama-|mistralai\/|accounts\/fireworks)/i.test(model)) return 'fireworks';
  if (/\//.test(model)) return 'openrouter';
  return null;
}

function findSkillPath(slug) {
  const candidates = [
    path.join(ROOT, 'skills', slug, 'SKILL.md'),
    path.join(os.homedir(), '.claude', 'skills', slug, 'SKILL.md'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

(async () => {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
  if (!args.slug) {
    process.stderr.write('Usage: optimize-skill --slug <name> [--skill-path <path>] [options]\n');
    process.exit(1);
  }
  const userSetOptProvider = process.argv.includes('--optimizer-provider');
  const userSetEvalProvider = process.argv.includes('--evaluator-provider');
  if (!userSetOptProvider) {
    const inferred = inferProvider(args.optimizerModel);
    if (inferred) args.optimizerProvider = inferred;
  }
  if (!userSetEvalProvider) {
    const inferred = inferProvider(args.evaluatorModel);
    if (inferred) args.evaluatorProvider = inferred;
  }
  const skillPath = args.skillPath || findSkillPath(args.slug);
  if (!skillPath || !fs.existsSync(skillPath)) {
    process.stderr.write(`SKILL.md not found for slug "${args.slug}"\n`);
    process.exit(1);
  }

  const distPath = path.join(ROOT, 'dist', 'optimizer', 'trainer.js');
  if (!fs.existsSync(distPath)) {
    process.stderr.write(`Run 'npm run build' first; compiled trainer missing at ${distPath}\n`);
    process.exit(1);
  }
  const { train } = require(distPath);

  const killSwitchPath = path.join(os.homedir(), '.pro-workflow', 'STOP');
  const config = {
    epochs: args.epochs,
    batchSize: args.batchSize,
    minibatches: args.minibatches,
    lrBudget: { maxAdds: args.maxAdds, maxDeletes: args.maxDeletes, maxReplaces: args.maxReplaces },
    validationHoldout: args.holdout,
    budgetUsd: args.budgetUsd,
    optimizerModel: args.optimizerModel,
    optimizerProvider: args.optimizerProvider,
    evaluatorModel: args.evaluatorModel,
    evaluatorProvider: args.evaluatorProvider,
    slowUpdateEveryEpochs: args.slowEvery,
    metaUpdateEveryEpochs: args.metaEvery,
    acceptThreshold: args.acceptThreshold,
    maxSkillTokens: args.maxSkillTokens,
    killSwitchPath,
  };

  try {
    const outcome = await train({
      skillSlug: args.slug,
      skillPath,
      config,
      logger: args.json ? () => {} : (line) => process.stderr.write(`[skill-optimizer] ${line}\n`),
    });
    if (args.json) {
      process.stdout.write(JSON.stringify({
        runId: outcome.runId,
        skillPath,
        initialScore: outcome.initialScore,
        bestScore: outcome.bestScore,
        delta: outcome.bestScore - outcome.initialScore,
        epochsCompleted: outcome.epochsCompleted,
        acceptedSteps: outcome.acceptedSteps,
        rejectedSteps: outcome.rejectedSteps,
        spentUsd: outcome.spentUsd,
        bestSkillHash: outcome.bestSkillHash,
        stoppedReason: outcome.stoppedReason,
      }) + '\n');
    } else {
      process.stdout.write(`Done. score ${outcome.initialScore.toFixed(3)} -> ${outcome.bestScore.toFixed(3)} ` +
        `(${outcome.acceptedSteps} accepted, ${outcome.rejectedSteps} rejected, $${outcome.spentUsd.toFixed(3)}).\n`);
    }
    process.exit(0);
  } catch (err) {
    if (args.json) process.stdout.write(JSON.stringify({ error: String(err.message || err) }) + '\n');
    else process.stderr.write(`Error: ${err.message || err}\n`);
    process.exit(2);
  }
})();
