import * as fs from 'fs';
import * as path from 'path';

export type KnownTool =
  | 'node'
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'python'
  | 'pip'
  | 'venv'
  | 'go'
  | 'docker'
  | 'docker-compose'
  | 'git';

export interface ToolCapability {
  tool: KnownTool;
  version: string | null;
  available: boolean;
  source: 'runtime' | 'path-scan' | 'derived';
  executablePath?: string;
}

export interface Requirement {
  id: string;
  type: 'tool' | 'tool-group';
  raw: string;
  tool?: KnownTool;
  anyOf?: KnownTool[];
  minVersion?: string;
  optional?: boolean;
}

export interface RemediationStep {
  kind: 'install-tool' | 'install-group';
  requirementId: string;
  tools: KnownTool[];
  commands: Partial<Record<'win32' | 'linux' | 'darwin', string[]>>;
}

export interface RequirementResolution {
  requirement: Requirement;
  satisfied: boolean;
  matchedCapabilities: ToolCapability[];
  missingTools: KnownTool[];
  remediation: RemediationStep[];
}

export interface CapabilityResolutionResult {
  capabilities: ToolCapability[];
  resolutions: RequirementResolution[];
  missing: RequirementResolution[];
  present: RequirementResolution[];
}

const TOOL_EXECUTABLES: Record<KnownTool, string[]> = {
  node: ['node'],
  npm: ['npm'],
  pnpm: ['pnpm'],
  yarn: ['yarn'],
  python: ['python', 'python3', 'py'],
  pip: ['pip', 'pip3'],
  venv: [],
  go: ['go'],
  docker: ['docker'],
  'docker-compose': ['docker-compose'],
  git: ['git'],
};

const TOOL_ORDER: KnownTool[] = [
  'node',
  'npm',
  'pnpm',
  'yarn',
  'python',
  'pip',
  'venv',
  'go',
  'docker',
  'docker-compose',
  'git',
];

function getPathEntries(): string[] {
  const value = process.env.PATH ?? '';
  const delimiter = process.platform === 'win32' ? ';' : ':';
  return value
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getWindowsExtensions(): string[] {
  if (process.platform !== 'win32') {
    return [''];
  }

  const raw = process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM';
  const values = raw
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.toLowerCase());

  return ['', ...values];
}

function findExecutable(candidates: string[]): string | null {
  const entries = getPathEntries();
  const extensions = getWindowsExtensions();

  for (const dir of entries) {
    for (const candidate of candidates) {
      const hasExplicitExtension = path.extname(candidate).length > 0;
      const suffixes = hasExplicitExtension ? [''] : extensions;

      for (const suffix of suffixes) {
        const fullPath = path.join(dir, `${candidate}${suffix}`);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    }
  }

  return null;
}

function detectDirectCapability(tool: KnownTool): ToolCapability {
  if (tool === 'node') {
    return {
      tool,
      version: `v${process.versions.node}`,
      available: true,
      source: 'runtime',
      executablePath: process.execPath,
    };
  }

  if (tool === 'venv') {
    return {
      tool,
      version: null,
      available: false,
      source: 'derived',
    };
  }

  const executablePath = findExecutable(TOOL_EXECUTABLES[tool]);
  return {
    tool,
    version: null,
    available: executablePath !== null,
    source: 'path-scan',
    executablePath: executablePath ?? undefined,
  };
}

export function detectToolCapabilities(): ToolCapability[] {
  const discovered = TOOL_ORDER.map(detectDirectCapability);
  const python = discovered.find((item) => item.tool === 'python');

  return discovered.map((capability) => {
    if (capability.tool !== 'venv') {
      return capability;
    }

    return {
      ...capability,
      available: Boolean(python?.available),
    };
  });
}

export function parseRequirements(declared: string[] | undefined): Requirement[] {
  const rawItems = declared ?? [];

  return rawItems.map((raw, index) => {
    const lower = raw.toLowerCase();

    if (lower.includes('docker compose')) {
      return {
        id: `req-${index + 1}`,
        type: 'tool-group',
        raw,
        anyOf: ['docker-compose', 'docker'],
      } as Requirement;
    }

    if (lower.includes('node')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'node' };
    }
    if (lower.includes('npm')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'npm' };
    }
    if (lower.includes('pnpm')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'pnpm' };
    }
    if (lower.includes('yarn')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'yarn' };
    }
    if (lower.includes('python')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'python' };
    }
    if (lower.includes('pip')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'pip' };
    }
    if (lower.includes('venv')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'venv' };
    }
    if (lower.includes('go')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'go' };
    }
    if (lower.includes('docker')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'docker' };
    }
    if (lower.includes('git')) {
      return { id: `req-${index + 1}`, type: 'tool', raw, tool: 'git' };
    }

    return {
      id: `req-${index + 1}`,
      type: 'tool-group',
      raw,
      anyOf: [],
    };
  });
}

