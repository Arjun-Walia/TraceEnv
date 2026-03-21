import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectToolCapabilities,
  parseRequirements,
  resolveRequirements,
  ToolCapability,
} from '../../tooling/env/capabilities.js';

test('detectToolCapabilities returns structured capability model with required tools', () => {
  const capabilities = detectToolCapabilities();
  const byTool = new Map(capabilities.map((capability) => [capability.tool, capability]));

  assert.ok(byTool.has('node'));
  assert.ok(byTool.has('npm'));
  assert.ok(byTool.has('pnpm'));
  assert.ok(byTool.has('yarn'));
  assert.ok(byTool.has('python'));
  assert.ok(byTool.has('pip'));
  assert.ok(byTool.has('venv'));
  assert.ok(byTool.has('go'));
  assert.ok(byTool.has('docker'));
  assert.ok(byTool.has('docker-compose'));

  const node = byTool.get('node');
  assert.equal(node?.available, true);
  assert.ok(typeof node?.version === 'string' || node?.version === null);
});

test('parseRequirements maps raw prerequisites into typed requirements', () => {
  const requirements = parseRequirements(['Node.js 18+', 'pip', 'venv', 'Docker Compose', 'Go toolchain']);

  assert.equal(requirements[0].type, 'tool');
  assert.equal(requirements[0].tool, 'node');

  assert.equal(requirements[1].type, 'tool');
  assert.equal(requirements[1].tool, 'pip');

  assert.equal(requirements[2].type, 'tool');
  assert.equal(requirements[2].tool, 'venv');

  assert.equal(requirements[3].type, 'tool-group');
  assert.deepEqual(requirements[3].anyOf, ['docker-compose', 'docker']);

  assert.equal(requirements[4].type, 'tool');
  assert.equal(requirements[4].tool, 'go');
});

test('resolveRequirements reports missing tools and structured remediation', () => {
  const requirements = parseRequirements(['Node.js 18+', 'pip', 'Go toolchain', 'Docker Compose']);
  const capabilities: ToolCapability[] = [
    { tool: 'node', version: 'v20.0.0', available: true, source: 'runtime' },
    { tool: 'npm', version: null, available: true, source: 'path-scan' },
    { tool: 'pnpm', version: null, available: false, source: 'path-scan' },
    { tool: 'yarn', version: null, available: false, source: 'path-scan' },
    { tool: 'python', version: null, available: true, source: 'path-scan' },
    { tool: 'pip', version: null, available: false, source: 'path-scan' },
    { tool: 'venv', version: null, available: true, source: 'derived' },
    { tool: 'go', version: null, available: false, source: 'path-scan' },
    { tool: 'docker', version: null, available: true, source: 'path-scan' },
    { tool: 'docker-compose', version: null, available: false, source: 'path-scan' },
    { tool: 'git', version: null, available: true, source: 'path-scan' },
  ];

  const result = resolveRequirements(requirements, capabilities);

  assert.deepEqual(result.present.map((item) => item.requirement.raw), ['Node.js 18+', 'Docker Compose']);
  assert.deepEqual(result.missing.map((item) => item.requirement.raw), ['pip', 'Go toolchain']);

  const pipResolution = result.missing.find((item) => item.requirement.raw === 'pip');
  assert.ok(pipResolution);
  assert.equal(pipResolution?.remediation[0].kind, 'install-tool');
  assert.ok(Array.isArray(pipResolution?.remediation[0].commands.win32));
  assert.ok(Array.isArray(pipResolution?.remediation[0].commands.linux));
  assert.ok(Array.isArray(pipResolution?.remediation[0].commands.darwin));
});