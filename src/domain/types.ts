export type RiskLevel = 'low' | 'medium' | 'high';

export interface WorkflowStepSpec {
  id?: string;
  command: string;
  cwd?: string;
  description?: string;
  timeoutMs?: number;
  retryCount?: number;
  continueOnError?: boolean;
}

export interface ValidationRule {
  kind: 'file-exists' | 'port-open' | 'command-exists' | 'custom';
  target: string;
  message?: string;
}

export interface RollbackRule {
  stepId: string;
  command: string;
}

export interface WorkflowSpec {
  version: string;
  steps: WorkflowStepSpec[];
  prerequisites?: string[];
  estimatedTime?: string;
  validationRules?: ValidationRule[];
  rollbackRules?: RollbackRule[];
}

export interface EnvironmentSnapshot {
  platform: NodeJS.Platform;
  nodeVersion: string;
  cwd: string;
  tools: Record<string, string | null>;
  manifests: string[];
}

export interface ExecutionPlanStep {
  stepId: string;
  command: string;
  cwd: string;
  description?: string;
  timeoutMs: number;
  retryCount: number;
  continueOnError: boolean;
  transformedCommand?: string;
}

export interface ExecutionPlan {
  planId: string;
  projectRoot: string;
  resolvedSteps: ExecutionPlanStep[];
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  platformTransforms: string[];
}

export type StepStatus = 'success' | 'failed' | 'skipped' | 'dry-run';

export interface StepResult {
  stepId: string;
  command: string;
  status: StepStatus;
  exitCode: number;
  durationMs: number;
  stdoutSummary?: string;
  stderrSummary?: string;
  artifactsChanged?: string[];
}

export interface PlanValidationResult {
  ok: boolean;
  issues: string[];
}

export interface TraceRunOptions {
  dryRun?: boolean;
  skipSteps?: number[];
  autoApprove?: boolean;
}

export interface TraceRunResult {
  success: boolean;
  projectRoot: string;
  plan: ExecutionPlan;
  results: StepResult[];
  failureReason?: string;
}
