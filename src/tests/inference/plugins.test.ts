import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { createDefaultProviderRegistry } from '../../intelligence/inference/default-registry.js';
import { loadProviderPlugins } from '../../intelligence/plugins/loader.js';

function withTempDir(run: (dir: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'traceenv-plugin-test-'));
  try {
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('plugin loader loads compatible plugin and skips incompatible plugin', () => {
  withTempDir((dir) => {
    const compatiblePath = path.join(dir, 'compatible.plugin.js');
    const incompatiblePath = path.join(dir, 'incompatible.plugin.js');

    fs.writeFileSync(
      compatiblePath,
      `module.exports = {
        id: 'example-compatible',
        version: '1.0.0',
        coreApiVersion: '1.0.0',
        priority: 90,
        createProvider() {
          return {
            id: 'compatible-provider',
            priority: 90,
            apply: () => true,
            infer: () => ({ providerId: 'compatible-provider', steps: [], prerequisites: [], confidence: 0, rationale: [] })
          };
        }
      };`,
      'utf-8'
    );

    fs.writeFileSync(
      incompatiblePath,
      `module.exports = {
        id: 'example-incompatible',
        version: '1.0.0',
        coreApiVersion: '2.0.0',
        createProvider() { throw new Error('should not load'); }
      };`,
      'utf-8'
    );

    const result = loadProviderPlugins(dir, [compatiblePath, incompatiblePath]);
    assert.equal(result.providers.length, 1);
    assert.equal(result.providers[0].id, 'compatible-provider');

    const loaded = result.decisions.find((item) => item.pluginId === 'example-compatible');
    const skipped = result.decisions.find((item) => item.pluginId === 'example-incompatible');
    assert.equal(loaded?.loaded, true);
    assert.equal(skipped?.loaded, false);
  });
});

test('default registry maintains deterministic ordering with plugin priorities', () => {
  withTempDir((dir) => {
    const pluginPath = path.join(dir, 'priority.plugin.js');

    fs.writeFileSync(
      pluginPath,
      `module.exports = {
        id: 'example-priority',
        version: '1.0.0',
        coreApiVersion: '1.0.0',
        priority: 50,
        createProvider() {
          return {
            id: 'priority-provider',
            priority: 50,
            apply: (ctx) => ctx.manifests.includes('package.json'),
            infer: () => ({
              providerId: 'priority-provider',
              confidence: 1,
              rationale: ['priority test'],
              prerequisites: [],
              steps: [
                { id: 'priority-install', command: 'npm install', cwd: '.', phase: 'deps' }
              ]
            })
          };
        }
      };`,
      'utf-8'
    );

    const registry = createDefaultProviderRegistry({ projectRoot: dir, pluginPaths: [pluginPath] });
    const providers = registry.resolve({
      projectRoot: dir,
      manifests: ['package.json'],
      signals: [{ kind: 'manifest', name: 'package.json' }],
    });

    assert.equal(providers[0].id, 'priority-provider');
    assert.ok(providers.some((provider) => provider.id === 'node'));
  });
});