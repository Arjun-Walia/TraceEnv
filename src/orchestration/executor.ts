import { ExecutionFeedback, ExecutionPlan, StepResult } from '../domain/types.js';
import { runCommand } from '../tooling/shell/runner.js';
import { RunLogRepository } from '../storage/repositories/run-log-repo.js';
import { buildExecutionFeedback } from './feedback.js';

export class OrchestrationExecutor {
  constructor(private readonly runLogRepo: RunLogRepository = new RunLogRepository()) {}

  async executePlan(
    plan: ExecutionPlan,
    options: {
      dryRun?: boolean;
      skipSteps?: number[];
      runId: string;
      onStepStart?: (index: number, total: number, command: string) => void;
      onStepRetry?: (index: number, total: number, attempt: number, maxAttempts: number, reason: string) => void;
      onStepResult?: (index: number, total: number, result: StepResult) => void;
    }
  ): Promise<{ success: boolean; results: StepResult[]; failureReason?: string; recoverySuggestions: string[] }> {
    const dryRun = options.dryRun ?? false;
    const skipSteps = options.skipSteps ?? [];
    const results: StepResult[] = [];
    const recoverySuggestions: string[] = [];

    this.runLogRepo.startRun(options.runId, plan.projectRoot);

    for (let i = 0; i < plan.resolvedSteps.length; i++) {
      const step = plan.resolvedSteps[i];
      const stepNumber = i + 1;

      options.onStepStart?.(stepNumber, plan.resolvedSteps.length, step.command);

      if (skipSteps.includes(stepNumber)) {
        const skipped: StepResult = {
          stepId: step.stepId,
          command: step.command,
          status: 'skipped',
          exitCode: 0,
          durationMs: 0,
          attemptCount: 0,
          maxAttempts: step.retryCount + 1,
        };
        results.push(skipped);
        this.runLogRepo.logStep(options.runId, skipped);
        options.onStepResult?.(stepNumber, plan.resolvedSteps.length, skipped);
        continue;
      }

      if (dryRun) {
        const preview: StepResult = {
          stepId: step.stepId,
          command: step.command,
          status: 'dry-run',
          exitCode: 0,
          durationMs: 0,
          attemptCount: 0,
          maxAttempts: step.retryCount + 1,
        };
        results.push(preview);
        this.runLogRepo.logStep(options.runId, preview);
        options.onStepResult?.(stepNumber, plan.resolvedSteps.length, preview);
        continue;
      }

      const maxAttempts = step.retryCount + 1;
      let attempt = 0;
      let result: StepResult | null = null;

      while (attempt < maxAttempts) {
        attempt += 1;
        const output = await runCommand({
          command: step.command,
          cwd: step.cwd,
          timeoutMs: step.timeoutMs,
        });

        let feedback: ExecutionFeedback | undefined;
        if (output.exitCode !== 0) {
          feedback = buildExecutionFeedback(step.command, output.stderr, output.exitCode);
        }

        result = {
          stepId: step.stepId,
          command: step.command,
          status: output.exitCode === 0 ? 'success' : 'failed',
          exitCode: output.exitCode,
          durationMs: output.durationMs,
          attemptCount: attempt,
          maxAttempts,
          retriable: feedback?.retriable,
          failureKind: feedback?.failureKind,
          recoverySuggestion: feedback?.suggestion,
          stdoutSummary: output.stdout.slice(-1000),
          stderrSummary: output.stderr.slice(-1000),
        };

        if (output.exitCode === 0 || !feedback?.retriable || attempt >= maxAttempts) {
          break;
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
      options.onStepResult?.(stepNumber, plan.resolvedSteps.length, result);

      if (result.status === 'failed' && result.recoverySuggestion) {
        recoverySuggestions.push(result.recoverySuggestion);
      }

      if (result.status === 'failed' && !step.continueOnError) {
        this.runLogRepo.completeRun(options.runId, false);
        return {
          success: false,
          results,
          failureReason: `Step failed: ${step.command}`,
          recoverySuggestions,
        };
      }
    }

    this.runLogRepo.completeRun(options.runId, true);
    return { success: true, results, recoverySuggestions };
  }
}
