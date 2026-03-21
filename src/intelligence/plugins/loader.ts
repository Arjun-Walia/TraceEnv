import * as fs from 'fs';
import * as path from 'path';
import { InferenceProvider } from '../inference/contracts.js';
import {
  CORE_PROVIDER_PLUGIN_API_VERSION,
  PluginLoadDecision,
  ProviderPlugin,
  isPluginApiCompatible,
} from './contracts.js';

export interface PluginLoadResult {
  providers: InferenceProvider[];
  decisions: PluginLoadDecision[];
}

export function loadProviderPlugins(projectRoot: string, explicitPaths?: string[]): PluginLoadResult {
  const decisions: PluginLoadDecision[] = [];
  const providers: InferenceProvider[] = [];
  const candidates = resolveCandidatePaths(projectRoot, explicitPaths);

  for (const candidate of candidates) {
    const files = expandCandidate(candidate);
    for (const file of files) {
      const loaded = loadSinglePlugin(file);
      decisions.push(loaded.decision);
      if (loaded.provider) {
        providers.push(loaded.provider);
      }
    }
  }

  providers.sort((a, b) => {
    const left = a.priority ?? 100;
    const right = b.priority ?? 100;
    if (left !== right) {
      return left - right;
    }
    return a.id.localeCompare(b.id);
  });

  return {
    providers,
    decisions,
  };
}

function resolveCandidatePaths(projectRoot: string, explicitPaths?: string[]): string[] {
  const items: string[] = [];

  if (explicitPaths && explicitPaths.length > 0) {
    items.push(...explicitPaths);
  }

  const fromEnv = process.env.TRACEENV_PLUGIN_PATHS;
  if (fromEnv) {
    items.push(...fromEnv.split(/[;,]/g).map((item) => item.trim()).filter((item) => item.length > 0));
  }

  items.push(path.join(projectRoot, '.traceenv', 'plugins'));

  const normalized = items
    .map((item) => (path.isAbsolute(item) ? item : path.resolve(projectRoot, item)))
    .filter((item, index, all) => all.indexOf(item) === index);

  normalized.sort((a, b) => a.localeCompare(b));
  return normalized;
}

function expandCandidate(candidate: string): string[] {
  if (!fs.existsSync(candidate)) {
    return [];
  }

  const stat = fs.statSync(candidate);
  if (stat.isDirectory()) {
    return fs
      .readdirSync(candidate)
      .filter((name) => /\.(cjs|mjs|js)$/i.test(name))
      .map((name) => path.join(candidate, name))
      .sort((a, b) => a.localeCompare(b));
  }

  if (stat.isFile()) {
    return [candidate];
  }

  return [];
}

function loadSinglePlugin(filePath: string): { provider?: InferenceProvider; decision: PluginLoadDecision } {
  try {
    const loaded = require(filePath) as unknown;
    const plugin = normalizePluginExport(loaded);

    if (!plugin) {
      return {
        decision: {
          path: filePath,
          loaded: false,
          reason: 'No valid ProviderPlugin export found.',
        },
      };
    }

    if (!isPluginApiCompatible(plugin.coreApiVersion, CORE_PROVIDER_PLUGIN_API_VERSION)) {
      return {
        decision: {
          path: filePath,
          pluginId: plugin.id,
          loaded: false,
          reason: `Incompatible plugin API version ${plugin.coreApiVersion}. Expected ${CORE_PROVIDER_PLUGIN_API_VERSION}.`,
        },
      };
    }

    const provider = plugin.createProvider();
    const wrapped: InferenceProvider = {
      id: provider.id || plugin.id,
      priority: plugin.priority ?? provider.priority,
      apply: provider.apply.bind(provider),
      infer: provider.infer.bind(provider),
    };

    return {
      provider: wrapped,
      decision: {
        path: filePath,
        pluginId: plugin.id,
        loaded: true,
        reason: `Loaded plugin ${plugin.id}@${plugin.version}.`,
      },
    };
  } catch (error) {
    return {
      decision: {
        path: filePath,
        loaded: false,
        reason: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function normalizePluginExport(value: unknown): ProviderPlugin | null {
  const obj = value as Record<string, unknown> | null;
  const candidate = (obj?.default as Record<string, unknown> | undefined) ?? obj;
  if (!candidate) {
    return null;
  }

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.version !== 'string' ||
    typeof candidate.coreApiVersion !== 'string' ||
    typeof candidate.createProvider !== 'function'
  ) {
    return null;
  }

  return candidate as unknown as ProviderPlugin;
}