import { InferenceContext, InferenceContribution, InferenceProvider, WorkflowStep } from '../inference/contracts.js';

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

    const steps: WorkflowStep[] = [
      {
        id: 'go-mod-download',
        command: 'go mod download',
        description: 'Download Go module dependencies',
        cwd: '.',
        phase: 'deps',
      },
      {
        id: 'go-build',
        command: 'go build ./...',
        description: 'Compile all Go packages',
        cwd: '.',
        phase: 'build',
      },
      {
        id: 'go-test-hint',
        command: 'go test ./...',
        description: 'Optional: run Go tests',
        cwd: '.',
        phase: 'test',
        continueOnError: true,
      },
    ];

    return {
      providerId: this.id,
      steps,
      prerequisites: ['Go toolchain'],
      confidence: 0.9,
      rationale: [
        'Detected go.mod, so module dependency download and build commands were inferred.',
        'Added optional go test step as a quick validation hint.',
      ],
    };
  }
}