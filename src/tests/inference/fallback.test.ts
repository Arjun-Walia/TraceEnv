import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { createPartialWorkflow } from '../../intelligence/fallback.js';
import { IntelligenceEngine } from '../../intelligence/engine.js';

function withTempProject(files: string[], run: (projectRoot: string) => Promise<void> | void): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'traceenv-fallback-'));

  return Promise.resolve()
    .then(async () => {
      for (const file of files) {
        fs.writeFileSync(path.join(root, file), '', 'utf-8');
      }

      await run(root);
    })
    .finally(() => {
      fs.rmSync(root, { recursive: true, force: true });
    });
}

test('partial workflow includes confidence, hints, suggested commands, and recommendation', () => {
  const workflow = createPartialWorkflow('/workspace/demo', ['Cargo.toml', 'Makefile']);

  assert.equal(workflow.inference?.mode, 'partial');
  assert.ok((workflow.inference?.confidence ?? 0) > 0);
  assert.ok((workflow.inference?.manifestHints?.length ?? 0) > 0);
  assert.ok((workflow.inference?.suggestedCommands?.length ?? 0) > 0);
  assert.ok((workflow.inference?.recommendation ?? '').includes('.traceenv.json'));
  assert.ok(workflow.steps.length > 0);
});

test('engine falls back to partial mode when signals exist but no full workflow can be inferred', async () => {
  await withTempProject(['Cargo.toml'], async (projectRoot) => {
    const engine = new IntelligenceEngine({
      mode: 'local',
      provider: 'rule',
      model: 'rule-engine',
      apiKey: null,
      apiKeys: {},
    });
    const result = await engine.buildWorkflow(projectRoot);

    assert.equal(result.source, 'rule');
    assert.equal(result.workflow.inference?.mode, 'partial');
    assert.deepEqual(result.workflow.inference?.signals, ['Cargo.toml']);
    assert.ok(result.workflow.steps.length > 0);
  });
});