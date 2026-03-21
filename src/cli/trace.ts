import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { TracePipeline } from '../orchestration/pipeline.js';
import { TerminalUI } from '../ui/terminal.js';
import { ValidationError } from '../domain/errors.js';
import { StepResult } from '../domain/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { detectProjectRoot } from '../tooling/fs/project-detector.js';
import { scanManifests } from '../tooling/fs/manifest-scanner.js';
import { accent, bold, BRAILLE_SPINNER, clearLine, muted, padRight, secondary, white } from '../ui/theme.js';
import { TraceEvent } from '../observability/events.js';

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
    for (let i = 0; i < 4; i++) {
      const frame = BRAILLE_SPINNER[i % BRAILLE_SPINNER.length];
      process.stdout.write(`\r${accent(frame)} ${white('Scanning directory depth [2]...')}`);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    clearLine();
  }

  const manifests = scanManifests(projectRoot);
  const rows = buildWorkspaceRows(projectRoot, manifests);
  const elapsed = Date.now() - scanStart;
  const { inner, body } = getCardWidths();

  renderCardTop('TraceEnv: Workspace Analysis', inner);
  console.log(cardRow('', body));

  if (rows.length === 0) {
    console.log(cardRow(`[·] ${padRight('No known manifests', 24)} No project signals detected`, body));
  } else {
    rows.forEach((row) => console.log(cardRow(row, body)));
  }

  console.log(cardRow('', body));
  renderCardBottom(inner, `⏱ ${elapsed}ms`);
}

function buildWorkspaceRows(projectRoot: string, manifests: string[]): string[] {
  const rows: string[] = [];

  for (const manifest of manifests) {
    if (manifest === 'package.json') {
      rows.push(`[✓] ${padRight('package.json', 24)} Detected ${countDependencies(projectRoot)} dependencies`);
      continue;
    }

    if (manifest === '.env.example') {
      rows.push(`[✓] ${padRight('.env.example', 24)} Detected ${countEnvKeys(projectRoot)} config keys`);
      continue;
    }

    if (manifest === 'docker-compose.yml' || manifest === 'docker-compose.yaml') {
      rows.push(`[✓] ${padRight(manifest, 24)} Detected ${countComposeServices(projectRoot)} services`);
      continue;
    }

    if (manifest === 'requirements.txt') {
      rows.push(`[✓] ${padRight('requirements.txt', 24)} Python dependencies declared`);
      continue;
    }

    if (manifest === 'pyproject.toml') {
      rows.push(`[✓] ${padRight('pyproject.toml', 24)} Python project metadata detected`);
      continue;
    }

    if (manifest === 'go.mod') {
      rows.push(`[✓] ${padRight('go.mod', 24)} Go module project detected`);
      continue;
    }

    if (manifest === 'Cargo.toml') {
      rows.push(`[✓] ${padRight('Cargo.toml', 24)} Rust project detected`);
      continue;
    }

    if (manifest === 'pom.xml' || manifest === 'build.gradle' || manifest === 'build.gradle.kts') {
      rows.push(`[✓] ${padRight(manifest, 24)} Java build manifest detected`);
      continue;
    }

    rows.push(`[✓] ${padRight(manifest, 24)} Project signal detected`);
  }

  return rows;
}

