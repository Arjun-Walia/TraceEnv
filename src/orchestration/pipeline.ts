import { TraceRunOptions, TraceRunResult } from '../domain/types.js';
import { detectProjectRoot } from '../tooling/fs/project-detector.js';
import { WorkflowRepository } from '../storage/repositories/workflow-repo.js';
import { Analyzer } from './analyzer.js';
import { Planner } from './planner.js';
import { Validator } from './validator.js';
import { OrchestrationExecutor } from './executor.js';
import { ValidationError } from '../domain/errors.js';
import { EventBus, TraceEvent } from '../observability/events.js';

export interface PipelineHooks {
  onPlan?: (args: {
    source: 'file' | 'rule' | 'ai';
    projectRoot: string;
    plan: TraceRunResult['plan'];
    estimatedTime?: string;
    prerequisites?: string[];
    dependencies?: TraceRunResult['detectedDependencies'];
    inference?: NonNullable<import('../domain/types.js').WorkflowSpec['inference']>;
    autoApprove: boolean;
  }) => Promise<boolean>;
  onStepStart?: (index: number, total: number, command: string) => void;
  onStepRetry?: (index: number, total: number, attempt: number, maxAttempts: number, reason: string) => void;
  onStepResult?: (index: number, total: number, result: TraceRunResult['results'][number]) => void;
  onEvent?: (event: TraceEvent) => void;
}

export class TracePipeline {
  private workflowRepo = new WorkflowRepository();
  private analyzer = new Analyzer();
  private planner = new Planner();
  private validator = new Validator();
  private executor = new OrchestrationExecutor();

  async run(startDir: string, options: TraceRunOptions = {}, hooks: PipelineHooks = {}): Promise<TraceRunResult> {
    const events = new EventBus();
    const emit = (name: string, payload?: Record<string, unknown>) => {
      events.emit(name, payload);
      const all = events.list();
      const latest = all.length > 0 ? all[all.length - 1] : undefined;
      if (latest) {
        hooks.onEvent?.(latest);
      }
    };

    emit('pipeline.started', {
      startDir,
      dryRun: options.dryRun ?? false,
      resume: options.resume ?? false,
    });

    const projectRoot = detectProjectRoot(startDir);
    emit('pipeline.project_root.detected', { projectRoot });

    const { workflow, source } = await this.workflowRepo.loadOrInfer(projectRoot);
    emit('pipeline.workflow.loaded', {
      source,
      stepCount: workflow.steps.length,
      inferenceMode: workflow.inference?.mode ?? null,
      inferenceConfidence: workflow.inference?.confidence ?? null,
      providerDecisions: workflow.inference?.providerDecisions?.length ?? 0,
      mergeDecisions: workflow.inference?.mergeDecisions?.length ?? 0,
      providerDecisionItems: workflow.inference?.providerDecisions?.slice(0, 8) ?? [],
      mergeDecisionItems: workflow.inference?.mergeDecisions?.slice(0, 12) ?? [],
    });

    const analysis = this.analyzer.analyze(projectRoot, workflow);
    emit('pipeline.analysis.completed', {
      missingPrerequisites: analysis.missingPrerequisites,
      dependencyCount: analysis.dependencies.length,
    });

    const plan = this.planner.createPlan(projectRoot, workflow);
    emit('pipeline.plan.created', {
      planId: plan.planId,
      stepCount: plan.resolvedSteps.length,
      riskLevel: plan.riskLevel,
    });

    const validation = this.validator.validate(plan, analysis.missingPrerequisites);
    if (!validation.ok) {
      emit('pipeline.validation.failed', { issues: validation.issues });
      throw new ValidationError(validation.issues.join(' | '));
    }
    emit('pipeline.validation.passed');

    if (hooks.onPlan) {
      const approved = await hooks.onPlan({
        source,
        projectRoot,
        plan,
        estimatedTime: workflow.estimatedTime,
        prerequisites: workflow.prerequisites,
        dependencies: analysis.dependencies,
        inference: workflow.inference,
        autoApprove: options.autoApprove ?? false,
      });
      if (!approved) {
        emit('pipeline.cancelled.by_user');
        return {
          success: false,
          projectRoot,
          plan,
          results: [],
          summary: {
            totalSteps: plan.resolvedSteps.length,
            completedSteps: 0,
            skippedSteps: 0,
          },
          detectedDependencies: analysis.dependencies,
          recoverySuggestions: [],
          failureReason: 'Cancelled by user',
        };
      }
    }

    const runId = `run-${Date.now()}`;
    emit('pipeline.execution.started', { runId });
    const execution = await this.executor.executePlan(plan, {
      runId,
      dryRun: options.dryRun,
      skipSteps: options.skipSteps,
      resumeFromLastSuccess: options.resume,
      onStepStart: (index, total, command) => {
        emit('pipeline.step.started', { index, total, command });
        hooks.onStepStart?.(index, total, command);
      },
      onStepRetry: (index, total, attempt, maxAttempts, reason) => {
        emit('pipeline.step.retry', { index, total, attempt, maxAttempts, reason });
        hooks.onStepRetry?.(index, total, attempt, maxAttempts, reason);
      },
      onStepResult: (index, total, result) => {
        emit('pipeline.step.result', {
          index,
          total,
          stepId: result.stepId,
          command: result.command,
          status: result.status,
          failureKind: result.failureKind ?? null,
          attemptCount: result.attemptCount ?? 0,
          recoverySuggestion: result.recoverySuggestion ?? null,
        });
        hooks.onStepResult?.(index, total, result);
      },
    });

    emit('pipeline.execution.completed', {
      success: execution.success,
      resultCount: execution.results.length,
      recoverySuggestions: execution.recoverySuggestions.length,
      failureReason: execution.failureReason ?? null,
    });

    return {
      success: execution.success,
      projectRoot,
      plan,
      results: execution.results,
      summary: {
        totalSteps: plan.resolvedSteps.length,
        completedSteps: execution.results.filter((step) => step.status === 'success' || step.status === 'dry-run').length,
        skippedSteps: execution.results.filter((step) => step.status === 'skipped').length,
        failedStep: execution.results.find((step) => step.status === 'failed')?.command,
      },
      detectedDependencies: analysis.dependencies,
      recoverySuggestions: execution.recoverySuggestions,
      failureReason: execution.failureReason,
    };
  }
}
