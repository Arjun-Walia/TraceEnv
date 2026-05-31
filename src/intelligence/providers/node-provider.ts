import { InferenceContext, InferenceContribution, InferenceProvider, WorkflowStep } from '../inference/contracts.js';
import { uniqueDirectoriesFor, normalizeIdToken } from './_shared.js';

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
    const packageManager = detectNodePackageManager(context);
    const installCommand = `${packageManager} install`;

    const directories = uniqueDirectoriesFor(context, ['package.json']);
    const hasRootPackageJson = context.manifests.includes('package.json');
    if (hasRootPackageJson && !directories.includes('.')) {
      directories.unshift('.');
    }

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

    for (const directory of directories) {
      steps.push({
        id: directory === '.' ? `${packageManager}-install` : `${packageManager}-install-${normalizeIdToken(directory)}`,
        command: installCommand,
        description:
          directory === '.'
            ? `Install ${packageManager} dependencies`
            : `Install ${packageManager} dependencies in ${directory}`,
        cwd: directory,
        phase: 'deps',
      });
    }

    const rationale: string[] = [];
    if (context.manifests.includes('package.json')) {
      rationale.push(`Detected package.json, so ${packageManager} dependency installation is required.`);
    }
    if (directories.length > 1 || (directories.length === 1 && directories[0] !== '.')) {
      rationale.push('Detected multiple package.json files, so per-directory dependency installation steps were generated.');
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

function detectNodePackageManager(context: InferenceContext): 'npm' | 'pnpm' | 'yarn' {
  if (context.manifests.includes('pnpm-lock.yaml')) {
    return 'pnpm';
  }

  if (context.manifests.includes('yarn.lock')) {
    return 'yarn';
  }

  return 'npm';
}
