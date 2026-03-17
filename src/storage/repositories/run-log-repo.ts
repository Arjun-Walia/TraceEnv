import { StepResult } from '../../domain/types.js';
import { getSqliteClient } from '../sqlite/client.js';

export class RunLogRepository {
  startRun(runId: string, projectRoot: string): void {
    getSqliteClient()
      .prepare('INSERT INTO trace_runs (run_id, project_root, status, created_at) VALUES (?, ?, ?, ?)')
      .run(runId, projectRoot, 'running', Date.now());
  }

  completeRun(runId: string, success: boolean): void {
    getSqliteClient()
      .prepare('UPDATE trace_runs SET status = ? WHERE run_id = ?')
      .run(success ? 'success' : 'failed', runId);
  }

  logStep(runId: string, result: StepResult): void {
    getSqliteClient()
      .prepare(
        `INSERT INTO trace_run_steps (
          run_id, step_id, command, status, exit_code, duration_ms, stdout_summary, stderr_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        runId,
        result.stepId,
        result.command,
        result.status,
        result.exitCode,
        result.durationMs,
        result.stdoutSummary ?? '',
        result.stderrSummary ?? '',
        Date.now()
      );
  }
}
