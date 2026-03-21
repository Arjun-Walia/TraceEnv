import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { inferWorkflow } from '../../intelligence/rule-engine/infer.js';

function withTempProject(files: string[], run: (projectRoot: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'traceenv-infer-'));
  try {
    for (const file of files) {
      const fullPath = path.join(root, file);
      fs.writeFileSync(fullPath, '', 'utf-8');
    }

    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('inferWorkflow includes node, python, and go steps when manifests are present', () => {
  withTempProject(['package.json', 'requirements.txt', 'go.mod'], (projectRoot) => {
    const workflow = inferWorkflow(projectRoot);
    const commands = workflow.steps.map((step) => step.command);

    assert.deepEqual(commands, [
      'python -m venv .venv',
      'npm install',
      'python -m pip install -r requirements.txt',
      'go mod download',
      'go build ./...',
      'python -m pytest',
      'go test ./...',
      'python main.py',
    ]);

    assert.deepEqual(workflow.prerequisites, ['Node.js 18+', 'Python 3.x', 'pip', 'venv', 'Go toolchain']);
  });
});

test('inferWorkflow keeps env and docker setup behavior for node-style projects', () => {
  withTempProject(['.env.example', 'docker-compose.yml', 'package.json'], (projectRoot) => {
    const workflow = inferWorkflow(projectRoot);
    const commands = workflow.steps.map((step) => step.command);

    assert.deepEqual(commands, ['cp .env.example .env', 'npm install', 'docker compose up -d']);
  });
});