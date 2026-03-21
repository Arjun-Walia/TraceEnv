import { ExecutionRunState, StepResult } from '../../domain/types.js';
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

  startRunState(args: {
    runId: string;
    projectRoot: string;
    planSignature: string;
    resumedFromRunId?: string;
  }): void {
    getSqliteClient()
      .prepare(
        `INSERT INTO trace_run_state (
          run_id, project_root, plan_signature, status, resumed_from_run_id, last_successful_step_index, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(args.runId, args.projectRoot, args.planSignature, 'running', args.resumedFromRunId ?? null, -1, Date.now());
  }

  completeRunState(runId: string, status: 'success' | 'failed'): void {
    getSqliteClient()
      .prepare('UPDATE trace_run_state SET status = ?, updated_at = ? WHERE run_id = ?')
      .run(status, Date.now(), runId);
  }

  updateStepState(args: {
    runId: string;
    stepId: string;
    stepIndex: number;
    status: StepResult['status'];
    attempts: number;
    exitCode: number;
    failureKind?: string;
  }): void {
    getSqliteClient()
      .prepare(
        `INSERT INTO trace_run_step_state (
          run_id, step_id, step_index, status, attempts, exit_code, failure_kind, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        args.runId,
        args.stepId,
        args.stepIndex,
        args.status,
        args.attempts,
        args.exitCode,
        args.failureKind ?? null,
        Date.now()
      );

    if (args.status === 'success' || args.status === 'dry-run' || args.status === 'skipped') {
      getSqliteClient()
        .prepare(
          `UPDATE trace_run_state
           SET last_successful_step_index = MAX(last_successful_step_index, ?), updated_at = ?
           WHERE run_id = ?`
        )
        .run(args.stepIndex, Date.now(), args.runId);
    }
  }

  findLatestResumableRun(projectRoot: string, planSignature: string): ExecutionRunState | null {
    const row = getSqliteClient()
      .prepare(
        `SELECT run_id, project_root, plan_signature, status, resumed_from_run_id, last_successful_step_index, updated_at
         FROM trace_run_state
         WHERE project_root = ?
           AND plan_signature = ?
           AND status IN ('running', 'failed')
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get(projectRoot, planSignature) as
      | {
          run_id: string;
          project_root: string;
          plan_signature: string;
          status: 'running' | 'failed' | 'success';
          resumed_from_run_id: string | null;
          last_successful_step_index: number;
          updated_at: number;
        }
      | undefined;

    if (!row) {
      return null;
    }

    const steps = getSqliteClient()
      .prepare(
        `SELECT step_id, step_index, status, attempts, exit_code, failure_kind, updated_at
         FROM trace_run_step_state
         WHERE run_id = ?
         ORDER BY step_index ASC, updated_at DESC`
      )
      .all(row.run_id) as Array<{
      step_id: string;
      step_index: number;
      status: StepResult['status'];
      attempts: number;
      exit_code: number;
      failure_kind: string | null;
      updated_at: number;
    }>;

    const dedupedSteps = dedupeLatestStepState(steps);

    return {
      runId: row.run_id,
      projectRoot: row.project_root,
      planSignature: row.plan_signature,
      status: row.status,
      resumedFromRunId: row.resumed_from_run_id ?? undefined,
      lastSuccessfulStepIndex: row.last_successful_step_index,
      steps: dedupedSteps,
      updatedAt: row.updated_at,
    };
  }

  logEvent(runId: string, eventType: string, payload: unknown): void {
    getSqliteClient()
      .prepare(
        'INSERT INTO trace_execution_events (run_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)'
      )
      .run(runId, eventType, JSON.stringify(payload), Date.now());
  }
}

function dedupeLatestStepState(
  rows: Array<{
    step_id: string;
    step_index: number;
    status: StepResult['status'];
    attempts: number;
    exit_code: number;
    failure_kind: string | null;
    updated_at: number;
  }>
) {
  const byIndex = new Map<number, {
    stepId: string;
    stepIndex: number;
    status: StepResult['status'];
    attempts: number;
    exitCode: number;
    failureKind?: import('../../domain/types.js').FailureKind;
    updatedAt: number;
  }>();

  for (const row of rows) {
    const existing = byIndex.get(row.step_index);
    if (!existing || row.updated_at > existing.updatedAt) {
      byIndex.set(row.step_index, {
        stepId: row.step_id,
        stepIndex: row.step_index,
        status: row.status,
        attempts: row.attempts,
        exitCode: row.exit_code,
        failureKind: (row.failure_kind as import('../../domain/types.js').FailureKind | null) ?? undefined,
        updatedAt: row.updated_at,
      });
    }
  }

  return [...byIndex.values()].sort((a, b) => a.stepIndex - b.stepIndex);
}
