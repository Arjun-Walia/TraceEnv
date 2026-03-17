import { MODELS_DIR, TraceEnvConfig } from '../../config.js';
import { ConfigRepository } from '../../storage/repositories/config-repo.js';
import {
  getProviderDescriptor,
  listProviderDescriptors,
  resolveModelSelection,
} from '../../intelligence/registry.js';
import * as fs from 'fs';

function formatMode(config: TraceEnvConfig): string {
  return `${config.mode} / ${config.provider} / ${config.model}`;
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
      console.log(`Models dir: ${MODELS_DIR}`);
      console.log();
    });
}
