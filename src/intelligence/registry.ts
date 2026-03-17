import { TraceEnvConfig } from '../config.js';

export type IntelligenceMode = 'local' | 'hybrid' | 'api';
export type ProviderId = 'rule' | 'local' | 'openai' | 'claude';

export interface ProviderDescriptor {
  id: ProviderId;
  label: string;
  mode: IntelligenceMode;
  requiresNetwork: boolean;
  models: string[];
}

export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: 'rule',
    label: 'Rule-based engine',
    mode: 'local',
    requiresNetwork: false,
    models: ['rule-engine'],
  },
  {
    id: 'local',
    label: 'Local GGUF via llama.cpp',
    mode: 'local',
    requiresNetwork: false,
    models: ['qwen2.5-coder', 'deepseek-coder', 'codellama'],
  },
  {
    id: 'openai',
    label: 'OpenAI API',
    mode: 'api',
    requiresNetwork: true,
    models: ['gpt-5.4', 'gpt-4.1'],
  },
  {
    id: 'claude',
    label: 'Claude API',
    mode: 'api',
    requiresNetwork: true,
    models: ['claude-sonnet-4', 'claude-opus-4'],
  },
];

export function getProviderDescriptor(id: ProviderId): ProviderDescriptor {
  return PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0];
}

export function listProviderDescriptors(): ProviderDescriptor[] {
  return [...PROVIDERS];
}

export function resolveModelSelection(input: string): Pick<TraceEnvConfig, 'mode' | 'provider' | 'model'> {
  const selection = input.trim().toLowerCase();

  if (selection === 'local') {
    return { mode: 'local', provider: 'local', model: 'qwen2.5-coder' };
  }

  if (selection === 'rule' || selection === 'rules') {
    return { mode: 'local', provider: 'rule', model: 'rule-engine' };
  }

  if (selection === 'hybrid') {
    return { mode: 'hybrid', provider: 'local', model: 'qwen2.5-coder' };
  }

  if (selection === 'api') {
    return { mode: 'api', provider: 'openai', model: 'gpt-5.4' };
  }

  if (selection === 'openai') {
    return { mode: 'api', provider: 'openai', model: 'gpt-5.4' };
  }

  if (selection === 'claude') {
    return { mode: 'api', provider: 'claude', model: 'claude-sonnet-4' };
  }

  if (selection === 'qwen') {
    return { mode: 'local', provider: 'local', model: 'qwen2.5-coder' };
  }

  throw new Error(`Unknown model selection: ${input}`);
}
