export interface ExecutionPolicy {
  deniedPatterns: RegExp[];
  maxTimeoutMs: number;
  requireConfirmation: boolean;
}

export interface ExecutionSafetyPolicy {
  allowDestructiveCommands: boolean;
  allowNonIdempotentSteps: boolean;
  defaultRetryPolicy: {
    maxAttempts: number;
    strategy: 'none' | 'fixed';
    backoffMs?: number;
  };
}

export const DEFAULT_EXECUTION_POLICY: ExecutionPolicy = {
  deniedPatterns: [
    /\brm\s+-rf\s+\/$/i,
    /\bdel\s+\/f\s+\/s\s+\/q\s+c:\\$/i,
    /\bmkfs\b/i,
  ],
  maxTimeoutMs: 10 * 60 * 1000,
  requireConfirmation: true,
};

export const DEFAULT_EXECUTION_SAFETY_POLICY: ExecutionSafetyPolicy = {
  allowDestructiveCommands: false,
  allowNonIdempotentSteps: false,
  defaultRetryPolicy: {
    maxAttempts: 1,
    strategy: 'none',
  },
};
