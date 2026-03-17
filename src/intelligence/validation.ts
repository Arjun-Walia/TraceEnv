import { WorkflowSpec } from '../domain/types.js';

export function validateInferredWorkflow(workflow: WorkflowSpec | null): WorkflowSpec | null {
  if (!workflow) {
    return null;
  }

  const validSteps = workflow.steps.filter(
    (step) => typeof step.command === 'string' && step.command.trim().length > 0
  );

  if (validSteps.length === 0) {
    return null;
  }

  return {
    ...workflow,
    steps: validSteps,
  };
}
