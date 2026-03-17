import * as fs from 'fs';
import * as path from 'path';
import { WorkflowSpec } from '../../domain/types.js';
import { WorkflowLoadError } from '../../domain/errors.js';

const METADATA_FILE = '.traceenv.json';

export function metadataPath(projectRoot: string): string {
  return path.join(projectRoot, METADATA_FILE);
}

export function loadWorkflowSpec(projectRoot: string): WorkflowSpec | null {
  const filePath = metadataPath(projectRoot);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      version: string;
      workflow: Array<{
        command: string;
        cwd?: string;
        description?: string;
        timeoutMs?: number;
        retryCount?: number;
        continueOnError?: boolean;
      }>;
      prerequisites?: string[];
      estimatedTime?: string;
      validationRules?: WorkflowSpec['validationRules'];
      rollbackRules?: WorkflowSpec['rollbackRules'];
    };

    if (!parsed.version || !Array.isArray(parsed.workflow)) {
      throw new Error('Expected version and workflow[] fields.');
    }

    return {
      version: parsed.version,
      prerequisites: parsed.prerequisites,
      estimatedTime: parsed.estimatedTime,
      validationRules: parsed.validationRules,
      rollbackRules: parsed.rollbackRules,
      steps: parsed.workflow.map((step, index) => ({
        id: `step-${index + 1}`,
        command: step.command,
        cwd: step.cwd,
        description: step.description,
        timeoutMs: step.timeoutMs,
        retryCount: step.retryCount,
        continueOnError: step.continueOnError,
      })),
    };
  } catch (error) {
    throw new WorkflowLoadError(
      `Failed to load ${METADATA_FILE}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
