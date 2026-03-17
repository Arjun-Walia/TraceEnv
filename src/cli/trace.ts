import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { TracePipeline } from '../orchestration/pipeline.js';
import { TerminalUI } from '../ui/terminal.js';
import { ValidationError } from '../domain/errors.js';
import { StepResult } from '../domain/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { detectProjectRoot } from '../tooling/fs/project-detector.js';
import { accent, bold, BRAILLE_SPINNER, clearLine, muted, padRight, secondary, white } from '../ui/theme.js';

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function visibleLength(text: string): number {
  return text.replace(ANSI_PATTERN, '').length;
}

function fitPlain(text: string, width: number): string {
  if (width <= 0) return '';
  if (visibleLength(text) <= width) return text;
  if (width === 1) return '…';
  return `${text.slice(0, width - 1)}…`;
}

function getCardWidths(preferredOuter = 68): { inner: number; body: number } {
  const columns = process.stdout.columns ?? 80;
  const maxOuter = Math.max(10, columns - 1);
  const outer = Math.min(preferredOuter, maxOuter);
  const inner = Math.max(8, outer - 2);
  const body = Math.max(1, inner - 2);
  return { inner, body };
}

function renderCardTop(title: string, inner: number): void {
  const prefix = `── ✦ ${title} `;
  const fittedPrefix = fitPlain(prefix, inner);
  const fill = Math.max(0, inner - visibleLength(fittedPrefix));
  console.log(accent('╭') + accent(fittedPrefix) + secondary('─'.repeat(fill)) + accent('╮'));
}

function renderCardBottom(inner: number, rightText: string): void {
  const tag = fitPlain(` ${rightText} `, inner);
  const fill = Math.max(0, inner - visibleLength(tag));
  console.log(accent('╰') + secondary('─'.repeat(fill)) + muted(tag) + accent('╯'));
}

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

