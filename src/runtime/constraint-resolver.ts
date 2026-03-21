import * as fs from 'fs';
import * as path from 'path';
import { VersionConstraint, VersionConstraintResolution } from './types.js';
import { intersectRanges, normalizeRange } from './version-range.js';

export class VersionConstraintResolver {
  resolve(projectRoot: string, runtimeErrors: string[] = []): VersionConstraintResolution {
    const constraints: VersionConstraint[] = [
      ...this.fromNode(projectRoot),
      ...this.fromPython(projectRoot),
      ...this.fromGo(projectRoot),
      ...this.fromRuntimeErrors(runtimeErrors),
    ];

    const grouped = new Map<string, VersionConstraint[]>();
    for (const constraint of constraints) {
      const items = grouped.get(constraint.runtime) ?? [];
      items.push(constraint);
      grouped.set(constraint.runtime, items);
    }

    const requirements: VersionConstraintResolution['requirements'] = [];
    const conflicts: VersionConstraintResolution['conflicts'] = [];

    for (const [runtime, items] of grouped.entries()) {
      const ordered = [...items].sort((a, b) => b.confidence - a.confidence);
      let merged = normalizeRange(ordered[0].versionRange);

      for (let i = 1; i < ordered.length; i++) {
        const next = normalizeRange(ordered[i].versionRange);
        const intersected = intersectRanges(merged, next);
        if (!intersected) {
          conflicts.push({
            runtime,
            reason: `Unsatisfiable version constraints: ${merged} and ${next}`,
            constraints: ordered,
          });
          merged = normalizeRange(ordered[0].versionRange);
          break;
        }
        merged = intersected;
      }

      const confidence = Math.round(ordered.reduce((sum, item) => sum + item.confidence, 0) / ordered.length);
      requirements.push({
        runtime,
        versionRange: merged,
        constraints: ordered,
        confidence,
      });
    }

    requirements.sort((a, b) => a.runtime.localeCompare(b.runtime));
    conflicts.sort((a, b) => a.runtime.localeCompare(b.runtime));

    return {
      requirements,
      conflicts,
    };
  }

  private fromNode(projectRoot: string): VersionConstraint[] {
    const constraints: VersionConstraint[] = [];
    const packageJsonPath = path.join(projectRoot, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
          engines?: { node?: string };
        };
        const nodeRange = json.engines?.node;
        if (nodeRange && nodeRange.trim().length > 0) {
          constraints.push({
            runtime: 'node',
            versionRange: normalizeRange(nodeRange),
            source: 'manifest',
            sourcePath: 'package.json',
            rawExpression: nodeRange,
            confidence: 95,
          });
        }
      } catch {
        // Ignore malformed manifest and continue deterministic scanning.
      }
    }

    for (const fileName of ['.nvmrc', '.node-version']) {
      const filePath = path.join(projectRoot, fileName);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const value = fs.readFileSync(filePath, 'utf-8').trim().replace(/^v/i, '');
      if (!value) {
        continue;
      }

      constraints.push({
        runtime: 'node',
        versionRange: normalizeRange(value),
        source: 'manifest',
        sourcePath: fileName,
        rawExpression: value,
        confidence: 92,
      });
    }

    return constraints;
  }

  private fromPython(projectRoot: string): VersionConstraint[] {
    const constraints: VersionConstraint[] = [];

    const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      const content = fs.readFileSync(pyprojectPath, 'utf-8');
      const requiresPython = content.match(/requires-python\s*=\s*['\"]([^'\"]+)['\"]/i)?.[1];
      if (requiresPython) {
        constraints.push({
          runtime: 'python',
          versionRange: normalizeRange(requiresPython),
          source: 'manifest',
          sourcePath: 'pyproject.toml',
          rawExpression: requiresPython,
          confidence: 96,
        });
      }
    }

    const pipfilePath = path.join(projectRoot, 'Pipfile');
    if (fs.existsSync(pipfilePath)) {
      const content = fs.readFileSync(pipfilePath, 'utf-8');
      const pythonVersion =
        content.match(/python_full_version\s*=\s*['\"]([^'\"]+)['\"]/i)?.[1] ??
        content.match(/python_version\s*=\s*['\"]([^'\"]+)['\"]/i)?.[1];
      if (pythonVersion) {
        constraints.push({
          runtime: 'python',
          versionRange: normalizeRange(pythonVersion),
          source: 'manifest',
          sourcePath: 'Pipfile',
          rawExpression: pythonVersion,
          confidence: 90,
        });
      }
    }

    const requirementsPath = path.join(projectRoot, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      const lines = fs.readFileSync(requirementsPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        const marker = line.match(/python_version\s*([<>=!~]{1,2})\s*['\"]([^'\"]+)['\"]/i);
        if (!marker) {
          continue;
        }
        const operator = marker[1];
        const version = marker[2];
        constraints.push({
          runtime: 'python',
          versionRange: normalizeRange(`${operator}${version}`),
          source: 'manifest',
          sourcePath: 'requirements.txt',
          rawExpression: marker[0],
          confidence: 75,
        });
      }
    }

    return constraints;
  }

  private fromGo(projectRoot: string): VersionConstraint[] {
    const goModPath = path.join(projectRoot, 'go.mod');
    if (!fs.existsSync(goModPath)) {
      return [];
    }

    const content = fs.readFileSync(goModPath, 'utf-8');
    const goDirective = content.match(/^go\s+([0-9]+(?:\.[0-9]+){1,2})\s*$/m)?.[1];
    if (!goDirective) {
      return [];
    }

    return [
      {
        runtime: 'go',
        versionRange: normalizeRange(goDirective),
        source: 'manifest',
        sourcePath: 'go.mod',
        rawExpression: goDirective,
        confidence: 95,
      },
    ];
  }

  private fromRuntimeErrors(errors: string[]): VersionConstraint[] {
    const constraints: VersionConstraint[] = [];

    for (const error of errors) {
      const pythonRange = error.match(/Requires-Python\s*([<>=!,.0-9\s]+)/i)?.[1]?.trim();
      if (pythonRange) {
        constraints.push({
          runtime: 'python',
          versionRange: normalizeRange(pythonRange.replace(/\s+/g, '')),
          source: 'runtime-error',
          rawExpression: pythonRange,
          confidence: 85,
        });
      }

      const nodeRange = error.match(/(?:engines\.node|node version)\s*[:=]\s*([<>=^~0-9.\s,]+)/i)?.[1]?.trim();
      if (nodeRange) {
        constraints.push({
          runtime: 'node',
          versionRange: normalizeRange(nodeRange),
          source: 'runtime-error',
          rawExpression: nodeRange,
          confidence: 70,
        });
      }

      const goRange = error.match(/requires go(?: version)?\s*([<>=^~0-9.\s,]+)/i)?.[1]?.trim();
      if (goRange) {
        constraints.push({
          runtime: 'go',
          versionRange: normalizeRange(goRange),
          source: 'runtime-error',
          rawExpression: goRange,
          confidence: 70,
        });
      }
    }

    return constraints;
  }
}