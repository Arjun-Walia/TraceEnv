import { EnvironmentSnapshot } from '../../domain/types.js';
import { scanManifests } from '../fs/manifest-scanner.js';
import { detectToolCapabilities } from './capabilities.js';

export function detectEnvironment(projectRoot: string): EnvironmentSnapshot {
  const capabilities = detectToolCapabilities();
  const toolRecord: Record<string, string | null> = {};

  for (const capability of capabilities) {
    toolRecord[capability.tool] = capability.available ? capability.version ?? 'available' : null;
  }

  return {
    platform: process.platform,
    nodeVersion: process.version,
    cwd: projectRoot,
    tools: toolRecord,
    manifests: scanManifests(projectRoot),
  };
}
