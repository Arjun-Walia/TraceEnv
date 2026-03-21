import { InferenceProvider } from '../inference/contracts.js';
import { ProviderRegistry } from '../inference/provider-registry.js';

export interface PluginRegistrationDecision {
  providerId: string;
  registered: boolean;
  reason: string;
}

export function registerPluginProviders(
  registry: ProviderRegistry,
  providers: InferenceProvider[]
): PluginRegistrationDecision[] {
  const decisions: PluginRegistrationDecision[] = [];

  for (const provider of providers) {
    registry.register(provider);
    decisions.push({
      providerId: provider.id,
      registered: true,
      reason: `Registered provider ${provider.id} with priority ${provider.priority ?? 100}.`,
    });
  }

  return decisions;
}