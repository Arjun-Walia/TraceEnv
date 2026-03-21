import { WorkflowSpec } from '../../domain/types.js';
import { scanManifests } from '../../tooling/fs/manifest-scanner.js';
import { createDefaultProviderRegistry } from '../inference/default-registry.js';
import { InferenceOrchestrator } from '../inference/orchestrator.js';
import { buildInferenceContext } from '../inference/signals.js';

export function inferWorkflow(projectRoot: string): WorkflowSpec {
  const manifests = scanManifests(projectRoot);
  const context = buildInferenceContext(projectRoot, manifests);
  const registry = createDefaultProviderRegistry({ projectRoot });
  const orchestrator = new InferenceOrchestrator(registry);
  const inference = orchestrator.infer(context);
  const steps = inference.steps;

  return {
    version: '1.0.0',
    steps,
    prerequisites: inference.prerequisites,
    estimatedTime: steps.length > 3 ? '5-10 minutes' : '2-5 minutes',
    inference: {
      mode: 'full',
      confidence: Math.round(
        (inference.contributions.reduce((sum, contribution) => sum + contribution.confidence, 0) /
          Math.max(1, inference.contributions.length)) * 100
      ),
      signals: manifests,
      providerDecisions: inference.providerDecisions,
      mergeDecisions: inference.decisions,
      stepProvenance: inference.stepProvenance,
    },
  };
}
