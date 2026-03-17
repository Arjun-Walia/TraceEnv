import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export type IntelligenceMode = 'local' | 'hybrid' | 'api';
export type IntelligenceProvider = 'rule' | 'local' | 'openai' | 'claude';

export const CONFIG_DIR = path.join(os.homedir(), '.traceenv');
export const DB_PATH = path.join(CONFIG_DIR, 'commands.db');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
export const MODELS_DIR = path.join(CONFIG_DIR, 'models');
export const HOOKS_DIR = path.join(CONFIG_DIR, 'hooks');
export const DAEMON_PORT = 7842;
export const DAEMON_PID_FILE = path.join(CONFIG_DIR, 'daemon.pid');

export interface TraceEnvConfig {
  shell: 'bash' | 'zsh';
  storage: string;
  mode: IntelligenceMode;
  model: string;
  provider: IntelligenceProvider;
  apiKey: string | null;
  apiKeys?: Partial<Record<'openai' | 'claude', string>>;
  daemonPort: number;
  privacy: {
    telemetry: boolean;
  };
  demoCompleted?: boolean;
}

const DEFAULT_CONFIG: TraceEnvConfig = {
  shell: 'bash',
  storage: DB_PATH,
  mode: 'local',
  model: 'qwen2.5-coder',
  provider: 'local',
  apiKey: null,
  apiKeys: {},
  daemonPort: DAEMON_PORT,
  privacy: {
    telemetry: false,
  },
};

export function ensureConfigDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  fs.mkdirSync(HOOKS_DIR, { recursive: true });
}

export function loadConfig(): TraceEnvConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<TraceEnvConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      apiKeys: {
        ...DEFAULT_CONFIG.apiKeys,
        ...(parsed.apiKeys ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: TraceEnvConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
