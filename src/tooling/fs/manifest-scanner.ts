import * as fs from 'fs';
import * as path from 'path';

const KNOWN_MANIFESTS = [
  '.env.example',
  '.nvmrc',
  '.node-version',
  'package.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'go.mod',
  'go.sum',
  'Cargo.toml',
  'Cargo.lock',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Gemfile',
  'Gemfile.lock',
  'composer.json',
  'composer.lock',
  'Package.swift',
  'Package.resolved',
  '*.csproj',
  '*.sln',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Makefile',
];

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  '.nuxt',
  '.turbo',
  '.yarn',
  'dist',
  'build',
  'target',
  'out',
  'coverage',
  '.venv',
  'venv',
  '.rbenv',
  '.bundle',
  'vendor',
  '.build',
]);

export interface ManifestEntry {
  name: string;
  path: string;
  relativePath: string;
  directory: string;
  depth: number;
}

export function scanManifests(projectRoot: string): string[] {
  const entries = scanManifestEntries(projectRoot);
  const byName = new Set(entries.map((entry) => entry.name));
  return [...byName].sort((a, b) => a.localeCompare(b));
}

export function scanManifestEntries(projectRoot: string, maxDepth = 4): ManifestEntry[] {
  const root = path.resolve(projectRoot);
  const entries: ManifestEntry[] = [];

  walk(root, 0);

  entries.sort((a, b) => {
    const depthDiff = a.depth - b.depth;
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return a.relativePath.localeCompare(b.relativePath);
  });

  return entries;

  function walk(directory: string, depth: number): void {
    if (depth > maxDepth) {
      return;
    }

    let dirEntries: fs.Dirent[];
    try {
      dirEntries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    const names = new Set(dirEntries.map((entry) => entry.name));
    for (const manifestName of KNOWN_MANIFESTS) {
      if (manifestName.startsWith('*.')) {
        const ext = manifestName.slice(1);
        for (const entryName of names) {
          if (entryName.endsWith(ext)) {
            recordManifest(entryName, directory, depth);
          }
        }
        continue;
      }

      if (!names.has(manifestName)) {
        continue;
      }

      recordManifest(manifestName, directory, depth);
    }

    for (const child of dirEntries) {
      if (!child.isDirectory()) {
        continue;
      }

      if (IGNORED_DIRECTORIES.has(child.name)) {
        continue;
      }

      walk(path.join(directory, child.name), depth + 1);
    }
  }

  function recordManifest(manifestName: string, directory: string, depth: number): void {
    const absolutePath = path.join(directory, manifestName);
    const relativePath = path.relative(root, absolutePath) || manifestName;
    const relativeDirectory = path.relative(root, directory) || '.';

    entries.push({
      name: manifestName,
      path: absolutePath,
      relativePath: toPortablePath(relativePath),
      directory: toPortablePath(relativeDirectory),
      depth,
    });
  }
}

function toPortablePath(value: string): string {
  return value.replace(/\\/g, '/');
}
