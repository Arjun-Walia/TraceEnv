import { DependencyInsight, EnvironmentSnapshot, WorkflowSpec } from '../domain/types.js';
import { detectEnvironment } from '../tooling/env/detector.js';
import { checkPrerequisites } from '../tooling/env/prerequisites.js';

export interface AnalysisResult {
  environment: EnvironmentSnapshot;
  missingPrerequisites: string[];
  presentPrerequisites: string[];
  dependencies: DependencyInsight[];
}

function detectDependencies(workflow: WorkflowSpec, environment: EnvironmentSnapshot): DependencyInsight[] {
  const dependencies: DependencyInsight[] = [];

  for (const manifest of environment.manifests) {
    if (manifest === 'package.json') {
      dependencies.push({ name: 'npm', kind: 'package-manager', source: 'manifest' });
    }
    if (manifest === 'docker-compose.yml' || manifest === 'docker-compose.yaml') {
      dependencies.push({ name: 'docker-compose', kind: 'service', source: 'manifest' });
    }
    if (manifest === '.env.example') {
      dependencies.push({ name: 'env-file', kind: 'env-file', source: 'manifest' });
    }
    if (manifest === 'Makefile') {
      dependencies.push({ name: 'make', kind: 'build-tool', source: 'manifest' });
    }
  }

  for (const step of workflow.steps) {
    const command = step.command.toLowerCase();
    if (command.includes('npm ')) {
      dependencies.push({ name: 'npm', kind: 'package-manager', source: 'workflow' });
    }
    if (command.includes('docker compose') || command.includes('docker ')) {
      dependencies.push({ name: 'docker', kind: 'service', source: 'workflow' });
    }
    if (command.includes('migrate') || command.includes('postgres') || command.includes('mysql')) {
      dependencies.push({ name: 'database', kind: 'database', source: 'workflow' });
    }
    if (command.includes('node ') || command.includes('npm ')) {
      dependencies.push({ name: 'node', kind: 'runtime', source: 'workflow' });
    }
  }

  return dependencies.filter(
    (dependency, index, all) =>
      all.findIndex((item) => item.name === dependency.name && item.kind === dependency.kind) === index
  );
}

export class Analyzer {
  analyze(projectRoot: string, workflow: WorkflowSpec): AnalysisResult {
    const environment = detectEnvironment(projectRoot);
    const prerequisiteResult = checkPrerequisites(workflow.prerequisites, environment);

    return {
      environment,
      missingPrerequisites: prerequisiteResult.missing,
      presentPrerequisites: prerequisiteResult.present,
      dependencies: detectDependencies(workflow, environment),
    };
  }
}
