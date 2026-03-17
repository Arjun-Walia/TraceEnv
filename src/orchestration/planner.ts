import { ExecutionPlan, RiskLevel, WorkflowSpec } from '../domain/types.js';
import { DEFAULT_EXECUTION_POLICY } from '../domain/policies.js';

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

    return {
      planId,
      projectRoot,
      riskLevel: calculateRisk(workflow),
      requiresConfirmation: DEFAULT_EXECUTION_POLICY.requireConfirmation,
      platformTransforms,
      resolvedSteps: workflow.steps.map((step, index) => ({
        stepId: step.id ?? `step-${index + 1}`,
        command: step.command,
        cwd: step.cwd ? `${projectRoot}/${step.cwd}`.replace(/\\/g, '/') : projectRoot,
        description: step.description,
        timeoutMs: Math.min(step.timeoutMs ?? 5 * 60 * 1000, DEFAULT_EXECUTION_POLICY.maxTimeoutMs),
        retryCount: step.retryCount ?? 0,
        continueOnError: step.continueOnError ?? false,
      })),
    };
  }
}
