import { InferenceContext } from '../inference/contracts.js';

/**
 * Returns unique directories containing any of the specified manifest names,
 * sorted with root (".") first, then alphabetically.
 */
export function uniqueDirectoriesFor(context: InferenceContext, manifestNames: string[]): string[] {
  const names = new Set(manifestNames);
  const collected = context.manifestEntries
    .filter((entry) => names.has(entry.name))
    .map((entry) => entry.directory || '.');

  if (collected.length === 0) {
    if (manifestNames.some((name) => context.manifests.includes(name))) {
      return ['.'];
    }
    return [];
  }

  return [...new Set(collected)].sort((a, b) => {
    if (a === '.') return -1;
    if (b === '.') return 1;
    return a.localeCompare(b);
  });
}

/**
 * Normalizes a directory path into a safe, lowercase id token.
 * Replaces sequences of non-alphanumeric characters with a single hyphen.
 */
export function normalizeIdToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'root';
}
