import { WorkflowSpec } from '../domain/types.js';
import { inferWorkflow } from './rule-engine/infer.js';
import { IntelligenceProvider, IntelligenceRequest } from './ai-engine/adapter.js';

export class RuleBasedProvider implements IntelligenceProvider {
  readonly id = 'rule';
  readonly label = 'Rule-based engine';
  readonly requiresNetwork = false;

  async inferWorkflow(request: IntelligenceRequest): Promise<WorkflowSpec | null> {
    return inferWorkflow(request.projectRoot);
  }
}
