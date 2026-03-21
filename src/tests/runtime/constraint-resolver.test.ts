import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { VersionConstraintResolver } from '../../runtime/constraint-resolver.js';
import { intersectRanges } from '../../runtime/version-range.js';

function withTempProject(files: Record<string, string>, run: (projectRoot: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'traceenv-runtime-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(root, name), content, 'utf-8');
    }
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('version range intersection works for compatible and conflicting constraints', () => {
  assert.equal(intersectRanges('>=3.10,<3.14', '>=3.12,<3.13'), '>=3.12.0,<3.13.0');
  assert.equal(intersectRanges('>=18', '<20'), '>=18.0.0,<20.0.0');
  assert.equal(intersectRanges('>=3.14', '<3.14'), null);
});

test('resolver extracts node constraints from engines and .nvmrc', () => {
  withTempProject(
    {
      'package.json': JSON.stringify({ name: 'x', engines: { node: '>=18 <21' } }),
      '.nvmrc': '20',
    },
    (projectRoot) => {
      const resolver = new VersionConstraintResolver();
      const result = resolver.resolve(projectRoot);
      const node = result.requirements.find((item) => item.runtime === 'node');

      assert.ok(node);
      assert.ok(node!.constraints.length >= 2);
      assert.equal(result.conflicts.length, 0);
    }
  );
});

test('resolver extracts python constraints from pyproject and runtime errors', () => {
  withTempProject(
    {
      'pyproject.toml': '[project]\nrequires-python = ">=3.10,<3.14"\n',
      'requirements.txt': 'foo; python_version < "3.14"\n',
    },
    (projectRoot) => {
      const resolver = new VersionConstraintResolver();
      const result = resolver.resolve(projectRoot, [
        'ERROR: Requires-Python >=3.10,<3.14',
      ]);
      const python = result.requirements.find((item) => item.runtime === 'python');

      assert.ok(python);
      assert.ok(python!.versionRange.includes('<3.14.0'));
      assert.equal(result.conflicts.length, 0);
    }
  );
});

test('resolver extracts go constraint from go.mod', () => {
  withTempProject(
    {
      'go.mod': 'module example.com/app\n\ngo 1.22\n',
    },
    (projectRoot) => {
      const resolver = new VersionConstraintResolver();
      const result = resolver.resolve(projectRoot);
      const go = result.requirements.find((item) => item.runtime === 'go');

      assert.ok(go);
      assert.ok(go!.versionRange.includes('1.22.0'));
    }
  );
});