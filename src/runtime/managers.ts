import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { RuntimeManager, RuntimeVersion, RuntimeContext } from './manager-types.js';
import { satisfiesRange } from './version-range.js';

export class NodeRuntimeManager implements RuntimeManager {
  readonly runtime = 'node';

  supportsPlatform(_platform: NodeJS.Platform): boolean {
    return true;
  }

  async detectInstalled(): Promise<RuntimeVersion[]> {
    const current = normalizeVersion(process.versions.node);
    const found: RuntimeVersion[] = [
      {
        runtime: 'node',
        version: current,
        executablePath: process.execPath,
        managedBy: 'system',
      },
    ];

    return dedupeVersions(found);
  }

  async resolveCompatible(range: string, installed: RuntimeVersion[]): Promise<RuntimeVersion | null> {
    const candidates = installed.filter((item) => satisfiesRange(item.version, range));
    if (candidates.length === 0) {
      return null;
    }

    return candidates.sort((a, b) => compareVersionDesc(a.version, b.version))[0];
  }

  async install(_version: string, _projectRoot: string): Promise<RuntimeVersion> {
    throw new Error('Automatic Node runtime installation is not yet enabled in this build.');
  }

  async activate(version: RuntimeVersion): Promise<RuntimeContext> {
    return {
      runtime: 'node',
      selectedVersion: version.version,
      executablePath: version.executablePath,
      envPatch: {
        TRACEENV_RUNTIME_NODE: version.executablePath,
        TRACEENV_RUNTIME_NODE_VERSION: version.version,
      },
      pathEntries: [path.dirname(version.executablePath)],
    };
  }
}

export class PythonRuntimeManager implements RuntimeManager {
  readonly runtime = 'python';

  supportsPlatform(_platform: NodeJS.Platform): boolean {
    return true;
  }

  async detectInstalled(): Promise<RuntimeVersion[]> {
    const commands = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
    const found: RuntimeVersion[] = [];

    for (const command of commands) {
      const probe = probeCommandVersion(command, ['--version']);
      if (!probe) {
        continue;
      }

      found.push({
        runtime: 'python',
        version: normalizeVersion(probe.version),
        executablePath: probe.executablePath,
        managedBy: command === 'py' ? 'py-launcher' : 'system',
      });
    }

    return dedupeVersions(found);
  }

  async resolveCompatible(range: string, installed: RuntimeVersion[]): Promise<RuntimeVersion | null> {
    const candidates = installed.filter((item) => satisfiesRange(item.version, range));
    if (candidates.length === 0) {
      return null;
    }

    return candidates.sort((a, b) => compareVersionDesc(a.version, b.version))[0];
  }

  async install(_version: string, _projectRoot: string): Promise<RuntimeVersion> {
    throw new Error('Automatic Python runtime installation is not yet enabled in this build.');
  }

  async activate(version: RuntimeVersion, projectRoot: string): Promise<RuntimeContext> {
    const venvPath = path.join(projectRoot, '.venv');
    const pythonHome = path.dirname(path.dirname(version.executablePath));

    return {
      runtime: 'python',
      selectedVersion: version.version,
      executablePath: version.executablePath,
      envPatch: {
        TRACEENV_RUNTIME_PYTHON: version.executablePath,
        TRACEENV_RUNTIME_PYTHON_VERSION: version.version,
        PYTHONHOME: pythonHome,
        TRACEENV_PYTHON_VENV_PATH: venvPath,
      },
      pathEntries: [path.dirname(version.executablePath)],
    };
  }
}

export class GoRuntimeManager implements RuntimeManager {
  readonly runtime = 'go';

  supportsPlatform(_platform: NodeJS.Platform): boolean {
    return true;
  }

  async detectInstalled(): Promise<RuntimeVersion[]> {
    const probe = probeCommandVersion('go', ['version']);
    if (!probe) {
      return [];
    }

    return [
      {
        runtime: 'go',
        version: normalizeVersion(probe.version),
        executablePath: probe.executablePath,
        managedBy: 'system',
      },
    ];
  }

  async resolveCompatible(range: string, installed: RuntimeVersion[]): Promise<RuntimeVersion | null> {
    const candidates = installed.filter((item) => satisfiesRange(item.version, range));
    if (candidates.length === 0) {
      return null;
    }

    return candidates.sort((a, b) => compareVersionDesc(a.version, b.version))[0];
  }

  async install(_version: string, _projectRoot: string): Promise<RuntimeVersion> {
    throw new Error('Automatic Go runtime installation is not yet enabled in this build.');
  }

  async activate(version: RuntimeVersion): Promise<RuntimeContext> {
    return {
      runtime: 'go',
      selectedVersion: version.version,
      executablePath: version.executablePath,
      envPatch: {
        TRACEENV_RUNTIME_GO: version.executablePath,
        TRACEENV_RUNTIME_GO_VERSION: version.version,
      },
      pathEntries: [path.dirname(version.executablePath)],
    };
  }
}

export function createDefaultRuntimeManagers(): RuntimeManager[] {
  return [new NodeRuntimeManager(), new PythonRuntimeManager(), new GoRuntimeManager()];
}

function probeCommandVersion(command: string, args: string[]): { executablePath: string; version: string } | null {
  const executablePath = findOnPath(command);
  if (!executablePath) {
    return null;
  }

  try {
    const result = child_process.spawnSync(executablePath, args, { encoding: 'utf-8' });
    if (result.error || result.status !== 0) {
      return null;
    }
    const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    const versionMatch = text.match(/(\d+\.\d+(?:\.\d+)?)/);
    if (!versionMatch) {
      return null;
    }
    return {
      executablePath,
      version: versionMatch[1],
    };
  } catch {
    return null;
  }
}

function findOnPath(command: string): string | null {
  const pathValue = process.env.PATH ?? '';
  const pathEntries = pathValue.split(process.platform === 'win32' ? ';' : ':').filter(Boolean);
  const extensions = process.platform === 'win32'
    ? ['', '.exe', '.cmd', '.bat', '.com']
    : [''];

  for (const entry of pathEntries) {
    for (const ext of extensions) {
      const fullPath = path.join(entry, `${command}${ext}`);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

function normalizeVersion(version: string): string {
  const clean = version.trim().replace(/^v/i, '');
  const [major = '0', minor = '0', patch = '0'] = clean.split('.');
  return `${parseInt(major, 10) || 0}.${parseInt(minor, 10) || 0}.${parseInt(patch, 10) || 0}`;
}

function compareVersionDesc(left: string, right: string): number {
  const a = normalizeVersion(left).split('.').map((item) => parseInt(item, 10));
  const b = normalizeVersion(right).split('.').map((item) => parseInt(item, 10));

  if (a[0] !== b[0]) return b[0] - a[0];
  if (a[1] !== b[1]) return b[1] - a[1];
  return b[2] - a[2];
}

function dedupeVersions(items: RuntimeVersion[]): RuntimeVersion[] {
  const seen = new Set<string>();
  const out: RuntimeVersion[] = [];
  for (const item of items) {
    const key = `${item.runtime}:${item.version}:${item.executablePath}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}