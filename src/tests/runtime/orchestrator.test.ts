import assert from 'node:assert/strict';
import test from 'node:test';
import { RuntimeManager, RuntimeVersion } from '../../runtime/manager-types.js';
import { RuntimeOrchestrator } from '../../runtime/orchestrator.js';
import { RuntimeRequirement } from '../../runtime/types.js';

class FakeRuntimeManager implements RuntimeManager {
  constructor(
    readonly runtime: string,
    private readonly versions: RuntimeVersion[],
    private readonly enabled = true
  ) {}

  supportsPlatform(_platform: NodeJS.Platform): boolean {
    return this.enabled;
  }

  async detectInstalled(): Promise<RuntimeVersion[]> {
    return this.versions;
  }

  async resolveCompatible(range: string, installed: RuntimeVersion[]): Promise<RuntimeVersion | null> {
    if (range.includes('18') && this.runtime === 'node') {
      return installed.find((item) => item.version.startsWith('18.')) ?? null;
    }
    if (range.includes('3.12') && this.runtime === 'python') {
      return installed.find((item) => item.version.startsWith('3.12.')) ?? null;
    }
    return null;
  }

  async install(version: string, _projectRoot: string): Promise<RuntimeVersion> {
    return {
      runtime: this.runtime,
      version,
      executablePath: `/tmp/${this.runtime}`,
      managedBy: 'traceenv-cache',
    };
  }

  async activate(version: RuntimeVersion, _projectRoot: string) {
    return {
      runtime: this.runtime,
      selectedVersion: version.version,
      executablePath: version.executablePath,
      envPatch: { [`TRACEENV_${this.runtime.toUpperCase()}_PATH`]: version.executablePath },
      pathEntries: [],
    };
  }
}

function requirement(runtime: string, range: string): RuntimeRequirement {
  return {
    runtime,
    versionRange: range,
    confidence: 90,
    constraints: [],
  };
}

test('runtime orchestrator resolves installed compatible runtimes', async () => {
  const orchestrator = new RuntimeOrchestrator({
    managers: [
      new FakeRuntimeManager('node', [
        { runtime: 'node', version: '18.19.0', executablePath: '/usr/bin/node', managedBy: 'system' },
      ]),
      new FakeRuntimeManager('python', [
        { runtime: 'python', version: '3.12.7', executablePath: '/usr/bin/python3', managedBy: 'system' },
      ]),
    ],
  });

  const result = await orchestrator.resolveRequirements('/workspace', [
    requirement('node', '>=18.0.0,<19.0.0'),
    requirement('python', '>=3.12.0,<3.13.0'),
  ]);

  assert.equal(result.unresolved.length, 0);
  assert.equal(result.resolved.length, 2);
  assert.equal(result.resolved[0].context.runtime, 'node');
  assert.equal(result.resolved[1].context.runtime, 'python');
});

test('runtime orchestrator reports unresolved requirement when no compatible runtime exists', async () => {
  const orchestrator = new RuntimeOrchestrator({
    managers: [
      new FakeRuntimeManager('python', [
        { runtime: 'python', version: '3.14.0', executablePath: '/usr/bin/python3', managedBy: 'system' },
      ]),
    ],
  });

  const result = await orchestrator.resolveRequirements('/workspace', [
    requirement('python', '>=3.12.0,<3.14.0'),
  ]);

  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.match(result.unresolved[0].reason, /No installed python version satisfies/);
});

test('runtime orchestrator reports unresolved requirement when manager missing', async () => {
  const orchestrator = new RuntimeOrchestrator({ managers: [] });

  const result = await orchestrator.resolveRequirements('/workspace', [
    requirement('go', '>=1.22.0,<1.23.0'),
  ]);

  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.match(result.unresolved[0].reason, /No runtime manager is registered/);
});
