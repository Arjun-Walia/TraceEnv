import { ExecutionPlan, RiskLevel, WorkflowSpec } from '../domain/types.js';
import { DEFAULT_EXECUTION_POLICY, DEFAULT_EXECUTION_SAFETY_POLICY } from '../domain/policies.js';

const PHASE_PRIORITY: Record<string, number> = {
  prepare: 0,
  deps: 1,
  services: 2,
  build: 3,
  test: 4,
  run: 5,
  install: 1,
};

function stepPriority(command: string): number {
  const normalized = command.toLowerCase();

  if (normalized.startsWith('echo ') && normalized.includes('starting')) {
    return 0;
  }
  if (normalized.startsWith('echo ') && (normalized.includes('complete') || normalized.includes('done'))) {
    return 90;
  }

  if (normalized.includes('.env') || normalized.startsWith('cp ') || normalized.startsWith('copy ')) {
    return 10;
  }
  if (normalized.includes('docker compose up') || normalized.includes('docker up')) {
    return 20;
  }
  if (normalized.includes('install') || normalized.includes('bundle') || normalized.includes('pnpm')) {
    return 30;
  }
  if (normalized.includes('migrate') || normalized.includes('seed')) {
    return 40;
  }
  if (normalized.includes('build')) {
    return 50;
  }
  if (normalized.includes('dev') || normalized.includes('start')) {
    return 60;
  }

  return 35;
}

function orderWorkflowSteps(workflow: WorkflowSpec): WorkflowSpec['steps'] {
  return workflow.steps
    .map((step, index) => ({ step, index }))
    .sort((left, right) => {
      const leftPhase = typeof (left.step as { phase?: string }).phase === 'string'
        ? (left.step as { phase?: string }).phase
        : undefined;
      const rightPhase = typeof (right.step as { phase?: string }).phase === 'string'
        ? (right.step as { phase?: string }).phase
        : undefined;

      if (leftPhase && rightPhase) {
        const phaseDiff = (PHASE_PRIORITY[leftPhase] ?? 99) - (PHASE_PRIORITY[rightPhase] ?? 99);
        if (phaseDiff !== 0) {
          return phaseDiff;
        }
      }

      const priorityDiff = stepPriority(left.step.command) - stepPriority(right.step.command);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.step);
}

function calculateRisk(workflow: WorkflowSpec): RiskLevel {
  if (workflow.steps.some((step) => step.command.includes('sudo'))) {
    return 'high';
  }
  if (workflow.steps.length > 8) {
    return 'medium';
  }
  return 'low';
}

export class Planner {
  createPlan(projectRoot: string, workflow: WorkflowSpec): ExecutionPlan {
    const planId = `plan-${Date.now()}`;
    const platformTransforms: string[] = [];
    const orderedSteps = orderWorkflowSteps(workflow);

    return {
      planId,
      projectRoot,
      riskLevel: calculateRisk(workflow),
      requiresConfirmation: DEFAULT_EXECUTION_POLICY.requireConfirmation,
      platformTransforms,
      resolvedSteps: orderedSteps.map((step, index) => ({
        stepId: step.id ?? `step-${index + 1}`,
        command: step.command,
        cwd: step.cwd ? `${projectRoot}/${step.cwd}`.replace(/\\/g, '/') : projectRoot,
        description: step.description,
        timeoutMs: Math.min(step.timeoutMs ?? 5 * 60 * 1000, DEFAULT_EXECUTION_POLICY.maxTimeoutMs),
        retryCount: step.retryCount ?? 0,
        retryPolicy: step.retryPolicy ?? {
          maxAttempts: (step.retryCount ?? 0) + 1,
          strategy: DEFAULT_EXECUTION_SAFETY_POLICY.defaultRetryPolicy.strategy,
          backoffMs: DEFAULT_EXECUTION_SAFETY_POLICY.defaultRetryPolicy.backoffMs,
        },
        idempotent: step.idempotent ?? true,
        sideEffects: step.sideEffects ?? ['unknown'],
        continueOnError: step.continueOnError ?? false,
      })),
    };
  }
}
