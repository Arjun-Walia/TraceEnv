import * as child_process from 'child_process';
import { EnvironmentSnapshot } from '../../domain/types.js';
import { scanManifests } from '../fs/manifest-scanner.js';

function safeVersion(command: string, args: string[]): string | null {
  try {
    const result = child_process.spawnSync(command, args, { encoding: 'utf-8' });
    if (result.error || result.status !== 0) return null;
    return (result.stdout || result.stderr || '').trim().split('\n')[0] || null;
  } catch {
    return null;
  }
}

export function detectEnvironment(projectRoot: string): EnvironmentSnapshot {
  return {
    platform: process.platform,
    nodeVersion: process.version,
    cwd: projectRoot,
    tools: {
      node: safeVersion('node', ['--version']),
      npm: safeVersion('npm', ['--version']),
      python: safeVersion('python', ['--version']) ?? safeVersion('python3', ['--version']),
      pip: safeVersion('pip', ['--version']) ?? safeVersion('pip3', ['--version']),
      go: safeVersion('go', ['version']),
      docker: safeVersion('docker', ['--version']),
      git: safeVersion('git', ['--version']),
    },
    manifests: scanManifests(projectRoot),
  };
}
