import { TraceRunOptions, TraceRunResult } from '../domain/types.js';
import { detectProjectRoot } from '../tooling/fs/project-detector.js';
import { WorkflowRepository } from '../storage/repositories/workflow-repo.js';
import { Analyzer } from './analyzer.js';
import { Planner } from './planner.js';
import { Validator } from './validator.js';
import { OrchestrationExecutor } from './executor.js';
import { ValidationError } from '../domain/errors.js';

export interface PipelineHooks {
  onPlan?: (args: {
    source: 'file' | 'rule' | 'ai';
    projectRoot: string;
    plan: TraceRunResult['plan'];
    estimatedTime?: string;
    prerequisites?: string[];
    autoApprove: boolean;
  }) => Promise<boolean>;
  onStepStart?: (index: number, total: number, command: string) => void;
  onStepResult?: (index: number, total: number, result: TraceRunResult['results'][number]) => void;
}

export class TracePipeline {
  private workflowRepo = new WorkflowRepository();
  private analyzer = new Analyzer();
  private planner = new Planner();
  private validator = new Validator();
  private executor = new OrchestrationExecutor();

  async run(startDir: string, options: TraceRunOptions = {}, hooks: PipelineHooks = {}): Promise<TraceRunResult> {
    const projectRoot = detectProjectRoot(startDir);
    const { workflow, source } = await this.workflowRepo.loadOrInfer(projectRoot);
    const analysis = this.analyzer.analyze(projectRoot, workflow);
    const plan = this.planner.createPlan(projectRoot, workflow);

    const validation = this.validator.validate(plan, analysis.missingPrerequisites);
    if (!validation.ok) {
      throw new ValidationError(validation.issues.join(' | '));
    }

    if (hooks.onPlan) {
      const approved = await hooks.onPlan({
        source,
        projectRoot,
        plan,
        estimatedTime: workflow.estimatedTime,
        prerequisites: workflow.prerequisites,
        autoApprove: options.autoApprove ?? false,
      });
      if (!approved) {
        return {
          success: false,
          projectRoot,
          plan,
          results: [],
          failureReason: 'Cancelled by user',
        };
      }
    }

    const runId = `run-${Date.now()}`;
    const execution = await this.executor.executePlan(plan, {
      runId,
      dryRun: options.dryRun,
      skipSteps: options.skipSteps,
      onStepStart: hooks.onStepStart,
      onStepResult: hooks.onStepResult,
    });

    return {
      success: execution.success,
      projectRoot,
      plan,
      results: execution.results,
      failureReason: execution.failureReason,
    };
  }
}
