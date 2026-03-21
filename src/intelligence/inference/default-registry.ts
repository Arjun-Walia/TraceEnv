import { GoProvider } from '../providers/go-provider.js';
import { NodeProvider } from '../providers/node-provider.js';
import { PythonProvider } from '../providers/python-provider.js';
import { loadProviderPlugins } from '../plugins/loader.js';
import { registerPluginProviders } from '../plugins/registration.js';
import { ProviderRegistry } from './provider-registry.js';

export function createDefaultProviderRegistry(options?: { projectRoot?: string; pluginPaths?: string[] }): ProviderRegistry {
  const registry = new ProviderRegistry();

  // Register providers in one place to keep inference composition explicit and deterministic.
  registry.register(new NodeProvider());
  registry.register(new PythonProvider());
  registry.register(new GoProvider());

  const projectRoot = options?.projectRoot ?? process.cwd();
  const loaded = loadProviderPlugins(projectRoot, options?.pluginPaths);
  registerPluginProviders(registry, loaded.providers);

  return registry;
}