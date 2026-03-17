import { DEFAULT_EXECUTION_POLICY, ExecutionPolicy } from '../../domain/policies.js';

export interface SafetyCheckResult {
  ok: boolean;
  reason?: string;
}

export function evaluateCommandSafety(
  command: string,
  policy: ExecutionPolicy = DEFAULT_EXECUTION_POLICY
): SafetyCheckResult {
  for (const pattern of policy.deniedPatterns) {
    if (pattern.test(command.trim())) {
      return {
        ok: false,
        reason: `Command denied by safety policy: ${command}`,
      };
    }
  }

  return { ok: true };
}
