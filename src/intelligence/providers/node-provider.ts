import { InferenceContext, InferenceContribution, InferenceProvider, WorkflowStep } from '../inference/contracts.js';

export class NodeProvider implements InferenceProvider {
  readonly id = 'node';
  readonly priority = 100;

  apply(context: InferenceContext): boolean {
    return (
      context.manifests.includes('.env.example') ||
      context.manifests.includes('docker-compose.yml') ||
      context.manifests.includes('docker-compose.yaml') ||
      context.manifests.includes('package.json')
    );
  }

  infer(context: InferenceContext): InferenceContribution {
    const steps: WorkflowStep[] = [];

    if (context.manifests.includes('.env.example')) {
      steps.push({
        id: 'copy-env',
        command: 'cp .env.example .env',
        description: 'Setup environment configuration',
        cwd: '.',
        phase: 'prepare',
      });
    }

    if (context.manifests.includes('docker-compose.yml') || context.manifests.includes('docker-compose.yaml')) {
      steps.push({
        id: 'docker-up',
        command: 'docker compose up -d',
        description: 'Start Docker services',
        cwd: '.',
        phase: 'services',
      });
    }

    if (context.manifests.includes('package.json')) {
      steps.push({
        id: 'npm-install',
        command: 'npm install',
        description: 'Install npm dependencies',
        cwd: '.',
        phase: 'deps',
      });
    }

    const rationale: string[] = [];
    if (context.manifests.includes('package.json')) {
      rationale.push('Detected package.json, so npm dependency installation is required.');
    }
    if (context.manifests.includes('.env.example')) {
      rationale.push('Detected .env.example, so environment file bootstrap is suggested.');
    }
    if (context.manifests.includes('docker-compose.yml') || context.manifests.includes('docker-compose.yaml')) {
      rationale.push('Detected Docker Compose manifest, so local services can be started.');
    }

    return {
      providerId: this.id,
      steps,
      prerequisites: context.manifests.includes('package.json') ? ['Node.js 18+'] : [],
      confidence: steps.length > 0 ? 1 : 0,
      rationale,
    };
  }
}