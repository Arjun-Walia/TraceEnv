import { WorkflowStepSpec } from '../../domain/types.js';

export function inferStepsFromManifests(manifests: string[]): WorkflowStepSpec[] {
  const steps: WorkflowStepSpec[] = [];

  if (manifests.includes('.env.example')) {
    steps.push({ id: 'copy-env', command: 'cp .env.example .env', description: 'Setup environment configuration' });
  }

  if (manifests.includes('docker-compose.yml') || manifests.includes('docker-compose.yaml')) {
    steps.push({ id: 'docker-up', command: 'docker compose up -d', description: 'Start Docker services' });
  }

  if (manifests.includes('package.json')) {
    steps.push({ id: 'npm-install', command: 'npm install', description: 'Install npm dependencies' });
  }

  return steps;
}
