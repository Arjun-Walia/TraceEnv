import { WorkflowSpec } from '../../domain/types.js';
import { PromptBundle } from '../prompts.js';

export interface IntelligenceRequest {
  projectRoot: string;
  prompt: PromptBundle;
  model?: string;
  apiKey?: string | null;
}

export interface IntelligenceProvider {
  id: string;
  label: string;
  requiresNetwork: boolean;
  inferWorkflow(request: IntelligenceRequest): Promise<WorkflowSpec | null>;
}
