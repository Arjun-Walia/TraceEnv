import { IntelligenceProvider } from './adapter.js';
import { WorkflowSpec } from '../../domain/types.js';
import { IntelligenceRequest } from './adapter.js';

export class RemoteApiProvider implements IntelligenceProvider {
  id: string;
  label: string;
  requiresNetwork = true;

  constructor(providerId: 'openai' | 'claude' = 'openai') {
    this.id = providerId;
    this.label = providerId === 'claude' ? 'Claude API' : 'OpenAI API';
  }

  async inferWorkflow(_request: IntelligenceRequest): Promise<WorkflowSpec | null> {
    return null;
  }
}
