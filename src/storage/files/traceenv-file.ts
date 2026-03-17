import { WorkflowSpec } from '../../domain/types.js';
import { loadWorkflowSpec, metadataPath } from '../../tooling/fs/metadata-loader.js';

export function loadTraceEnvFile(projectRoot: string): WorkflowSpec | null {
  return loadWorkflowSpec(projectRoot);
}

export function getTraceEnvFilePath(projectRoot: string): string {
  return metadataPath(projectRoot);
}
