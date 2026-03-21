import { WorkflowSpec } from '../domain/types.js';

interface ManifestHint {
  manifest: string;
  hints: string[];
  suggestedCommands: string[];
  prerequisites: string[];
}

const MANIFEST_HINTS: ManifestHint[] = [
  {
    manifest: 'package.json',
    hints: ['Node.js project detected from package.json.'],
    suggestedCommands: ['npm install', 'npm run dev'],
    prerequisites: ['Node.js 18+', 'npm'],
  },
  {
    manifest: 'pnpm-lock.yaml',
    hints: ['pnpm lockfile detected.'],
    suggestedCommands: ['pnpm install', 'pnpm dev'],
    prerequisites: ['Node.js 18+', 'pnpm'],
  },
  {
    manifest: 'yarn.lock',
    hints: ['Yarn lockfile detected.'],
    suggestedCommands: ['yarn install', 'yarn dev'],
    prerequisites: ['Node.js 18+', 'yarn'],
  },
  {
    manifest: 'requirements.txt',
    hints: ['Python dependency list detected in requirements.txt.'],
    suggestedCommands: ['python -m venv .venv', 'python -m pip install -r requirements.txt'],
    prerequisites: ['Python 3.x', 'pip', 'venv'],
  },
  {
    manifest: 'pyproject.toml',
    hints: ['Python project metadata detected in pyproject.toml.'],
    suggestedCommands: ['python -m venv .venv', 'python -m pip install .'],
    prerequisites: ['Python 3.x', 'pip', 'venv'],
  },
  {
    manifest: 'Pipfile',
    hints: ['Pipfile detected for pipenv dependency management.'],
    suggestedCommands: ['python -m pip install pipenv', 'pipenv install'],
    prerequisites: ['Python 3.x', 'pip'],
  },
  {
    manifest: 'go.mod',
    hints: ['Go module detected from go.mod.'],
    suggestedCommands: ['go mod download', 'go build ./...'],
    prerequisites: ['Go toolchain'],
  },
  {
    manifest: 'docker-compose.yml',
    hints: ['Docker Compose stack detected.'],
    suggestedCommands: ['docker compose up -d'],
    prerequisites: ['Docker'],
  },
  {
    manifest: 'docker-compose.yaml',
    hints: ['Docker Compose stack detected.'],
    suggestedCommands: ['docker compose up -d'],
    prerequisites: ['Docker'],
  },
  {
    manifest: 'Cargo.toml',
    hints: ['Rust project metadata detected in Cargo.toml.'],
    suggestedCommands: ['cargo build', 'cargo test'],
    prerequisites: ['Rust toolchain'],
  },
  {
    manifest: 'Makefile',
    hints: ['Makefile detected; project likely has task aliases.'],
    suggestedCommands: ['make setup', 'make dev'],
    prerequisites: ['make'],
  },
];

export function createPartialWorkflow(projectRoot: string, manifests: string[]): WorkflowSpec {
  const detected = MANIFEST_HINTS.filter((item) => manifests.includes(item.manifest));
  const hints = dedupe(detected.flatMap((item) => item.hints));
  const suggestedCommands = dedupe(detected.flatMap((item) => item.suggestedCommands));
  const prerequisites = dedupe(detected.flatMap((item) => item.prerequisites));

  const confidence = Math.min(100, Math.max(15, manifests.length * 12 + suggestedCommands.length * 8));

  return {
    version: '1.0.0',
    steps: [
      {
        id: 'partial-inference-info',
        command: 'echo "TraceEnv partial inference: review suggested setup commands before continuing."',
        description: 'Partial inference mode: no complete workflow could be generated automatically.',
      },
    ],
    prerequisites,
    estimatedTime: 'Manual review required',
    inference: {
      mode: 'partial',
      confidence,
      signals: manifests,
      missingPieces: [
        'Project-specific start/build/test conventions',
        'Service dependency ordering',
        'Exact command arguments and environment variables',
      ],
      suggestedCommands,
      manifestHints: hints,
      recommendation: `Create ${projectRoot}/.traceenv.json to define an exact reproducible workflow.`,
    },
  };
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}