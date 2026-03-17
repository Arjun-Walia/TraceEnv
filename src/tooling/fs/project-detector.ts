import * as fs from 'fs';
import * as path from 'path';

const ROOT_MARKERS = ['.traceenv.json', 'package.json', 'pyproject.toml', 'go.mod', '.git'];

export function detectProjectRoot(startDir: string = process.cwd()): string {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (true) {
    if (ROOT_MARKERS.some((marker) => fs.existsSync(path.join(currentDir, marker)))) {
      return currentDir;
    }
    if (currentDir === root) {
      return path.resolve(startDir);
    }
    currentDir = path.dirname(currentDir);
  }
}
