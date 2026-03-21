import { EnvironmentSnapshot } from '../../domain/types.js';

export function checkPrerequisites(
  declared: string[] | undefined,
  env: EnvironmentSnapshot
): { missing: string[]; present: string[] } {
  const required = declared ?? [];
  const missing: string[] = [];
  const present: string[] = [];

  for (const item of required) {
    const lower = item.toLowerCase();
    if (lower.includes('node') && env.tools.node) {
      present.push(item);
      continue;
    }
    if (lower.includes('python') && (env.tools.python || env.tools.pip)) {
      present.push(item);
      continue;
    }
    if (lower.includes('venv') && env.tools.python) {
      present.push(item);
      continue;
    }
    if (lower.includes('pip') && env.tools.pip) {
      present.push(item);
      continue;
    }
    if (lower.includes('go') && env.tools.go) {
      present.push(item);
      continue;
    }
    if (lower.includes('docker') && env.tools.docker) {
      present.push(item);
      continue;
    }
    if (lower.includes('git') && env.tools.git) {
      present.push(item);
      continue;
    }
    missing.push(item);
  }

  return { missing, present };
}
