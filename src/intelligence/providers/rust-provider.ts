import { InferenceContext, InferenceContribution, InferenceProvider, WorkflowStep } from '../inference/contracts.js';
import { uniqueDirectoriesFor, normalizeIdToken } from './_shared.js';

export class RustProvider implements InferenceProvider {
  readonly id = 'rust';
  readonly priority = 140;

  apply(context: InferenceContext): boolean {
    return context.manifests.includes('Cargo.toml');
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

    const rustDirs = uniqueDirectoriesFor(context, ['Cargo.toml']);
    const steps: WorkflowStep[] = [];

    for (const directory of rustDirs) {
      const suffix = directory === '.' ? '' : `-${normalizeIdToken(directory)}`;
      steps.push(
        {
          id: `cargo-build${suffix}`,
          command: 'cargo build',
          description: directory === '.' ? 'Build Rust project' : `Build Rust project in ${directory}`,
          cwd: directory,
          phase: 'build',
        },
        {
          id: `cargo-test${suffix}`,
          command: 'cargo test',
          description: directory === '.' ? 'Run Rust tests' : `Run Rust tests in ${directory}`,
          cwd: directory,
          phase: 'test',
          continueOnError: true,
        }
      );
    }

    const rationale = ['Detected Cargo.toml, so cargo build/test workflow was inferred.'];
    if (rustDirs.length > 1 || (rustDirs.length === 1 && rustDirs[0] !== '.')) {
      rationale.push('Detected multiple Cargo.toml files, so per-package steps were generated.');
    }

    return {
      providerId: this.id,
      steps,
      prerequisites: ['Rust toolchain'],
      confidence: 0.88,
      rationale,
    };
  }
}
