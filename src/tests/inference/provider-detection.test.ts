import assert from 'node:assert/strict';
import test from 'node:test';
import { InferenceContext } from '../../intelligence/inference/contracts.js';
import { GoProvider } from '../../intelligence/providers/go-provider.js';
import { PythonProvider } from '../../intelligence/providers/python-provider.js';

function createContext(manifests: string[]): InferenceContext {
  return {
    projectRoot: '/tmp/project',
    manifests,
    signals: manifests.map((name) => ({ kind: 'manifest', name })),
  };
}

test('PythonProvider detection supports requirements, pyproject, and Pipfile', () => {
  const provider = new PythonProvider();

  assert.equal(provider.apply(createContext(['requirements.txt'])), true);
  assert.equal(provider.apply(createContext(['pyproject.toml'])), true);
  assert.equal(provider.apply(createContext(['Pipfile'])), true);
  assert.equal(provider.apply(createContext(['package.json'])), false);
});

test('GoProvider detection is tied to go.mod', () => {
  const provider = new GoProvider();

  assert.equal(provider.apply(createContext(['go.mod'])), true);
  assert.equal(provider.apply(createContext(['package.json'])), false);
});

test('signals map to deterministic Python contribution with rationale and phased steps', () => {
  const provider = new PythonProvider();
  const context = createContext(['requirements.txt', 'Pipfile']);
  const contribution = provider.infer(context);

  assert.equal(contribution.providerId, 'python');
  assert.ok(contribution.confidence > 0);
  assert.ok(contribution.rationale.length > 0);
  assert.deepEqual(contribution.prerequisites, ['Python 3.x', 'pip', 'venv']);
  assert.ok(contribution.steps.every((step) => step.cwd === '.'));
  assert.ok(contribution.steps.every((step) => typeof step.phase === 'string' && step.phase.length > 0));
});

test('signals map to deterministic Go contribution with rationale and phased steps', () => {
  const provider = new GoProvider();
  const context = createContext(['go.mod']);
  const contribution = provider.infer(context);

  assert.equal(contribution.providerId, 'go');
  assert.equal(contribution.confidence, 0.9);
  assert.ok(contribution.rationale.length > 0);
  assert.deepEqual(contribution.prerequisites, ['Go toolchain']);
  assert.deepEqual(contribution.steps.map((step) => step.command), [
    'go mod download',
    'go build ./...',
    'go test ./...',
  ]);
  assert.ok(contribution.steps.every((step) => step.cwd === '.'));
  assert.ok(contribution.steps.every((step) => typeof step.phase === 'string' && step.phase.length > 0));
});