function printPlan(args: {
  source: 'file' | 'rule' | 'ai';
  projectRoot: string;
  plan: { resolvedSteps: Array<{ command: string; description?: string }> };
  prerequisites?: string[];
  dependencies?: Array<{ name: string; kind: string }>;
  estimatedTime?: string;
  inference?: {
    mode: 'full' | 'partial';
    confidence: number;
    signals: string[];
    missingPieces?: string[];
    suggestedCommands?: string[];
    manifestHints?: string[];
    recommendation?: string;
    providerDecisions?: Array<{
      providerId: string;
      applied: boolean;
      reason: string;
      producedSteps: number;
    }>;
    mergeDecisions?: Array<{
      type: string;
      key: string;
      providerId: string;
      reason: string;
    }>;
    stepProvenance?: Array<{
      stepKey: string;
      stepId?: string;
      command: string;
      cwd: string;
      providerId: string;
      confidence: number;
      providerPriority: number;
      reason: string;
    }>;
  };
  debug?: boolean;
}): void {
  console.log(`\n${accent('⚡ Execution Plan Generated')}`);

  if (args.inference) {
    const modeLabel = args.inference.mode === 'partial' ? 'Partial Inference Mode' : 'Full Inference Mode';
    console.log(`${muted(`  ${modeLabel} • Confidence ${args.inference.confidence}/100`)}`);
  }

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

  if (args.inference?.mode === 'partial') {
    if (args.inference.manifestHints && args.inference.manifestHints.length > 0) {
      console.log(`\n${bold(white('  MANIFEST HINTS'))}`);
      args.inference.manifestHints.forEach((hint) => console.log(`  ${muted(`• ${hint}`)}`));
    }

    if (args.inference.suggestedCommands && args.inference.suggestedCommands.length > 0) {
      console.log(`\n${bold(white('  SUGGESTED COMMANDS'))}`);
      args.inference.suggestedCommands.forEach((command) => console.log(`  ${muted(`• ${command}`)}`));
    }

    if (args.inference.missingPieces && args.inference.missingPieces.length > 0) {
      console.log(`\n${bold(white('  MISSING PIECES'))}`);
      args.inference.missingPieces.forEach((item) => console.log(`  ${muted(`• ${item}`)}`));
    }

    if (args.inference.recommendation) {
      console.log(`\n${bold(white('  RECOMMENDATION'))}`);
      console.log(`  ${muted(args.inference.recommendation)}`);
    }
  }

  if (args.debug && args.inference) {
    console.log(`\n${bold(white('  REASONING'))}`);

    if (args.inference.providerDecisions && args.inference.providerDecisions.length > 0) {
      console.log(`  ${muted('Providers:')}`);
      args.inference.providerDecisions.forEach((decision) => {
        const marker = decision.applied ? '✓' : '·';
        console.log(`  ${muted(`  ${marker} ${decision.providerId}: ${decision.reason} (steps=${decision.producedSteps})`)}`);
      });
    }

    if (args.inference.stepProvenance && args.inference.stepProvenance.length > 0) {
      console.log(`  ${muted('Step provenance:')}`);
      args.inference.stepProvenance.forEach((item) => {
        console.log(
          `  ${muted(`  • ${item.command} -> ${item.providerId} (p=${item.providerPriority}, c=${Math.round(item.confidence * 100)}%)`)}`
        );
      });
    }

    if (args.inference.mergeDecisions && args.inference.mergeDecisions.length > 0) {
      console.log(`  ${muted('Merge decisions:')}`);
      args.inference.mergeDecisions.slice(0, 10).forEach((decision) => {
        console.log(`  ${muted(`  • ${decision.type} [${decision.providerId}] ${decision.reason}`)}`);
      });
      if (args.inference.mergeDecisions.length > 10) {
        console.log(`  ${muted(`  • ... ${args.inference.mergeDecisions.length - 10} more decisions`)}`);
      }
    }
  }

  if (args.estimatedTime) {
    console.log(`\n${muted(`  Estimated total: ${args.estimatedTime}`)}`);
  }

  console.log(`\n${muted('  Safety: review commands before run, confirmation required, and stop on failure by default.')}`);

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

export async function runTraceCommand(options: { dryRun?: boolean; skip?: string[]; yes?: boolean; debug?: boolean; resume?: boolean; undo?: boolean }): Promise<number> {
  const ui = new TerminalUI();
  const pipeline = new TracePipeline();
  const debugEvents: TraceEvent[] = [];

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
        debug: options.debug ?? false,
        resume: options.resume ?? false,
      },
      {
        onPlan: async ({ source, projectRoot, plan, prerequisites, dependencies, estimatedTime, autoApprove, inference }) => {
          printPlan({ source, projectRoot, plan, prerequisites, dependencies, estimatedTime, inference, debug: options.debug });
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
        onEvent: (event) => {
          if (!options.debug) {
            return;
          }
          if (debugEvents.length >= 80) {
            debugEvents.shift();
          }
          debugEvents.push(event);
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
      if (options.debug && debugEvents.length > 0) {
        printDebugEventStream(debugEvents);
      }
      return 1;
    }

    const executedCount = result.results.filter((item) => item.status === 'success' || item.status === 'dry-run').length;
    const failedCount = result.results.filter((item) => item.status === 'failed').length;
    const totalCount = result.results.length;
    const skippedCount = result.results.filter((item) => item.status === 'skipped').length;

    const totalDuration = Date.now() - commandStart;
    const { inner, body } = getCardWidths();
    renderCardTop('Environment Ready', inner);
    if (failedCount === 0) {
      console.log(cardRow(`All ${executedCount} steps completed successfully.`, body));
    } else {
      console.log(cardRow(`Completed ${executedCount} of ${totalCount} steps.`, body));
      console.log(cardRow(`Failures tolerated: ${failedCount}`, body));
    }
    console.log(cardRow(`Skipped steps: ${skippedCount}`, body));
    if (result.detectedDependencies && result.detectedDependencies.length > 0) {
      console.log(cardRow(`Captured ${result.detectedDependencies.length} setup vectors.`, body));
    }
    renderCardBottom(inner, `⏱ ${formatClock(totalDuration)}`);
    if (options.debug && debugEvents.length > 0) {
      printDebugEventStream(debugEvents);
    }
    console.log();
    return 0;
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes('No executable steps were found')) {
      ui.error('Partial inference available, but no executable workflow could be validated yet.');
      console.log('Suggested next steps:');
      console.log('  • trace record --dir .');
      console.log('  • trace synthesize --dir .');
      console.log('  • create .traceenv.json with explicit setup commands\n');
      return 1;
    }

    ui.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function printDebugEventStream(events: TraceEvent[]): void {
  console.log(`\n${bold(white('  DEBUG EVENT STREAM'))}`);
  const tail = events.slice(-20);
  for (const event of tail) {
    const stamp = new Date(event.at).toTimeString().slice(0, 8);
    const payload = event.payload ? JSON.stringify(event.payload) : '{}';
    const clipped = payload.length > 140 ? `${payload.slice(0, 137)}...` : payload;
    console.log(`  ${muted(`• ${stamp} ${event.name} ${clipped}`)}`);
  }
  if (events.length > tail.length) {
    console.log(`  ${muted(`• ... ${events.length - tail.length} earlier events omitted`)}`);
  }
}
