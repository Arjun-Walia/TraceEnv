import { ExecutionFeedback, FailureKind } from '../domain/types.js';

function classifyFailure(command: string, stderr: string, exitCode: number): FailureKind {
  const text = `${command}\n${stderr}`.toLowerCase();

  if (text.includes('not recognized as an internal or external command') || text.includes('command not found')) {
    return 'missing-command';
  }
  if (text.includes('no such file') || text.includes('cannot find the file') || text.includes('enoent')) {
    return 'missing-file';
  }
  if (text.includes('permission denied') || text.includes('access is denied') || exitCode === 126) {
    return 'permission';
  }
  if (text.includes('eai_again') || text.includes('network') || text.includes('timed out') || text.includes('registry')) {
    return 'network';
  }
  if (text.includes('timeout') || exitCode === 124) {
    return 'timeout';
  }
  if (text.includes('docker') || text.includes('service') || text.includes('compose')) {
    return 'service';
  }

  return 'unknown';
}

function suggestionFor(kind: FailureKind, command: string): string {
  switch (kind) {
    case 'missing-command':
      return `Install the tool required by \"${command}\" or update the workflow to use a command available on this machine.`;
    case 'missing-file':
      return 'Check the working directory and ensure prerequisite files such as .env.example or package manifests exist before this step runs.';
    case 'permission':
      return 'Check file permissions, shell privileges, or whether this command should be run without elevated access.';
    case 'network':
      return 'Retry when network access is available, or switch to cached/local dependencies if TraceEnv is meant to run offline.';
    case 'timeout':
      return 'Increase the step timeout or split the step into smaller commands with clearer checkpoints.';
    case 'service':
      return 'Verify the required service is installed and running before this step. For Docker workflows, ensure Docker Desktop or the daemon is started.';
    default:
      return 'Inspect the command output, fix the failing prerequisite, and rerun trace. Consider recording a more explicit workflow if this step is ambiguous.';
  }
}

function retriable(kind: FailureKind): boolean {
  return kind === 'network' || kind === 'service' || kind === 'timeout';
}

export function buildExecutionFeedback(command: string, stderr: string, exitCode: number): ExecutionFeedback {
  const failureKind = classifyFailure(command, stderr, exitCode);
  return {
    failureKind,
    retriable: retriable(failureKind),
    suggestion: suggestionFor(failureKind, command),
  };
}
