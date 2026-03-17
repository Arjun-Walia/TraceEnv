import { EnvironmentSnapshot, WorkflowSpec } from '../domain/types.js';
import { detectEnvironment } from '../tooling/env/detector.js';
import { checkPrerequisites } from '../tooling/env/prerequisites.js';

export interface AnalysisResult {
  environment: EnvironmentSnapshot;
  missingPrerequisites: string[];
}

export class Analyzer {
  analyze(projectRoot: string, workflow: WorkflowSpec): AnalysisResult {
    const environment = detectEnvironment(projectRoot);
    const prerequisiteResult = checkPrerequisites(workflow.prerequisites, environment);

    return {
      environment,
      missingPrerequisites: prerequisiteResult.missing,
    };
  }
}