function remediationForTool(requirementId: string, tool: KnownTool): RemediationStep {
  const common: Partial<Record<'win32' | 'linux' | 'darwin', string[]>> = {
    win32: [],
    linux: [],
    darwin: [],
  };

  switch (tool) {
    case 'node':
      common.win32 = ['winget install OpenJS.NodeJS.LTS'];
      common.linux = ['sudo apt-get install -y nodejs npm'];
      common.darwin = ['brew install node'];
      break;
    case 'npm':
      common.win32 = ['Install Node.js LTS (includes npm)'];
      common.linux = ['sudo apt-get install -y npm'];
      common.darwin = ['brew install node'];
      break;
    case 'pnpm':
      common.win32 = ['npm install -g pnpm'];
      common.linux = ['npm install -g pnpm'];
      common.darwin = ['npm install -g pnpm'];
      break;
    case 'yarn':
      common.win32 = ['npm install -g yarn'];
      common.linux = ['npm install -g yarn'];
      common.darwin = ['npm install -g yarn'];
      break;
    case 'python':
      common.win32 = ['winget install Python.Python.3'];
      common.linux = ['sudo apt-get install -y python3'];
      common.darwin = ['brew install python'];
      break;
    case 'pip':
      common.win32 = ['python -m ensurepip --upgrade'];
      common.linux = ['sudo apt-get install -y python3-pip'];
      common.darwin = ['python3 -m ensurepip --upgrade'];
      break;
    case 'venv':
      common.win32 = ['Ensure Python 3.x is installed (venv is bundled)'];
      common.linux = ['sudo apt-get install -y python3-venv'];
      common.darwin = ['Ensure Python 3.x from Homebrew is installed'];
      break;
    case 'go':
      common.win32 = ['winget install GoLang.Go'];
      common.linux = ['sudo apt-get install -y golang-go'];
      common.darwin = ['brew install go'];
      break;
    case 'docker':
      common.win32 = ['winget install Docker.DockerDesktop'];
      common.linux = ['sudo apt-get install -y docker.io'];
      common.darwin = ['brew install --cask docker'];
      break;
    case 'docker-compose':
      common.win32 = ['Install Docker Desktop (includes Compose v2)'];
      common.linux = ['sudo apt-get install -y docker-compose-plugin'];
      common.darwin = ['Install Docker Desktop (includes Compose v2)'];
      break;
    case 'git':
      common.win32 = ['winget install Git.Git'];
      common.linux = ['sudo apt-get install -y git'];
      common.darwin = ['brew install git'];
      break;
  }

  return {
    kind: 'install-tool',
    requirementId,
    tools: [tool],
    commands: common,
  };
}

export function resolveRequirements(
  requirements: Requirement[],
  capabilities: ToolCapability[]
): CapabilityResolutionResult {
  const capabilityByTool = new Map<KnownTool, ToolCapability>();
  for (const capability of capabilities) {
    capabilityByTool.set(capability.tool, capability);
  }

  const resolutions: RequirementResolution[] = requirements.map((requirement) => {
    const requestedTools: KnownTool[] =
      requirement.type === 'tool'
        ? (requirement.tool ? [requirement.tool] : [])
        : (requirement.anyOf ?? []);

    const matchedCapabilities = requestedTools
      .map((tool) => capabilityByTool.get(tool))
      .filter((item): item is ToolCapability => Boolean(item));

    let satisfied = false;
    let missingTools: KnownTool[] = [];

    if (requirement.type === 'tool') {
      const requiredTool = requestedTools[0];
      const capability = requiredTool ? capabilityByTool.get(requiredTool) : undefined;
      satisfied = Boolean(capability?.available);
      missingTools = satisfied || !requiredTool ? [] : [requiredTool];
    } else {
      if (requestedTools.length === 0) {
        satisfied = false;
        missingTools = [];
      } else {
        satisfied = requestedTools.some((tool) => capabilityByTool.get(tool)?.available);
        missingTools = satisfied ? [] : [...requestedTools];
      }
    }

    const remediation = missingTools.map((tool) => remediationForTool(requirement.id, tool));

    return {
      requirement,
      satisfied,
      matchedCapabilities,
      missingTools,
      remediation,
    };
  });

  return {
    capabilities,
    resolutions,
    missing: resolutions.filter((resolution) => !resolution.satisfied),
    present: resolutions.filter((resolution) => resolution.satisfied),
  };
}

export function resolveDeclaredRequirements(declared: string[] | undefined): CapabilityResolutionResult {
  const requirements = parseRequirements(declared);
  const capabilities = detectToolCapabilities();
  return resolveRequirements(requirements, capabilities);
}