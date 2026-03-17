import { MODELS_DIR, TraceEnvConfig } from '../../config.js';
import { ConfigRepository } from '../../storage/repositories/config-repo.js';
import {
  getProviderDescriptor,
  listProviderDescriptors,
  resolveModelSelection,
} from '../../intelligence/registry.js';
import * as fs from 'fs';

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

      console.log('\nAvailable intelligence backends\n');
      providers.forEach((provider) => {
        const selected = provider.id === config.provider ? '  * selected' : '';
        const mode = provider.mode.padEnd(6, ' ');
        console.log(`- ${provider.id}  ${provider.label}${selected}`);
        console.log(`  mode: ${mode}  network: ${provider.requiresNetwork ? 'yes' : 'no'}`);
        console.log(`  models: ${provider.models.join(', ')}`);
      });

      const localModels = fs.existsSync(MODELS_DIR)
        ? fs.readdirSync(MODELS_DIR).filter((file) => file.endsWith('.gguf'))
        : [];

      console.log('\nCurrent');
      console.log(`  ${formatMode(config)}`);
      console.log(`  local gguf files: ${localModels.length > 0 ? localModels.join(', ') : 'none found'}`);
      console.log(`  openai auth: ${getStoredApiKey(config, 'openai') ? 'configured' : 'not set'}`);
      console.log(`  claude auth: ${getStoredApiKey(config, 'claude') ? 'configured' : 'not set'}`);
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

      console.log('\nTraceEnv intelligence\n');
      console.log(`Mode:      ${config.mode}`);
      console.log(`Provider:  ${provider.id}`);
      console.log(`Model:     ${config.model}`);
      console.log(`API key:   ${config.apiKey ? 'configured' : 'not set'}`);
      console.log(`OpenAI:    ${getStoredApiKey(config, 'openai') ? 'configured' : 'not set'}`);
      console.log(`Claude:    ${getStoredApiKey(config, 'claude') ? 'configured' : 'not set'}`);
      console.log(`Models dir: ${MODELS_DIR}`);
      console.log();
    });
}
