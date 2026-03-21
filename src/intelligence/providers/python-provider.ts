import { InferenceContext, InferenceContribution, InferenceProvider, WorkflowStep } from '../inference/contracts.js';

export class PythonProvider implements InferenceProvider {
  readonly id = 'python';
  readonly priority = 110;

  apply(context: InferenceContext): boolean {
    return (
      context.manifests.includes('requirements.txt') ||
      context.manifests.includes('pyproject.toml') ||
      context.manifests.includes('Pipfile')
    );
  }

  infer(context: InferenceContext): InferenceContribution {
    const steps: WorkflowStep[] = [];
    const rationale: string[] = [];

    if (this.apply(context)) {
      steps.push({
        id: 'python-venv',
        command: 'python -m venv .venv',
        description: 'Create a local virtual environment',
        cwd: '.',
        phase: 'prepare',
      });
      rationale.push('Python projects should isolate dependencies in a local virtual environment.');
    }

    if (context.manifests.includes('requirements.txt')) {
      steps.push({
        id: 'pip-install-requirements',
        command: 'python -m pip install -r requirements.txt',
        description: 'Install Python dependencies from requirements.txt',
        cwd: '.',
        phase: 'deps',
      });
      rationale.push('Detected requirements.txt, so pip requirements installation was inferred.');
    }

    if (context.manifests.includes('pyproject.toml')) {
      steps.push({
        id: 'pip-install-project',
        command: 'python -m pip install .',
        description: 'Install Python project dependencies',
        cwd: '.',
        phase: 'deps',
      });
      rationale.push('Detected pyproject.toml, so pip project install was inferred.');
    }

    if (context.manifests.includes('Pipfile')) {
      steps.push({
        id: 'pipenv-bootstrap',
        command: 'python -m pip install pipenv',
        description: 'Install pipenv for Pipfile-based projects',
        cwd: '.',
        phase: 'deps',
      });
      steps.push({
        id: 'pipenv-install',
        command: 'pipenv install',
        description: 'Install dependencies from Pipfile',
        cwd: '.',
        phase: 'deps',
      });
      rationale.push('Detected Pipfile, so pipenv-based dependency installation was inferred.');
    }

    steps.push({
      id: 'python-test-hint',
      command: 'python -m pytest',
      description: 'Optional: run Python tests if test dependencies are present',
      cwd: '.',
      phase: 'test',
      continueOnError: true,
    });

    steps.push({
      id: 'python-run-hint',
      command: 'python main.py',
      description: 'Optional: run the default Python entrypoint if available',
      cwd: '.',
      phase: 'run',
      continueOnError: true,
    });
    rationale.push('Added optional test/run hints to accelerate first local validation.');

    return {
      providerId: this.id,
      steps,
      prerequisites: ['Python 3.x', 'pip', 'venv'],
      confidence: steps.length > 0 ? 0.9 : 0,
      rationale,
    };
  }
}