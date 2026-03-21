import { WorkflowStepSpec } from '../../domain/types.js';

export type ProjectSignalKind = 'manifest' | 'tool' | 'runtime' | 'hint';

export interface ProjectSignal {
  kind: ProjectSignalKind;
  name: string;
  path?: string;
  value?: string;
}

export type StepPhase = 'prepare' | 'deps' | 'services' | 'build' | 'test' | 'run' | 'install';

export interface WorkflowStep extends WorkflowStepSpec {
  cwd: string;
  phase: StepPhase;
}

export interface InferenceContribution {
  providerId: string;
  steps: WorkflowStep[];
  prerequisites?: string[];
  confidence: number;
  rationale: string[];
}

export interface ProviderDecision {
  providerId: string;
  applied: boolean;
  reason: string;
  producedSteps: number;
}

export interface ProviderContributionCandidate {
  providerId: string;
  providerPriority: number;
  contribution: InferenceContribution;
}

export interface InferenceContext {
  projectRoot: string;
  manifests: string[];
  signals: ProjectSignal[];
}

export interface InferenceProvider {
  id: string;
  priority?: number;
  apply(context: InferenceContext): boolean;
  infer(context: InferenceContext): InferenceContribution | null;
}

export interface MergeDecision {
  type:
    | 'step-added'
    | 'step-replaced-conflict'
    | 'step-skipped-conflict'
    | 'prerequisite-added'
    | 'prerequisite-skipped-duplicate';
  key: string;
  providerId: string;
  reason: string;
}

export interface InferenceResult {
  steps: WorkflowStep[];
  prerequisites: string[];
  contributions: InferenceContribution[];
  providerDecisions: ProviderDecision[];
  decisions: MergeDecision[];
  stepProvenance: StepProvenance[];
}

export interface StepProvenance {
  stepKey: string;
  stepId?: string;
  command: string;
  cwd: string;
  providerId: string;
  confidence: number;
  providerPriority: number;
  reason: string;
}