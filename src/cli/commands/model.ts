import { MODELS_DIR, TraceEnvConfig } from '../../config.js';
import { ConfigRepository } from '../../storage/repositories/config-repo.js';
import {
  getProviderDescriptor,
  listProviderDescriptors,
  resolveModelSelection,
} from '../../intelligence/registry.js';
import * as fs from 'fs';
import { accent, bold, muted, padRight, white } from '../../ui/theme.js';

type ApiProvider = 'openai' | 'claude';

function formatMode(config: TraceEnvConfig): string {
  return `${config.mode} / ${config.provider} / ${config.model}`;
}

function getStoredApiKey(config: TraceEnvConfig, provider: ApiProvider): string | null {
  return config.apiKeys?.[provider] ?? (config.provider === provider ? config.apiKey : null) ?? null;
}

export function registerModelCommands(program: { command(name: string): any }): void {
  const modelCmd = program.command('model').description('Manage TraceEnv intelligence providers');
  const configRepo = new ConfigRepository();

  modelCmd
    .command('list')
    .description('List available intelligence providers and models')
    .action(() => {
      const config = configRepo.load();
      const providers = listProviderDescriptors();
      const localModels = fs.existsSync(MODELS_DIR)
        ? fs.readdirSync(MODELS_DIR).filter((file) => file.endsWith('.gguf'))
        : [];

      console.log(`\n${bold(white('  AI Engine Configuration'))}`);
      console.log(`  ${muted(`Currently Active: ${config.model} (${config.provider})`)}`);
      console.log();
      console.log(`  ${padRight('MODEL', 20)}${padRight('TYPE', 14)}${padRight('STATUS', 14)}LATENCY`);

      const rows: Array<{ model: string; type: string; status: string; latency: string; active: boolean }> = [
        {
          model: 'local-heuristic',
          type: 'Rule-based',
          status: 'Installed',
          latency: '< 1ms',
          active: config.provider === 'rule',
        },
        {
          model: 'qwen2.5:7b',
          type: 'Local AI',
          status: localModels.length > 0 ? 'Installed' : 'Not Pulled',
          latency: '~ 400ms',
          active: config.provider === 'local',
        },
        {
          model: 'openai-gpt4',
          type: 'API',
          status: getStoredApiKey(config, 'openai') ? 'Configured' : 'No Key',
          latency: '~ 1.2s',
          active: config.provider === 'openai',
        },
        {
          model: 'claude-sonnet',
          type: 'API',
          status: getStoredApiKey(config, 'claude') ? 'Configured' : 'No Key',
          latency: '~ 1.4s',
          active: config.provider === 'claude',
        },
      ];

      rows.forEach((row) => {
        const marker = row.active ? accent('❯ ') : '  ';
        const statusText = row.active ? 'Active' : row.status;
        const rendered = `${marker}${padRight(row.model, 18)}${padRight(row.type, 14)}${padRight(statusText, 14)}${muted(row.latency)}`;
        console.log(`  ${rendered}`);
      });

      console.log();
      console.log(`  ${muted('Tip: Use trace model use <name> to switch engines instantly.')}`);
      console.log();
    });

  modelCmd
    .command('use <target>')
    .description('Select rule-based, local, or API-backed intelligence')
    .action((target: string) => {
      const config = configRepo.load();
      const selection = resolveModelSelection(target);
      const updated: TraceEnvConfig = {
        ...config,
        mode: selection.mode,
        provider: selection.provider,
        model: selection.model,
        apiKey:
          selection.provider === 'openai'
            ? config.apiKeys?.openai ?? null
            : selection.provider === 'claude'
              ? config.apiKeys?.claude ?? null
              : null,
      };

      if (updated.provider !== 'rule' && getProviderDescriptor(updated.provider).requiresNetwork) {
        updated.mode = config.mode === 'hybrid' ? 'hybrid' : 'api';
      }

      configRepo.save(updated);

      console.log('\nTraceEnv intelligence updated\n');
      console.log(`Provider: ${updated.provider}`);
      console.log(`Mode:     ${updated.mode}`);
      console.log(`Model:    ${updated.model}`);
      console.log();
    });

  modelCmd
    .command('auth <provider>')
    .description('Store or clear API credentials for OpenAI or Claude')
    .option('--api-key <key>', 'API key to store for the provider')
    .option('--clear', 'Remove the stored API key for the provider')
    .action((provider: ApiProvider, opts: { apiKey?: string; clear?: boolean }) => {
      if (provider !== 'openai' && provider !== 'claude') {
        throw new Error('Provider must be openai or claude.');
      }

      const config = configRepo.load();
      const updated: TraceEnvConfig = {
        ...config,
        apiKeys: {
          ...(config.apiKeys ?? {}),
        },
      };

      if (opts.clear) {
        delete updated.apiKeys?.[provider];
        if (updated.provider === provider) {
          updated.apiKey = null;
        }
        configRepo.save(updated);
        console.log(`\nRemoved stored ${provider} API key.\n`);
        return;
      }

      if (!opts.apiKey) {
        const configured = getStoredApiKey(config, provider);
        console.log(`\n${provider} API key: ${configured ? 'configured' : 'not set'}\n`);
        return;
      }

      updated.apiKeys = {
        ...(updated.apiKeys ?? {}),
        [provider]: opts.apiKey,
      };
      if (updated.provider === provider) {
        updated.apiKey = opts.apiKey;
      }

      configRepo.save(updated);
      console.log(`\nStored ${provider} API key.\n`);
    });

  modelCmd
    .command('info')
    .description('Show current intelligence configuration')
    .action(() => {
      const config = configRepo.load();
      const provider = getProviderDescriptor(config.provider);

      console.log(`\n${bold(white('  AI Engine Configuration'))}`);
      console.log(`  ${muted(`Currently Active: ${config.model} (${provider.id})`)}`);
      console.log();
      console.log(`  ${padRight('Mode', 14)} ${config.mode}`);
      console.log(`  ${padRight('Provider', 14)} ${provider.id}`);
      console.log(`  ${padRight('Model', 14)} ${config.model}`);
      console.log(`  ${padRight('OpenAI Key', 14)} ${getStoredApiKey(config, 'openai') ? accent('Configured') : muted('Not Set')}`);
      console.log(`  ${padRight('Claude Key', 14)} ${getStoredApiKey(config, 'claude') ? accent('Configured') : muted('Not Set')}`);
      console.log(`  ${padRight('Models Dir', 14)} ${muted(MODELS_DIR)}`);
      console.log();
    });
}
