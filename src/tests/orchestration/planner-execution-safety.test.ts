import assert from 'node:assert/strict';
import test from 'node:test';
import { Planner } from '../../orchestration/planner.js';
import { WorkflowSpec } from '../../domain/types.js';

test('planner propagates execution safety defaults and retry policy', () => {
  const planner = new Planner();
  const workflow: WorkflowSpec = {
    version: '1.0.0',
    steps: [
      {
        id: 'step-a',
        command: 'npm install',
        retryCount: 2,
        timeoutMs: 12345,
      },
    ],
  };

  const plan = planner.createPlan('/tmp/project', workflow);
  const step = plan.resolvedSteps[0];

  assert.equal(step.retryPolicy.maxAttempts, 3);
  assert.equal(step.retryPolicy.strategy, 'none');
  assert.equal(step.idempotent, true);
  assert.deepEqual(step.sideEffects, ['unknown']);
  assert.equal(step.timeoutMs, 12345);
});

test('planner respects explicit step safety metadata', () => {
  const planner = new Planner();
  const workflow: WorkflowSpec = {
    version: '1.0.0',
    steps: [
      {
        id: 'step-b',
        command: 'docker compose up -d',
        idempotent: true,
        sideEffects: ['service-start'],
        retryPolicy: {
          maxAttempts: 2,
          strategy: 'fixed',
          backoffMs: 50,
        },
      },
    ],
  };

  const plan = planner.createPlan('/tmp/project', workflow);
  const step = plan.resolvedSteps[0];

  assert.equal(step.idempotent, true);
  assert.deepEqual(step.sideEffects, ['service-start']);
  assert.equal(step.retryPolicy.maxAttempts, 2);
  assert.equal(step.retryPolicy.strategy, 'fixed');
  assert.equal(step.retryPolicy.backoffMs, 50);
});