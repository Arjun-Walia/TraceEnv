import {
  InferenceContext,
  InferenceResult,
  ProviderContributionCandidate,
} from './contracts.js';
import { MergeEngine } from './merge-engine.js';
import { ProviderRegistry } from './provider-registry.js';

export class InferenceOrchestrator {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly mergeEngine: MergeEngine = new MergeEngine()
  ) {}

  infer(context: InferenceContext): InferenceResult {
    const candidates: ProviderContributionCandidate[] = [];

    for (const provider of this.registry.resolve(context)) {
      const contribution = provider.infer(context);
      if (!contribution) {
        continue;
      }

      candidates.push({
        providerId: provider.id,
        providerPriority: provider.priority ?? 100,
        contribution,
      });
    }

    return this.mergeEngine.merge(candidates);
  }
}