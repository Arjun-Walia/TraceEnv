import { TraceEnvConfig, loadConfig, saveConfig } from '../../config.js';

export class ConfigRepository {
  load(): TraceEnvConfig {
    return loadConfig();
  }

  save(config: TraceEnvConfig): void {
    saveConfig(config);
  }
}
