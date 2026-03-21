import { GoProvider } from '../providers/go-provider.js';
import { NodeProvider } from '../providers/node-provider.js';
import { PythonProvider } from '../providers/python-provider.js';
import { ProviderRegistry } from './provider-registry.js';

export function createDefaultProviderRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  // Register providers in one place to keep inference composition explicit and deterministic.
  registry.register(new NodeProvider());
  registry.register(new PythonProvider());
  registry.register(new GoProvider());

  return registry;
}