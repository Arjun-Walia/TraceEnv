import { IntelligenceProvider } from './adapter.js';
import { WorkflowSpec } from '../../domain/types.js';
import { IntelligenceRequest } from './adapter.js';

export class LocalGgufProvider implements IntelligenceProvider {
  id = 'local';
  label = 'Local GGUF via llama.cpp';
  requiresNetwork = false;

  async inferWorkflow(_request: IntelligenceRequest): Promise<WorkflowSpec | null> {
    return null;
  }
}
