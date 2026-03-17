import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { TracePipeline } from '../orchestration/pipeline.js';
import { TerminalUI } from '../ui/terminal.js';
import { ValidationError } from '../domain/errors.js';
import { StepResult } from '../domain/types.js';

async function confirmPlan(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(prompt);
    return answer.toLowerCase() !== 'n';
  } finally {
    rl.close();
  }
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function printPlan(args: {
  source: 'file' | 'rule' | 'ai';
  projectRoot: string;
  plan: { resolvedSteps: Array<{ command: string; description?: string }> };
  prerequisites?: string[];
  estimatedTime?: string;
}): void {
  console.log('\nTraceEnv');
  console.log(`Project: ${args.projectRoot}`);
  console.log(`Workflow: ${args.source === 'file' ? '.traceenv.json' : `inferred via ${args.source}`}`);

  if (args.prerequisites && args.prerequisites.length > 0) {
    console.log('\nPrerequisites');
    args.prerequisites.forEach((item) => console.log(`  - ${item}`));
  }

  console.log('\nPlan');
  args.plan.resolvedSteps.forEach((step, index) => {
    const desc = step.description ? `  ${step.description}` : '';
    console.log(`  ${index + 1}. ${step.command}${desc ? `\n     ${desc}` : ''}`);
  });

  if (args.estimatedTime) {
    console.log(`\nEstimated time: ${args.estimatedTime}`);
  }

  console.log();
}

function printStepResult(index: number, total: number, result: StepResult): void {
  const prefix = `  [${index}/${total}]`;

  if (result.status === 'skipped') {
    console.log(`${prefix} skipped  ${result.command}`);
    return;
  }

  if (result.status === 'dry-run') {
    console.log(`${prefix} preview  ${result.command}`);
    return;
  }

  if (result.status === 'success') {
    console.log(`${prefix} done     ${result.command} (${formatDuration(result.durationMs)})`);
    return;
  }

  console.log(`${prefix} failed   ${result.command} (${formatDuration(result.durationMs)})`);
  if (result.stderrSummary) {
    console.log(`       ${result.stderrSummary.trim().split('\n').join('\n       ')}`);
  }
}

export async function runTraceCommand(options: { dryRun?: boolean; skip?: string[]; yes?: boolean; undo?: boolean }): Promise<number> {
  const ui = new TerminalUI();
  const pipeline = new TracePipeline();

  if (options.undo) {
    ui.error('Undo is not implemented yet.');
    return 1;
  }

  const skipSteps = (options.skip ?? [])
    .map((value) => parseInt(value, 10))
    .filter((value) => !Number.isNaN(value));

  try {
    let hasPrintedExecutionHeader = false;

    const result = await pipeline.run(
      process.cwd(),
      {
        dryRun: options.dryRun ?? false,
        skipSteps,
        autoApprove: options.yes ?? false,
      },
      {
        onPlan: async ({ source, projectRoot, plan, prerequisites, estimatedTime, autoApprove }) => {
          printPlan({ source, projectRoot, plan, prerequisites, estimatedTime });
          if (autoApprove) {
            return true;
          }
          return confirmPlan('Continue? (Y/n) ');
        },
        onStepStart: () => {
          if (!hasPrintedExecutionHeader) {
            console.log(options.dryRun ? 'Preview\n' : 'Running setup\n');
            hasPrintedExecutionHeader = true;
          }
        },
        onStepResult: (index, total, stepResult) => {
          printStepResult(index, total, stepResult);
        },
      }
    );

    if (!result.success) {
      if (result.failureReason === 'Cancelled by user') {
        console.log('Cancelled.');
        return 0;
      }

      ui.error(result.failureReason ?? 'Setup failed.');
      return 1;
    }

    const executedCount = result.results.filter((item) => item.status === 'success' || item.status === 'dry-run').length;
    const skippedCount = result.results.filter((item) => item.status === 'skipped').length;

    console.log('\nComplete.');
    console.log(`Executed: ${executedCount}`);
    if (skippedCount > 0) {
      console.log(`Skipped:  ${skippedCount}`);
    }
    console.log();
    return 0;
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes('No executable steps were found')) {
      ui.error('No setup workflow found.');
      console.log('Create one with: trace record --dir .\n');
      return 1;
    }

    ui.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
