import assert from 'node:assert/strict';
import test from 'node:test';
import { MergeEngine } from '../../intelligence/inference/merge-engine.js';
import { ProviderContributionCandidate } from '../../intelligence/inference/contracts.js';

function candidate(input: {
  providerId: string;
  providerPriority: number;
  confidence: number;
  steps: Array<{ command: string; phase: 'prepare' | 'deps' | 'services' | 'build' | 'test' | 'run'; cwd?: string }>;
  prerequisites?: string[];
}): ProviderContributionCandidate {
  return {
    providerId: input.providerId,
    providerPriority: input.providerPriority,
    contribution: {
      providerId: input.providerId,
      confidence: input.confidence,
      rationale: [`${input.providerId} contribution`],
      prerequisites: input.prerequisites ?? [],
      steps: input.steps.map((step, index) => ({
        id: `${input.providerId}-${index}`,
        command: step.command,
        cwd: step.cwd ?? '.',
        phase: step.phase,
      })),
    },
  };
}

test('phase-based ordering is deterministic: prepare, deps, services, build, test, run', () => {
  const engine = new MergeEngine();

  const result = engine.merge([
    candidate({
      providerId: 'mixed',
      providerPriority: 100,
      confidence: 0.7,
      steps: [
        { command: 'python main.py', phase: 'run' },
        { command: 'go build ./...', phase: 'build' },
        { command: 'docker compose up -d', phase: 'services' },
        { command: 'npm install', phase: 'deps' },
        { command: 'cp .env.example .env', phase: 'prepare' },
        { command: 'go test ./...', phase: 'test' },
      ],
    }),
  ]);

  assert.deepEqual(result.steps.map((step) => step.command), [
    'cp .env.example .env',
    'npm install',
    'docker compose up -d',
    'go build ./...',
    'go test ./...',
    'python main.py',
  ]);
});

test('conflict resolution uses provider priority then confidence', () => {
  const engine = new MergeEngine();

  const result = engine.merge([
    candidate({
      providerId: 'node',
      providerPriority: 100,
      confidence: 0.4,
      steps: [{ command: 'npm install', phase: 'deps' }],
    }),
    candidate({
      providerId: 'python',
      providerPriority: 110,
      confidence: 0.95,
      steps: [{ command: 'npm install', phase: 'deps' }],
    }),
  ]);

  assert.deepEqual(result.steps.map((step) => step.command), ['npm install']);

  const skipped = result.decisions.find(
    (decision) => decision.type === 'step-skipped-conflict' && decision.providerId === 'python'
  );
  assert.ok(skipped);
  assert.ok(skipped?.reason.includes('higher precedence'));
});

test('polyglot merge: Node frontend + Python backend', () => {
  const engine = new MergeEngine();

  const result = engine.merge([
    candidate({
      providerId: 'node',
      providerPriority: 100,
      confidence: 0.95,
      prerequisites: ['Node.js 18+'],
      steps: [
        { command: 'npm install', phase: 'deps' },
        { command: 'npm run dev', phase: 'run' },
      ],
    }),
    candidate({
      providerId: 'python',
      providerPriority: 110,
      confidence: 0.9,
      prerequisites: ['Python 3.x', 'pip', 'venv'],
      steps: [
        { command: 'python -m venv .venv', phase: 'prepare' },
        { command: 'python -m pip install -r requirements.txt', phase: 'deps' },
        { command: 'python main.py', phase: 'run' },
      ],
    }),
  ]);

  assert.deepEqual(result.steps.map((step) => step.command), [
    'python -m venv .venv',
    'npm install',
    'python -m pip install -r requirements.txt',
    'npm run dev',
    'python main.py',
  ]);
  assert.deepEqual(result.prerequisites, ['Node.js 18+', 'Python 3.x', 'pip', 'venv']);
});

test('polyglot merge: Go service + Docker compose', () => {
  const engine = new MergeEngine();

  const result = engine.merge([
    candidate({
      providerId: 'go',
      providerPriority: 120,
      confidence: 0.9,
      prerequisites: ['Go toolchain'],
      steps: [
        { command: 'go mod download', phase: 'deps' },
        { command: 'go build ./...', phase: 'build' },
        { command: 'go test ./...', phase: 'test' },
      ],
    }),
    candidate({
      providerId: 'node',
      providerPriority: 100,
      confidence: 0.95,
      prerequisites: ['Docker'],
      steps: [
        { command: 'docker compose up -d', phase: 'services' },
      ],
    }),
  ]);

  assert.deepEqual(result.steps.map((step) => step.command), [
    'go mod download',
    'docker compose up -d',
    'go build ./...',
    'go test ./...',
  ]);
  assert.deepEqual(result.prerequisites, ['Go toolchain', 'Docker']);
});