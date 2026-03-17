import { ExecutionPlan, StepResult } from '../domain/types.js';
import { runCommand } from '../tooling/shell/runner.js';
import { RunLogRepository } from '../storage/repositories/run-log-repo.js';

export class OrchestrationExecutor {
  constructor(private readonly runLogRepo: RunLogRepository = new RunLogRepository()) {}

  async executePlan(
    plan: ExecutionPlan,
    options: {
      dryRun?: boolean;
      skipSteps?: number[];
      runId: string;
      onStepStart?: (index: number, total: number, command: string) => void;
      onStepResult?: (index: number, total: number, result: StepResult) => void;
    }
  ): Promise<{ success: boolean; results: StepResult[]; failureReason?: string }> {
    const dryRun = options.dryRun ?? false;
    const skipSteps = options.skipSteps ?? [];
    const results: StepResult[] = [];

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
        };
        results.push(preview);
        this.runLogRepo.logStep(options.runId, preview);
        options.onStepResult?.(stepNumber, plan.resolvedSteps.length, preview);
        continue;
      }

      const output = await runCommand({
        command: step.command,
        cwd: step.cwd,
        timeoutMs: step.timeoutMs,
      });

      const result: StepResult = {
        stepId: step.stepId,
        command: step.command,
        status: output.exitCode === 0 ? 'success' : 'failed',
        exitCode: output.exitCode,
        durationMs: output.durationMs,
        stdoutSummary: output.stdout.slice(-1000),
        stderrSummary: output.stderr.slice(-1000),
      };

      results.push(result);
      this.runLogRepo.logStep(options.runId, result);
  options.onStepResult?.(stepNumber, plan.resolvedSteps.length, result);

      if (output.exitCode !== 0 && !step.continueOnError) {
        this.runLogRepo.completeRun(options.runId, false);
        return {
          success: false,
          results,
          failureReason: `Step failed: ${step.command}`,
        };
      }
    }

    this.runLogRepo.completeRun(options.runId, true);
    return { success: true, results };
  }
}
