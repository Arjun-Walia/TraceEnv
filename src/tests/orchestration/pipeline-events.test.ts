import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { TracePipeline } from '../../orchestration/pipeline.js';
import { TraceEvent } from '../../observability/events.js';

function withTempProject(files: string[], run: (projectRoot: string) => Promise<void> | void): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'traceenv-events-'));

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

test('pipeline emits structured lifecycle events', async () => {
  await withTempProject(['package.json'], async (projectRoot) => {
    const pipeline = new TracePipeline();
    const events: TraceEvent[] = [];

    const result = await pipeline.run(
      projectRoot,
      {
        dryRun: true,
        autoApprove: true,
        debug: true,
      },
      {
        onEvent: (event) => events.push(event),
      }
    );

    assert.equal(typeof result.success, 'boolean');
    assert.ok(events.length > 0);

    const names = new Set(events.map((event) => event.name));
    assert.equal(names.has('pipeline.started'), true);
    assert.equal(names.has('pipeline.workflow.loaded'), true);
    assert.equal(names.has('pipeline.plan.created'), true);
    assert.equal(names.has('pipeline.execution.started'), true);
    assert.equal(names.has('pipeline.step.result'), true);
    assert.equal(names.has('pipeline.execution.completed'), true);
  });
});