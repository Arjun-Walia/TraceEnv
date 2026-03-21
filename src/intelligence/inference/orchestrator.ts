import {
  InferenceContext,
  InferenceResult,
  ProviderDecision,
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
    const providerDecisions: ProviderDecision[] = [];

    for (const provider of this.registry.list()) {
      const applies = provider.apply(context);
      if (!applies) {
        providerDecisions.push({
          providerId: provider.id,
          applied: false,
          reason: 'Provider apply() returned false for current signals.',
          producedSteps: 0,
        });
      }
    }

    for (const provider of this.registry.resolve(context)) {
      const contribution = provider.infer(context);
      if (!contribution) {
        providerDecisions.push({
          providerId: provider.id,
          applied: false,
          reason: 'Provider returned null contribution.',
          producedSteps: 0,
        });
        continue;
      }

      providerDecisions.push({
        providerId: provider.id,
        applied: true,
        reason: contribution.rationale.join(' '),
        producedSteps: contribution.steps.length,
      });

      candidates.push({
        providerId: provider.id,
        providerPriority: provider.priority ?? 100,
        contribution,
      });
    }

    const merged = this.mergeEngine.merge(candidates);
    return {
      ...merged,
      providerDecisions: mergeProviderDecisions(providerDecisions, merged.providerDecisions),
    };
  }
}

function mergeProviderDecisions(primary: ProviderDecision[], secondary: ProviderDecision[]): ProviderDecision[] {
  const byId = new Map<string, ProviderDecision>();
  for (const decision of primary) {
    byId.set(decision.providerId, decision);
  }
  for (const decision of secondary) {
    const existing = byId.get(decision.providerId);
    if (!existing || decision.applied) {
      byId.set(decision.providerId, decision);
    }
  }
  return [...byId.values()].sort((a, b) => a.providerId.localeCompare(b.providerId));
}