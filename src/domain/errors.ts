export class TraceEnvError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'TraceEnvError';
  }
}

export class ProjectNotFoundError extends TraceEnvError {
  constructor(startDir: string) {
    super('PROJECT_NOT_FOUND', `Unable to detect a project root from: ${startDir}`);
    this.name = 'ProjectNotFoundError';
  }
}

export class WorkflowLoadError extends TraceEnvError {
  constructor(message: string) {
    super('WORKFLOW_LOAD_FAILED', message);
    this.name = 'WorkflowLoadError';
  }
}

export class ValidationError extends TraceEnvError {
  constructor(message: string) {
    super('VALIDATION_FAILED', message);
    this.name = 'ValidationError';
  }
}