function formatClock(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  const totalSec = Math.floor(durationMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec.toString().padStart(2, '0')}s`;
}

function estimateFor(command: string): string {
  const normalized = command.toLowerCase();
  if (normalized.startsWith('echo ') && normalized.includes('starting')) return '~ < 1s';
  if (normalized.startsWith('echo ') && (normalized.includes('complete') || normalized.includes('done'))) return '~ < 1s';
  if (normalized.includes('cp ') || normalized.includes('copy ') || normalized.includes('.env')) return '~ < 1s';
  if (normalized.includes('docker compose up')) return '~ 45s';
  if (normalized.includes('npm install') || normalized.includes('pnpm install') || normalized.includes('yarn install')) return '~ 3m';
  if (normalized.includes('run dev') || normalized.includes('start')) return 'Daemon';
  return '~ < 5s';
}

function cardRow(content: string, width: number): string {
  const fitted = fitPlain(content, width);
  return `${accent('│')} ${padRight(fitted, width)} ${accent('│')}`;
}

function countDependencies(projectRoot: string): number {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return 0;
  try {
    const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return Object.keys(json.dependencies ?? {}).length + Object.keys(json.devDependencies ?? {}).length;
  } catch {
    return 0;
  }
}

function countComposeServices(projectRoot: string): number {
  const composePath = ['docker-compose.yml', 'docker-compose.yaml']
    .map((name) => path.join(projectRoot, name))
    .find((file) => fs.existsSync(file));
  if (!composePath) return 0;
  const content = fs.readFileSync(composePath, 'utf-8');
  const serviceMatches = content.match(/^\s{2}[a-zA-Z0-9_-]+:\s*$/gm);
  return serviceMatches?.length ?? 0;
}

function countEnvKeys(projectRoot: string): number {
  const envPath = path.join(projectRoot, '.env.example');
  if (!fs.existsSync(envPath)) return 0;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  return lines.filter((line) => line.trim() && !line.trim().startsWith('#') && line.includes('=')).length;
}

async function renderWorkspaceCard(projectRoot: string): Promise<void> {
  const scanStart = Date.now();
  if (process.stdout.isTTY) {
    for (let i = 0; i < BRAILLE_SPINNER.length * 2; i++) {
      const frame = BRAILLE_SPINNER[i % BRAILLE_SPINNER.length];
      process.stdout.write(`\r${accent(frame)} ${white('Scanning directory depth [2]...')}`);
      await new Promise((resolve) => setTimeout(resolve, 65));
    }
    clearLine();
  }

  const hasPackage = fs.existsSync(path.join(projectRoot, 'package.json'));
  const hasCompose = fs.existsSync(path.join(projectRoot, 'docker-compose.yml')) || fs.existsSync(path.join(projectRoot, 'docker-compose.yaml'));
  const hasEnv = fs.existsSync(path.join(projectRoot, '.env.example'));

  const deps = countDependencies(projectRoot);
  const services = countComposeServices(projectRoot);
  const keys = countEnvKeys(projectRoot);
  const elapsed = Date.now() - scanStart;
  const { inner, body } = getCardWidths();

  renderCardTop('TraceEnv: Workspace Analysis', inner);
  console.log(cardRow('', body));
  console.log(cardRow(`[✔] ${padRight('package.json', 24)} ${hasPackage ? `Found ${deps} dependencies` : 'Not found'}`, body));
  console.log(cardRow(`[✔] ${padRight('docker-compose.yml', 24)} ${hasCompose ? `Found ${services} services` : 'Not found'}`, body));
  console.log(cardRow(`[✔] ${padRight('.env.example', 24)} ${hasEnv ? `Found ${keys} configuration keys` : 'Not found'}`, body));
  console.log(cardRow('', body));
  renderCardBottom(inner, `⏱ ${elapsed}ms`);
}

function printPlan(args: {
  source: 'file' | 'rule' | 'ai';
  projectRoot: string;
  plan: { resolvedSteps: Array<{ command: string; description?: string }> };
  prerequisites?: string[];
  dependencies?: Array<{ name: string; kind: string }>;
  estimatedTime?: string;
}): void {
  console.log(`\n${accent('⚡ Execution Plan Generated')}`);

  console.log(`\n${bold(white('  PREREQUISITES'))}`);

  if (args.prerequisites && args.prerequisites.length > 0) {
    args.prerequisites.forEach((item) => {
      const line = `  ├─ ${padRight(item, 28)} ${muted('[ Installed ]')}`;
      console.log(line);
    });
  } else {
    console.log(`  ${muted('No explicit prerequisites declared')}`);
  }

  if (args.dependencies && args.dependencies.length > 0) {
    console.log(`\n${bold(white('  DETECTED'))}`);
    args.dependencies.forEach((dependency) => console.log(`  ${muted(`• ${dependency.name} (${dependency.kind})`)}`));
  }

  console.log(`\n${bold(white('  SEQUENCE'))}`);
  args.plan.resolvedSteps.forEach((step, index) => {
    const left = `  [${index + 1}] ${padRight(step.command, 48)}`;
    const right = muted(estimateFor(step.command));
    console.log(`${left} ${right}`);
  });

  if (args.estimatedTime) {
    console.log(`\n${muted(`  Estimated total: ${args.estimatedTime}`)}`);
  }

  console.log(`\n${secondary('─'.repeat(66))}`);
}

function printStepResult(index: number, total: number, result: StepResult): void {
  const prefix = `  [${index}/${total}]`;

  if (result.status === 'skipped') {
    clearLine();
    console.log(`  ${muted('◯')} ${prefix} ${padRight(result.command, 34)} ${muted('Skipped')}`);
    return;
  }

  if (result.status === 'dry-run') {
    clearLine();
    console.log(`  ${accent('⠿')} ${prefix} ${padRight(result.command, 34)} ${muted('Preview')}`);
    return;
  }

  if (result.status === 'success') {
    clearLine();
    const status = result.command.toLowerCase().includes('docker compose up') ? 'Running' : 'Done';
    console.log(`  ${accent('🟢')} ${prefix} ${padRight(result.command, 34)} ${accent(`✓ ${status}`)} ${muted(`(${formatDuration(result.durationMs)})`)}`);
    return;
  }

  const attempts = result.attemptCount ? `, attempt ${result.attemptCount}/${result.maxAttempts}` : '';
  clearLine();
  console.log(`  ${accent('🔴')} ${prefix} ${padRight(result.command, 34)} ${accent('✗ Failed')} ${muted(`(${formatDuration(result.durationMs)}${attempts})`)}`);
  if (result.failureKind) {
    console.log(`       classified as ${result.failureKind}`);
  }
  if (result.stderrSummary) {
    console.log(`       ${result.stderrSummary.trim().split('\n').join('\n       ')}`);
  }
  if (result.recoverySuggestion) {
    console.log(`       suggestion: ${result.recoverySuggestion}`);
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
    const commandStart = Date.now();
    const detectedRoot = detectProjectRoot(process.cwd());
    await renderWorkspaceCard(detectedRoot);
    let hasPrintedExecutionHeader = false;

    const result = await pipeline.run(
      process.cwd(),
      {
        dryRun: options.dryRun ?? false,
        skipSteps,
        autoApprove: options.yes ?? false,
      },
      {
        onPlan: async ({ source, projectRoot, plan, prerequisites, dependencies, estimatedTime, autoApprove }) => {
          printPlan({ source, projectRoot, plan, prerequisites, dependencies, estimatedTime });
          if (autoApprove) {
            return true;
          }
          return confirmPlan(`${accent('  ▶ Execute this workspace trace? [Y/n] ')} `);
        },
        onStepStart: () => {
          if (!hasPrintedExecutionHeader) {
            console.log(options.dryRun ? `\n${white('  Preview Trace...')}\n` : `\n${white('  Executing Trace...')}\n`);
            hasPrintedExecutionHeader = true;
          }
        },
        onStepRetry: (index, total, attempt, maxAttempts, reason) => {
          clearLine();
          console.log(`  ${accent(BRAILLE_SPINNER[(attempt + index + total) % BRAILLE_SPINNER.length])} [${index}/${total}] retry ${attempt}/${maxAttempts} ${muted(reason)}`);
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
      if (result.recoverySuggestions && result.recoverySuggestions.length > 0) {
        console.log('\nRecovery suggestions');
        result.recoverySuggestions.forEach((suggestion) => console.log(`  - ${suggestion}`));
        console.log();
      }
      return 1;
    }

    const executedCount = result.results.filter((item) => item.status === 'success' || item.status === 'dry-run').length;
    const skippedCount = result.results.filter((item) => item.status === 'skipped').length;

    const totalDuration = Date.now() - commandStart;
    const { inner, body } = getCardWidths();
    renderCardTop('Environment Traced & Active', inner);
    console.log(cardRow(`All ${executedCount} steps completed successfully.`, body));
    console.log(cardRow(`Skipped steps: ${skippedCount}`, body));
    if (result.detectedDependencies && result.detectedDependencies.length > 0) {
      console.log(cardRow(`Captured ${result.detectedDependencies.length} setup vectors.`, body));
    }
    renderCardBottom(inner, `⏱ ${formatClock(totalDuration)}`);
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
