import {
  ExecutionEnvironmentSnapshot,
  ExecutionFeedback,
  ExecutionPlan,
  ExecutionPlanStep,
  StepResult,
} from '../domain/types.js';
import { DEFAULT_EXECUTION_SAFETY_POLICY, ExecutionSafetyPolicy } from '../domain/policies.js';
import { runCommand } from '../tooling/shell/runner.js';
import { detectEnvironment } from '../tooling/env/detector.js';
import { RunLogRepository } from '../storage/repositories/run-log-repo.js';
import { buildExecutionFeedback } from './feedback.js';

export class OrchestrationExecutor {
  constructor(private readonly runLogRepo: RunLogRepository = new RunLogRepository()) {}

  async executePlan(
    plan: ExecutionPlan,
    options: {
      dryRun?: boolean;
      skipSteps?: number[];
      resumeFromLastSuccess?: boolean;
      safetyPolicy?: Partial<ExecutionSafetyPolicy>;
      runId: string;
      onStepStart?: (index: number, total: number, command: string) => void;
      onStepRetry?: (index: number, total: number, attempt: number, maxAttempts: number, reason: string) => void;
      onStepResult?: (index: number, total: number, result: StepResult) => void;
    }
  ): Promise<{ success: boolean; results: StepResult[]; failureReason?: string; recoverySuggestions: string[] }> {
    const dryRun = options.dryRun ?? false;
    const skipSteps = options.skipSteps ?? [];
    const resumeFromLastSuccess = options.resumeFromLastSuccess ?? false;
    const safetyPolicy: ExecutionSafetyPolicy = {
      ...DEFAULT_EXECUTION_SAFETY_POLICY,
      ...(options.safetyPolicy ?? {}),
      defaultRetryPolicy: {
        ...DEFAULT_EXECUTION_SAFETY_POLICY.defaultRetryPolicy,
        ...(options.safetyPolicy?.defaultRetryPolicy ?? {}),
      },
    };
    const results: StepResult[] = [];
    const recoverySuggestions: string[] = [];
    const planSignature = this.computePlanSignature(plan);

    this.runLogRepo.startRun(options.runId, plan.projectRoot);
    const resumableRun = resumeFromLastSuccess
      ? this.runLogRepo.findLatestResumableRun(plan.projectRoot, planSignature)
      : null;
    const resumeIndex = resumableRun?.lastSuccessfulStepIndex ?? -1;

    this.runLogRepo.startRunState({
      runId: options.runId,
      projectRoot: plan.projectRoot,
      planSignature,
      resumedFromRunId: resumableRun?.runId,
    });

    this.runLogRepo.logEvent(options.runId, 'run-started', {
      projectRoot: plan.projectRoot,
      planId: plan.planId,
      resumeFromRunId: resumableRun?.runId ?? null,
      resumeIndex,
      dryRun,
      riskLevel: plan.riskLevel,
      requiresConfirmation: plan.requiresConfirmation,
      safetyPolicy,
    });

    for (let i = 0; i < plan.resolvedSteps.length; i++) {
      const step = plan.resolvedSteps[i];
      const stepNumber = i + 1;

      if (resumeIndex >= i) {
        const resumed: StepResult = {
          stepId: step.stepId,
          command: step.command,
          status: 'skipped',
          exitCode: 0,
          durationMs: 0,
          attemptCount: 0,
          maxAttempts: step.retryPolicy.maxAttempts,
          recoverySuggestion: `Resumed execution: step already successful in run ${resumableRun?.runId}.`,
        };
        results.push(resumed);
        this.runLogRepo.logStep(options.runId, resumed);
        this.runLogRepo.updateStepState({
          runId: options.runId,
          stepId: step.stepId,
          stepIndex: i,
          status: resumed.status,
          attempts: 0,
          exitCode: resumed.exitCode,
        });
        this.runLogRepo.logEvent(options.runId, 'step-resumed-skip', {
          stepId: step.stepId,
          stepIndex: i,
          command: step.command,
          resumedFromRunId: resumableRun?.runId ?? null,
        });
        options.onStepResult?.(stepNumber, plan.resolvedSteps.length, resumed);
        continue;
      }

      options.onStepStart?.(stepNumber, plan.resolvedSteps.length, step.command);

      if (skipSteps.includes(stepNumber)) {
        const skipped: StepResult = {
          stepId: step.stepId,
          command: step.command,
          status: 'skipped',
          exitCode: 0,
          durationMs: 0,
          attemptCount: 0,
          maxAttempts: step.retryPolicy.maxAttempts,
        };
        results.push(skipped);
        this.runLogRepo.logStep(options.runId, skipped);
        this.runLogRepo.updateStepState({
          runId: options.runId,
          stepId: step.stepId,
          stepIndex: i,
          status: skipped.status,
          attempts: skipped.attemptCount ?? 0,
          exitCode: skipped.exitCode,
        });
        this.runLogRepo.logEvent(options.runId, 'step-skipped', {
          stepId: step.stepId,
          stepIndex: i,
          command: step.command,
          reason: 'user-skip',
        });
        options.onStepResult?.(stepNumber, plan.resolvedSteps.length, skipped);
        continue;
      }

      const safetyViolation = this.evaluateSafety(step, safetyPolicy);
      if (safetyViolation) {
        const blocked: StepResult = {
          stepId: step.stepId,
          command: step.command,
          status: 'failed',
          exitCode: 1,
          durationMs: 0,
          attemptCount: 1,
          maxAttempts: 1,
          failureKind: 'permission',
          retriable: false,
          recoverySuggestion: safetyViolation,
        };
        results.push(blocked);
        this.runLogRepo.logStep(options.runId, blocked);
        this.runLogRepo.updateStepState({
          runId: options.runId,
          stepId: step.stepId,
          stepIndex: i,
          status: blocked.status,
          attempts: blocked.attemptCount ?? 1,
          exitCode: blocked.exitCode,
          failureKind: blocked.failureKind,
        });
        this.runLogRepo.logEvent(options.runId, 'step-blocked-safety', {
          stepId: step.stepId,
          stepIndex: i,
          command: step.command,
          reason: safetyViolation,
          sideEffects: step.sideEffects,
          idempotent: step.idempotent,
        });
        options.onStepResult?.(stepNumber, plan.resolvedSteps.length, blocked);

        this.runLogRepo.completeRun(options.runId, false);
        this.runLogRepo.completeRunState(options.runId, 'failed');
        return {
          success: false,
          results,
          failureReason: `Step blocked by safety policy: ${step.command}`,
          recoverySuggestions: [safetyViolation],
        };
      }

      if (dryRun) {
        const preview: StepResult = {
          stepId: step.stepId,
          command: step.command,
          status: 'dry-run',
          exitCode: 0,
          durationMs: 0,
          attemptCount: 0,
          maxAttempts: step.retryPolicy.maxAttempts,
        };
        results.push(preview);
        this.runLogRepo.logStep(options.runId, preview);
        this.runLogRepo.updateStepState({
          runId: options.runId,
          stepId: step.stepId,
          stepIndex: i,
          status: preview.status,
          attempts: preview.attemptCount ?? 0,
          exitCode: preview.exitCode,
        });
        this.runLogRepo.logEvent(options.runId, 'step-dry-run', {
          stepId: step.stepId,
          stepIndex: i,
          command: step.command,
        });
        options.onStepResult?.(stepNumber, plan.resolvedSteps.length, preview);
        continue;
      }

      const maxAttempts = Math.max(1, step.retryPolicy.maxAttempts ?? (step.retryCount + 1));
      let attempt = 0;
      let result: StepResult | null = null;
      const beforeSnapshot = this.captureSnapshot(step.cwd);

      while (attempt < maxAttempts) {
        attempt += 1;
        const output = await runCommand({
          command: step.command,
          cwd: step.cwd,
          timeoutMs: step.timeoutMs,
        });

        let feedback: ExecutionFeedback | undefined;
        if (output.exitCode !== 0 || output.timedOut) {
          const stderr = output.timedOut ? `${output.stderr}\nCommand timed out.` : output.stderr;
          feedback = buildExecutionFeedback(step.command, stderr, output.exitCode);
        }

        const afterSnapshot = this.captureSnapshot(step.cwd);

        result = {
          stepId: step.stepId,
          command: step.command,
          status: output.exitCode === 0 && !output.timedOut ? 'success' : 'failed',
          exitCode: output.exitCode,
          durationMs: output.durationMs,
          attemptCount: attempt,
          maxAttempts,
          retriable: feedback?.retriable,
          failureKind: feedback?.failureKind,
          recoverySuggestion: feedback?.suggestion,
          stdoutSummary: output.stdout.slice(-1000),
          stderrSummary: (output.timedOut ? `${output.stderr}\nCommand timed out.` : output.stderr).slice(-1000),
          beforeSnapshot,
          afterSnapshot,
        };

        this.runLogRepo.logEvent(options.runId, 'step-attempt', {
          stepId: step.stepId,
          stepIndex: i,
          attempt,
          maxAttempts,
          exitCode: output.exitCode,
          timedOut: output.timedOut,
          signal: output.signal ?? null,
          failureKind: feedback?.failureKind ?? null,
          beforeSnapshot,
          afterSnapshot,
        });

        if (output.exitCode === 0 || !feedback?.retriable || attempt >= maxAttempts) {
          break;
        }

        if (step.retryPolicy.strategy === 'fixed' && (step.retryPolicy.backoffMs ?? 0) > 0) {
          await sleep(step.retryPolicy.backoffMs ?? 0);
        }

        options.onStepRetry?.(
          stepNumber,
          plan.resolvedSteps.length,
          attempt + 1,
          maxAttempts,
          feedback.suggestion
        );
      }

      if (!result) {
        result = {
          stepId: step.stepId,
          command: step.command,
          status: 'failed',
          exitCode: 1,
          durationMs: 0,
          attemptCount: maxAttempts,
          maxAttempts,
          failureKind: 'unknown',
          retriable: false,
        };
      }

      results.push(result);
      this.runLogRepo.logStep(options.runId, result);
      this.runLogRepo.updateStepState({
        runId: options.runId,
        stepId: step.stepId,
        stepIndex: i,
        status: result.status,
        attempts: result.attemptCount ?? 1,
        exitCode: result.exitCode,
        failureKind: result.failureKind,
      });
      options.onStepResult?.(stepNumber, plan.resolvedSteps.length, result);

      if (result.status === 'failed' && result.recoverySuggestion) {
        recoverySuggestions.push(result.recoverySuggestion);
      }

      if (result.status === 'failed' && !step.continueOnError) {
        this.runLogRepo.completeRun(options.runId, false);
        this.runLogRepo.completeRunState(options.runId, 'failed');
        this.runLogRepo.logEvent(options.runId, 'run-failed', {
          stepId: step.stepId,
          stepIndex: i,
          command: step.command,
          failureKind: result.failureKind ?? 'unknown',
          recoverySuggestion: result.recoverySuggestion ?? null,
        });
        return {
          success: false,
          results,
          failureReason: `Step failed: ${step.command}`,
          recoverySuggestions,
        };
      }
    }

    this.runLogRepo.completeRun(options.runId, true);
    this.runLogRepo.completeRunState(options.runId, 'success');
    this.runLogRepo.logEvent(options.runId, 'run-completed', {
      totalSteps: plan.resolvedSteps.length,
      completedSteps: results.filter((item) => item.status === 'success' || item.status === 'dry-run').length,
      skippedSteps: results.filter((item) => item.status === 'skipped').length,
      failedSteps: results.filter((item) => item.status === 'failed').length,
    });
    return { success: true, results, recoverySuggestions };
  }

  private computePlanSignature(plan: ExecutionPlan): string {
    return JSON.stringify(
      plan.resolvedSteps.map((step) => ({
        stepId: step.stepId,
        command: step.command,
        cwd: step.cwd,
      }))
    );
  }

  private evaluateSafety(step: ExecutionPlanStep, policy: ExecutionSafetyPolicy): string | null {
    if (!policy.allowNonIdempotentSteps && !step.idempotent) {
      return 'Step is marked non-idempotent. Re-run with explicit non-idempotent allowance after review.';
    }

    if (!policy.allowDestructiveCommands && step.sideEffects.includes('destructive')) {
      return 'Step has destructive side effects and is blocked by default safety policy.';
    }

    return null;
  }

  private captureSnapshot(cwd: string): ExecutionEnvironmentSnapshot {
    const environment = detectEnvironment(cwd);
    return {
      timestamp: Date.now(),
      platform: environment.platform,
      nodeVersion: environment.nodeVersion,
      cwd: environment.cwd,
      manifests: environment.manifests,
      tools: environment.tools,
    };
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}
