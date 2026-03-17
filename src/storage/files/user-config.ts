import { TraceEnvConfig, loadConfig, saveConfig } from '../../config.js';

export function loadUserConfig(): TraceEnvConfig {
  return loadConfig();
}

export function saveUserConfig(config: TraceEnvConfig): void {
  saveConfig(config);
}
