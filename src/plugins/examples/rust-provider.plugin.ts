import { InferenceContext, InferenceProvider, WorkflowStep } from '../../intelligence/inference/contracts.js';
import { ProviderPlugin } from '../../intelligence/plugins/contracts.js';

class RustProvider implements InferenceProvider {
  readonly id = 'rust';
  readonly priority = 140;

  apply(context: InferenceContext): boolean {
    return context.manifests.includes('Cargo.toml');
  }

  infer(context: InferenceContext) {
    const steps: WorkflowStep[] = [];

    if (context.manifests.includes('Cargo.toml')) {
      steps.push({
        id: 'cargo-build',
        command: 'cargo build',
        description: 'Build Rust project',
        cwd: '.',
        phase: 'build',
      });
      steps.push({
        id: 'cargo-test',
        command: 'cargo test',
        description: 'Run Rust tests',
        cwd: '.',
        phase: 'test',
        continueOnError: true,
      });
    }

    return {
      providerId: this.id,
      steps,
      prerequisites: ['Rust toolchain'],
      confidence: steps.length > 0 ? 0.88 : 0,
      rationale: ['Detected Cargo.toml, so cargo build/test workflow was inferred.'],
    };
  }
}

const plugin: ProviderPlugin = {
  id: 'traceenv-plugin-rust',
  version: '1.0.0',
  coreApiVersion: '1.0.0',
  priority: 140,
  createProvider(): InferenceProvider {
    return new RustProvider();
  },
};

export default plugin;