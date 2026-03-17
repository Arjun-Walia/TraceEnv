import { ExecutionPlan, PlanValidationResult } from '../domain/types.js';
import { evaluateCommandSafety } from '../tooling/shell/sandbox.js';

export class Validator {
  validate(plan: ExecutionPlan, missingPrerequisites: string[] = []): PlanValidationResult {
    const issues: string[] = [];

    if (plan.resolvedSteps.length === 0) {
      issues.push('No executable steps were found in the workflow.');
    }

    if (missingPrerequisites.length > 0) {
      issues.push(`Missing prerequisites: ${missingPrerequisites.join(', ')}`);
    }

    for (const step of plan.resolvedSteps) {
      const safety = evaluateCommandSafety(step.command);
      if (!safety.ok) {
        issues.push(safety.reason ?? `Unsafe command: ${step.command}`);
      }
    }

    return {
      ok: issues.length === 0,
      issues,
    };
  }
}
