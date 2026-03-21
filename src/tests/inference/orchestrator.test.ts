import assert from 'node:assert/strict';
import test from 'node:test';
import { InferenceContext, InferenceContribution, InferenceProvider } from '../../intelligence/inference/contracts.js';
import { InferenceOrchestrator } from '../../intelligence/inference/orchestrator.js';
import { ProviderRegistry } from '../../intelligence/inference/provider-registry.js';

function createContext(manifests: string[] = []): InferenceContext {
  return {
    projectRoot: '/tmp/project',
    manifests,
    signals: manifests.map((name) => ({ kind: 'manifest', name })),
  };
}

class StubProvider implements InferenceProvider {
  constructor(
    public readonly id: string,
    private readonly contribution: InferenceContribution,
    public readonly priority = 100
  ) {}

  apply(): boolean {
    return true;
  }

  infer(): InferenceContribution {
    return this.contribution;
  }
}

test('provider registry resolves providers by priority then id', () => {
  const registry = new ProviderRegistry();

  registry.register(
    new StubProvider('z-last', { providerId: 'z-last', steps: [], confidence: 0.5, rationale: [] }, 200)
  );
  registry.register(
    new StubProvider('a-mid', { providerId: 'a-mid', steps: [], confidence: 0.5, rationale: [] }, 100)
  );
  registry.register(
    new StubProvider('b-mid', { providerId: 'b-mid', steps: [], confidence: 0.5, rationale: [] }, 100)
  );
  registry.register(
    new StubProvider('first', { providerId: 'first', steps: [], confidence: 0.5, rationale: [] }, 10)
  );

  const ids = registry.resolve(createContext()).map((provider) => provider.id);
  assert.deepEqual(ids, ['first', 'a-mid', 'b-mid', 'z-last']);
});

test('orchestrator deduplicates steps and prerequisites deterministically', () => {
  const registry = new ProviderRegistry();
  registry.register(
    new StubProvider(
      'alpha',
      {
        providerId: 'alpha',
        steps: [
          { id: 'install', command: 'npm install', description: 'Install dependencies', cwd: '.', phase: 'deps' },
          { id: 'up', command: 'docker compose up -d', description: 'Start services', cwd: '.', phase: 'services' },
        ],
        prerequisites: ['Node.js 18+', 'Docker'],
        confidence: 0.9,
        rationale: ['alpha test contribution'],
      },
      100
    )
  );

  registry.register(
    new StubProvider(
      'beta',
      {
        providerId: 'beta',
        steps: [
          {
            id: 'install-duplicate',
            command: 'npm install',
            description: 'Duplicate command',
            cwd: '.',
            phase: 'deps',
          },
          {
            id: 'python',
            command: 'python -m pip install -r requirements.txt',
            cwd: '.',
            phase: 'deps',
          },
        ],
        prerequisites: ['node.js 18+', 'Python 3.9+'],
        confidence: 0.8,
        rationale: ['beta test contribution'],
      },
      110
    )
  );

  const orchestrator = new InferenceOrchestrator(registry);
  const result = orchestrator.infer(createContext(['package.json', 'requirements.txt']));

  assert.deepEqual(result.steps.map((step) => step.command), [
    'npm install',
    'python -m pip install -r requirements.txt',
    'docker compose up -d',
  ]);

  assert.deepEqual(result.prerequisites, ['Node.js 18+', 'Docker', 'Python 3.9+']);

  const duplicateStepDecision = result.decisions.find(
    (decision) => decision.type === 'step-skipped-conflict' && decision.key === '.::npm install'
  );
  assert.ok(duplicateStepDecision);

  const duplicatePrereqDecision = result.decisions.find(
    (decision) => decision.type === 'prerequisite-skipped-duplicate' && decision.key === 'node.js 18+'
  );
  assert.ok(duplicatePrereqDecision);
});