import { InferenceContext, InferenceContribution, InferenceProvider, WorkflowStep } from '../inference/contracts.js';
import { uniqueDirectoriesFor, normalizeIdToken } from './_shared.js';

export class JavaProvider implements InferenceProvider {
  readonly id = 'java';
  readonly priority = 150;

  apply(context: InferenceContext): boolean {
    return (
      context.manifests.includes('pom.xml') ||
      context.manifests.includes('build.gradle') ||
      context.manifests.includes('build.gradle.kts')
    );
  }

  infer(context: InferenceContext): InferenceContribution {
    if (!this.apply(context)) {
      return {
        providerId: this.id,
        steps: [],
        prerequisites: [],
        confidence: 0,
        rationale: [],
      };
    }

    const mavenDirs = uniqueDirectoriesFor(context, ['pom.xml']);
    const gradleDirs = uniqueDirectoriesFor(context, ['build.gradle', 'build.gradle.kts']);
    const steps: WorkflowStep[] = [];

    for (const directory of mavenDirs) {
      const suffix = directory === '.' ? '' : `-${normalizeIdToken(directory)}`;
      steps.push({
        id: `maven-package${suffix}`,
        command: 'mvn -q package',
        description: directory === '.' ? 'Build Maven project' : `Build Maven project in ${directory}`,
        cwd: directory,
        phase: 'build',
      });
    }

    for (const directory of gradleDirs) {
      const suffix = directory === '.' ? '' : `-${normalizeIdToken(directory)}`;
      steps.push({
        id: `gradle-build${suffix}`,
        command: 'gradle build',
        description: directory === '.' ? 'Build Gradle project' : `Build Gradle project in ${directory}`,
        cwd: directory,
        phase: 'build',
      });
    }

    const rationale = ['Detected Java build manifest, so Java build workflow was inferred.'];
    if (mavenDirs.length + gradleDirs.length > 1) {
      rationale.push('Detected multiple Java modules, so per-module build steps were generated.');
    }

    return {
      providerId: this.id,
      steps,
      prerequisites: ['Java JDK'],
      confidence: steps.length > 0 ? 0.85 : 0,
      rationale,
    };
  }
}
