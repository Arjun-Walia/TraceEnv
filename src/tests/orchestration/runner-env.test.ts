import assert from 'node:assert/strict';
import test from 'node:test';
import { runCommand } from '../../tooling/shell/runner.js';

test('runCommand applies envPatch variables', async () => {
  const output = await runCommand({
    command: 'node -p process.env.TRACEENV_TEST_FLAG',
    cwd: process.cwd(),
    timeoutMs: 5000,
    envPatch: {
      TRACEENV_TEST_FLAG: 'ok',
    },
  });

  assert.equal(output.exitCode, 0);
  assert.equal(output.stdout.trim(), 'ok');
});
