import { RuntimeKind, RuntimeRequirement } from './types.js';

export interface RuntimeVersion {
  runtime: RuntimeKind;
  version: string;
  executablePath: string;
  managedBy: 'system' | 'nvm' | 'fnm' | 'pyenv' | 'py-launcher' | 'gvm' | 'traceenv-cache' | 'unknown';
}

export interface RuntimeContext {
  runtime: RuntimeKind;
  selectedVersion: string;
  executablePath: string;
  envPatch: Record<string, string>;
  pathEntries: string[];
}

export interface RuntimeManager {
  runtime: RuntimeKind;
  detectInstalled(projectRoot: string): Promise<RuntimeVersion[]>;
  resolveCompatible(range: string, installed: RuntimeVersion[]): Promise<RuntimeVersion | null>;
  install(version: string, projectRoot: string): Promise<RuntimeVersion>;
  activate(version: RuntimeVersion, projectRoot: string): Promise<RuntimeContext>;
  supportsPlatform(platform: NodeJS.Platform): boolean;
}

export interface RuntimeResolution {
  requirement: RuntimeRequirement;
  selected: RuntimeVersion;
  context: RuntimeContext;
  installedNow: boolean;
  reason: string;
}

export interface RuntimeResolutionFailure {
  requirement: RuntimeRequirement;
  reason: string;
  remediation: string[];
}

export interface RuntimeOrchestrationResult {
  resolved: RuntimeResolution[];
  unresolved: RuntimeResolutionFailure[];
}