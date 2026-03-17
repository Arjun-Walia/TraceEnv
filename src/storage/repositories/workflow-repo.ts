import { WorkflowSpec } from '../../domain/types.js';
import { loadWorkflowSpec } from '../../tooling/fs/metadata-loader.js';
import { IntelligenceEngine } from '../../intelligence/engine.js';
import { ConfigRepository } from './config-repo.js';

export class WorkflowRepository {
  private readonly intelligence: IntelligenceEngine;

  constructor(private readonly configRepo: ConfigRepository = new ConfigRepository()) {
    this.intelligence = new IntelligenceEngine(this.configRepo.load());
  }

  async loadOrInfer(projectRoot: string): Promise<{ workflow: WorkflowSpec; source: 'file' | 'rule' | 'ai' }> {
    const fromFile = loadWorkflowSpec(projectRoot);
    if (fromFile) {
      return { workflow: fromFile, source: 'file' };
    }
    return this.intelligence.buildWorkflow(projectRoot);
  }
}
