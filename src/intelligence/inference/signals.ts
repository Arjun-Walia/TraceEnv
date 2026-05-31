import { InferenceContext, ProjectSignal } from './contracts.js';
import { ManifestEntry } from '../../tooling/fs/manifest-scanner.js';

export function buildProjectSignals(manifests: string[], manifestEntries: ManifestEntry[]): ProjectSignal[] {
  if (manifestEntries.length > 0) {
    return manifestEntries.map((entry) => ({
      kind: 'manifest',
      name: entry.name,
      path: entry.relativePath,
    }));
  }

  return manifests.map((manifest) => ({
    kind: 'manifest',
    name: manifest,
    path: manifest,
  }));
}

export function buildInferenceContext(
  projectRoot: string,
  manifests: string[],
  manifestEntries: ManifestEntry[] = []
): InferenceContext {
  return {
    projectRoot,
    manifests,
    manifestEntries,
    signals: buildProjectSignals(manifests, manifestEntries),
  };
}
