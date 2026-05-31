import { InferenceContext, InferenceContribution, InferenceProvider, WorkflowStep } from '../inference/contracts.js';
import { uniqueDirectoriesFor, normalizeIdToken } from './_shared.js';

export class GoProvider implements InferenceProvider {
  readonly id = 'go';
  readonly priority = 120;

  apply(context: InferenceContext): boolean {
    return context.manifests.includes('go.mod');
  }

  infer(context: InferenceContext): InferenceContribution {
    if (!context.manifests.includes('go.mod')) {
      return {
        providerId: this.id,
        steps: [],
        prerequisites: [],
        confidence: 0,
        rationale: [],
      };
    }

    const goDirs = uniqueDirectoriesFor(context, ['go.mod']);

    const steps: WorkflowStep[] = [];
    for (const directory of goDirs) {
      const suffix = directory === '.' ? '' : `-${normalizeIdToken(directory)}`;
      steps.push(
        {
          id: `go-mod-download${suffix}`,
          command: 'go mod download',
          description: directory === '.' ? 'Download Go module dependencies' : `Download Go dependencies in ${directory}`,
          cwd: directory,
          phase: 'deps',
        },
        {
          id: `go-build${suffix}`,
          command: 'go build ./...',
          description: directory === '.' ? 'Compile all Go packages' : `Compile Go packages in ${directory}`,
          cwd: directory,
          phase: 'build',
        },
        {
          id: `go-test-hint${suffix}`,
          command: 'go test ./...',
          description: directory === '.' ? 'Optional: run Go tests' : `Optional: run Go tests in ${directory}`,
          cwd: directory,
          phase: 'test',
          continueOnError: true,
        }
      );
    }

    const rationale = [
      'Detected go.mod, so module dependency download and build commands were inferred.',
      'Added optional go test step as a quick validation hint.',
    ];
    if (goDirs.length > 1 || (goDirs.length === 1 && goDirs[0] !== '.')) {
      rationale.push('Detected multiple go.mod files, so per-module commands were generated.');
    }

    return {
      providerId: this.id,
      steps,
      prerequisites: ['Go toolchain'],
      confidence: 0.9,
      rationale,
    };
  }
}
