export type RiskLevel = 'low' | 'medium' | 'high';

export type SideEffect =
  | 'filesystem-write'
  | 'network'
  | 'service-start'
  | 'service-stop'
  | 'process-spawn'
  | 'destructive'
  | 'unknown';

export interface RetryPolicy {
  maxAttempts: number;
  strategy: 'none' | 'fixed';
  backoffMs?: number;
}

export interface WorkflowStepSpec {
  id?: string;
  command: string;
  cwd?: string;
  description?: string;
  timeoutMs?: number;
  retryCount?: number;
  retryPolicy?: RetryPolicy;
  idempotent?: boolean;
  sideEffects?: SideEffect[];
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
  inference?: InferenceDiagnostics;
}

export interface InferenceDiagnostics {
  mode: 'full' | 'partial';
  confidence: number;
  signals: string[];
  providerDecisions?: Array<{
    providerId: string;
    applied: boolean;
    reason: string;
    producedSteps: number;
  }>;
  mergeDecisions?: Array<{
    type: string;
    key: string;
    providerId: string;
    reason: string;
  }>;
  stepProvenance?: Array<{
    stepKey: string;
    stepId?: string;
    command: string;
    cwd: string;
    providerId: string;
    confidence: number;
    providerPriority: number;
    reason: string;
  }>;
  missingPieces?: string[];
  suggestedCommands?: string[];
  manifestHints?: string[];
  recommendation?: string;
}

export interface EnvironmentSnapshot {
  platform: NodeJS.Platform;
  nodeVersion: string;
  cwd: string;
  tools: Record<string, string | null>;
  manifests: string[];
}

export interface DependencyInsight {
  name: string;
  kind: 'package-manager' | 'service' | 'runtime' | 'database' | 'env-file' | 'build-tool';
  source: 'manifest' | 'workflow';
}

export interface ExecutionPlanStep {
  stepId: string;
  command: string;
  cwd: string;
  description?: string;
  timeoutMs: number;
  retryCount: number;
  retryPolicy: RetryPolicy;
  idempotent: boolean;
  sideEffects: SideEffect[];
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

export type FailureKind =
  | 'missing-command'
  | 'missing-file'
  | 'permission'
  | 'network'
  | 'timeout'
  | 'service'
  | 'unknown';

export interface StepResult {
  stepId: string;
  command: string;
  status: StepStatus;
  exitCode: number;
  durationMs: number;
  attemptCount?: number;
  maxAttempts?: number;
  retriable?: boolean;
  failureKind?: FailureKind;
  recoverySuggestion?: string;
  stdoutSummary?: string;
  stderrSummary?: string;
  artifactsChanged?: string[];
  beforeSnapshot?: ExecutionEnvironmentSnapshot;
  afterSnapshot?: ExecutionEnvironmentSnapshot;
}

export interface ExecutionEnvironmentSnapshot {
  timestamp: number;
  platform: NodeJS.Platform;
  nodeVersion: string;
  cwd: string;
  manifests: string[];
  tools: Record<string, string | null>;
}

export type ExecutionRunStatus = 'running' | 'success' | 'failed';

export interface ExecutionStepState {
  stepId: string;
  stepIndex: number;
  status: StepStatus;
  attempts: number;
  exitCode: number;
  failureKind?: FailureKind;
  updatedAt: number;
}

export interface ExecutionRunState {
  runId: string;
  projectRoot: string;
  planSignature: string;
  status: ExecutionRunStatus;
  resumedFromRunId?: string;
  lastSuccessfulStepIndex: number;
  steps: ExecutionStepState[];
  updatedAt: number;
}

export interface PlanValidationResult {
  ok: boolean;
  issues: string[];
}

export interface ExecutionFeedback {
  failureKind: FailureKind;
  retriable: boolean;
  suggestion: string;
}

export interface ExecutionSummary {
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  failedStep?: string;
}

export interface TraceRunOptions {
  dryRun?: boolean;
  skipSteps?: number[];
  autoApprove?: boolean;
  resume?: boolean;
  debug?: boolean;
}

export interface TraceRunResult {
  success: boolean;
  projectRoot: string;
  plan: ExecutionPlan;
  results: StepResult[];
  summary: ExecutionSummary;
  detectedDependencies?: DependencyInsight[];
  recoverySuggestions?: string[];
  failureReason?: string;
}
