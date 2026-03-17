import { WorkflowSpec } from '../domain/types.js';
import { IntelligenceProvider, IntelligenceRequest } from './ai-engine/adapter.js';
import { buildPromptBundle } from './prompts.js';
import { RuleBasedProvider } from './rule-provider.js';
import { LocalGgufProvider } from './ai-engine/local-gguf.js';
import { RemoteApiProvider } from './ai-engine/remote-api.js';
import { TraceEnvConfig } from '../config.js';
import { validateInferredWorkflow } from './validation.js';
import { scanManifests } from '../tooling/fs/manifest-scanner.js';

export class IntelligenceEngine {
  constructor(private readonly config?: Pick<TraceEnvConfig, 'mode' | 'provider' | 'model' | 'apiKey' | 'apiKeys'>) {}

  private createRequest(projectRoot: string): IntelligenceRequest {
    const manifests = scanManifests(projectRoot);

    return {
      projectRoot,
      model: this.config?.model,
      apiKey:
        this.config?.provider === 'openai'
          ? this.config.apiKeys?.openai ?? this.config?.apiKey ?? null
          : this.config?.provider === 'claude'
            ? this.config.apiKeys?.claude ?? this.config?.apiKey ?? null
            : this.config?.apiKey ?? null,
      prompt: buildPromptBundle('infer-workflow', { projectRoot, manifests }),
    };
  }

  private resolveProviders(): IntelligenceProvider[] {
    const provider = this.config?.provider ?? 'local';
    const mode = this.config?.mode ?? 'local';

    if (provider === 'rule') {
      return [new RuleBasedProvider()];
    }

    if (mode === 'local') {
      return [new LocalGgufProvider(), new RuleBasedProvider()];
    }

    if (mode === 'hybrid') {
      return [
        new LocalGgufProvider(),
        new RemoteApiProvider(provider === 'claude' ? 'claude' : 'openai'),
        new RuleBasedProvider(),
      ];
    }

    return [new RemoteApiProvider(provider === 'claude' ? 'claude' : 'openai'), new RuleBasedProvider()];
  }

  async buildWorkflow(projectRoot: string): Promise<{ workflow: WorkflowSpec; source: 'file' | 'rule' | 'ai' }> {
    const request = this.createRequest(projectRoot);
    const mode = this.config?.mode ?? 'local';

    for (const provider of this.resolveProviders()) {
      try {
        const result = validateInferredWorkflow(await provider.inferWorkflow(request));
        if (result && result.steps.length > 0) {
          return {
            workflow: result,
            source: provider.id === 'rule' ? 'rule' : 'ai',
          };
        }
      } catch (error) {
        if (mode === 'api') {
          throw error;
        }
      }
    }

    return { workflow: await new RuleBasedProvider().inferWorkflow(request) as WorkflowSpec, source: 'rule' };
  }
}
