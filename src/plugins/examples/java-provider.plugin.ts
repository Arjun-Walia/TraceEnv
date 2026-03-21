import { InferenceContext, InferenceProvider, WorkflowStep } from '../../intelligence/inference/contracts.js';
import { ProviderPlugin } from '../../intelligence/plugins/contracts.js';

class JavaProvider implements InferenceProvider {
  readonly id = 'java';
  readonly priority = 150;

  apply(context: InferenceContext): boolean {
    return (
      context.manifests.includes('pom.xml') ||
      context.manifests.includes('build.gradle') ||
      context.manifests.includes('build.gradle.kts')
    );
  }

  infer(context: InferenceContext) {
    const steps: WorkflowStep[] = [];

    if (context.manifests.includes('pom.xml')) {
      steps.push({
        id: 'maven-package',
        command: 'mvn -q package',
        description: 'Build Maven project',
        cwd: '.',
        phase: 'build',
      });
    }

    if (context.manifests.includes('build.gradle') || context.manifests.includes('build.gradle.kts')) {
      steps.push({
        id: 'gradle-build',
        command: 'gradle build',
        description: 'Build Gradle project',
        cwd: '.',
        phase: 'build',
      });
    }

    return {
      providerId: this.id,
      steps,
      prerequisites: ['Java JDK'],
      confidence: steps.length > 0 ? 0.85 : 0,
      rationale: ['Detected Java build manifest, so Java build workflow was inferred.'],
    };
  }
}

const plugin: ProviderPlugin = {
  id: 'traceenv-plugin-java',
  version: '1.0.0',
  coreApiVersion: '1.0.0',
  priority: 150,
  createProvider(): InferenceProvider {
    return new JavaProvider();
  },
};

export default plugin;