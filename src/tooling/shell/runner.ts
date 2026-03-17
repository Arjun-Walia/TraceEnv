import * as child_process from 'child_process';

export interface CommandRunInput {
  command: string;
  cwd: string;
  timeoutMs: number;
}

export interface CommandRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

function transformForPlatform(command: string): { transformed: string; note?: string } {
  if (process.platform !== 'win32') {
    return { transformed: command };
  }

  if (command.startsWith('cp ')) {
    return { transformed: command.replace(/^cp\s+/, 'copy '), note: 'cp->copy' };
  }
  if (command.startsWith('rm -rf ')) {
    return { transformed: command.replace(/^rm -rf\s+/, 'rmdir /s /q '), note: 'rm -rf->rmdir /s /q' };
  }
  if (command.startsWith('rm ') && !command.includes('-')) {
    return { transformed: command.replace(/^rm\s+/, 'del '), note: 'rm->del' };
  }
  if (command.startsWith('cat ')) {
    return { transformed: command.replace(/^cat\s+/, 'type '), note: 'cat->type' };
  }

  return { transformed: command };
}

export function normalizeCommand(command: string): { command: string; transform?: string } {
  const mapped = transformForPlatform(command);
  return { command: mapped.transformed, transform: mapped.note };
}

export function runCommand(input: CommandRunInput): Promise<CommandRunResult> {
  const normalized = normalizeCommand(input.command);
  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
  const shellArg = process.platform === 'win32' ? '/c' : '-c';

  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';

    const proc = child_process.spawn(shell, [shellArg, normalized.command], {
      cwd: input.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: input.timeoutMs,
    });

    proc.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - started,
      });
    });

    proc.on('error', (error) => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: error.message,
        durationMs: Date.now() - started,
      });
    });
  });
}
