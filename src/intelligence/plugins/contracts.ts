import { InferenceProvider } from '../inference/contracts.js';

export const CORE_PROVIDER_PLUGIN_API_VERSION = '1.0.0';

export interface ProviderPlugin {
  id: string;
  version: string;
  coreApiVersion: string;
  priority?: number;
  createProvider(): InferenceProvider;
}

export interface PluginLoadDecision {
  path: string;
  pluginId?: string;
  loaded: boolean;
  reason: string;
}

export function isPluginApiCompatible(required: string, provided = CORE_PROVIDER_PLUGIN_API_VERSION): boolean {
  return getMajor(required) === getMajor(provided);
}

function getMajor(version: string): string {
  return version.trim().split('.')[0] ?? version.trim();
}