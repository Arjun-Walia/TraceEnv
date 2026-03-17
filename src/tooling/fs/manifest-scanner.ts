import * as fs from 'fs';
import * as path from 'path';

const KNOWN_MANIFESTS = [
  '.env.example',
  'package.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'requirements.txt',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Makefile',
];

export function scanManifests(projectRoot: string): string[] {
  return KNOWN_MANIFESTS.filter((name) => fs.existsSync(path.join(projectRoot, name)));
}
