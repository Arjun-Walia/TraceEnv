import { InferenceContext, ProjectSignal } from './contracts.js';

export function buildProjectSignals(manifests: string[]): ProjectSignal[] {
  return manifests.map((manifest) => ({
    kind: 'manifest',
    name: manifest,
    path: manifest,
  }));
}

export function buildInferenceContext(projectRoot: string, manifests: string[]): InferenceContext {
  return {
    projectRoot,
    manifests,
    signals: buildProjectSignals(manifests),
  };
}