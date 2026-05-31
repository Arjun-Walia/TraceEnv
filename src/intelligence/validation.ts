import { WorkflowSpec } from '../domain/types.js';

const DANGEROUS_TOKENS = [
  'rm -rf /',
  'mkfs',
  'shutdown',
  'reboot',
  'curl | sh',
  'curl|sh',
  'wget | sh',
  'wget|sh',
];

export function validateInferredWorkflow(workflow: WorkflowSpec | null): WorkflowSpec | null {
  if (!workflow) {
    return null;
  }

  const validSteps = workflow.steps.filter(
    (step) => {
      if (typeof step.command !== 'string') {
        return false;
      }

      const command = step.command.trim();
      if (!command) {
        return false;
      }

      const normalized = command.toLowerCase();
      if (DANGEROUS_TOKENS.some((token) => normalized.includes(token))) {
        return false;
      }

      if (step.cwd && (step.cwd.includes('..') || step.cwd.startsWith('/') || step.cwd.startsWith('\\'))) {
        return false;
      }

      return true;
    }
  );

  if (validSteps.length === 0) {
    return null;
  }

  return {
    ...workflow,
    steps: validSteps,
  };
}
