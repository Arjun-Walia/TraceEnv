export interface ExecutionPolicy {
  deniedPatterns: RegExp[];
  maxTimeoutMs: number;
  requireConfirmation: boolean;
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
