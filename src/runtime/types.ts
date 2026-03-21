export type RuntimeKind = 'node' | 'python' | 'go' | string;

export interface VersionConstraint {
  runtime: RuntimeKind;
  versionRange: string;
  source:
    | 'manifest'
    | 'lockfile'
    | 'provider-declaration'
    | 'runtime-error'
    | 'fallback-default';
  sourcePath?: string;
  rawExpression?: string;
  confidence: number;
}

export interface RuntimeRequirement {
  runtime: RuntimeKind;
  versionRange: string;
  constraints: VersionConstraint[];
  confidence: number;
}

export interface VersionConstraintResolution {
  requirements: RuntimeRequirement[];
  conflicts: Array<{
    runtime: RuntimeKind;
    reason: string;
    constraints: VersionConstraint[];
  }>;
}