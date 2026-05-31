import { InferenceContext, InferenceContribution, InferenceProvider, WorkflowStep } from '../inference/contracts.js';
import { uniqueDirectoriesFor, normalizeIdToken } from './_shared.js';

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
    const pythonDirs = uniqueDirectoriesFor(context, ['requirements.txt', 'pyproject.toml', 'Pipfile']);

    if (this.apply(context)) {
      for (const directory of pythonDirs) {
        steps.push({
          id: directory === '.' ? 'python-venv' : `python-venv-${normalizeIdToken(directory)}`,
          command: 'python -m venv .venv',
          description: directory === '.' ? 'Create a local virtual environment' : `Create virtual environment in ${directory}`,
          cwd: directory,
          phase: 'prepare',
        });
      }
      rationale.push('Python projects should isolate dependencies in a local virtual environment.');
    }

    for (const directory of uniqueDirectoriesFor(context, ['requirements.txt'])) {
      steps.push({
        id: directory === '.' ? 'pip-install-requirements' : `pip-install-requirements-${normalizeIdToken(directory)}`,
        command: 'python -m pip install -r requirements.txt',
        description:
          directory === '.'
            ? 'Install Python dependencies from requirements.txt'
            : `Install Python dependencies from ${directory}/requirements.txt`,
        cwd: directory,
        phase: 'deps',
      });
      rationale.push('Detected requirements.txt, so pip requirements installation was inferred.');
    }

    for (const directory of uniqueDirectoriesFor(context, ['pyproject.toml'])) {
      steps.push({
        id: directory === '.' ? 'pip-install-project' : `pip-install-project-${normalizeIdToken(directory)}`,
        command: 'python -m pip install .',
        description:
          directory === '.'
            ? 'Install Python project dependencies'
            : `Install Python project dependencies in ${directory}`,
        cwd: directory,
        phase: 'deps',
      });
      rationale.push('Detected pyproject.toml, so pip project install was inferred.');
    }

    for (const directory of uniqueDirectoriesFor(context, ['Pipfile'])) {
      steps.push({
        id: directory === '.' ? 'pipenv-bootstrap' : `pipenv-bootstrap-${normalizeIdToken(directory)}`,
        command: 'python -m pip install pipenv',
        description:
          directory === '.'
            ? 'Install pipenv for Pipfile-based projects'
            : `Install pipenv for Pipfile project in ${directory}`,
        cwd: directory,
        phase: 'deps',
      });
      steps.push({
        id: directory === '.' ? 'pipenv-install' : `pipenv-install-${normalizeIdToken(directory)}`,
        command: 'pipenv install',
        description: directory === '.' ? 'Install dependencies from Pipfile' : `Install dependencies from ${directory}/Pipfile`,
        cwd: directory,
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
