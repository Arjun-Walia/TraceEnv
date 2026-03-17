import { WorkflowSpec } from '../../domain/types.js';
import { scanManifests } from '../../tooling/fs/manifest-scanner.js';
import { inferStepsFromManifests } from './rules.js';

export function inferWorkflow(projectRoot: string): WorkflowSpec {
  const manifests = scanManifests(projectRoot);
  const steps = inferStepsFromManifests(manifests);

  return {
    version: '1.0.0',
    steps,
    prerequisites: manifests.includes('package.json') ? ['Node.js 18+'] : [],
    estimatedTime: steps.length > 3 ? '5-10 minutes' : '2-5 minutes',
  };
}
