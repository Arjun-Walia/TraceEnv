import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { TerminalUI } from '../ui/terminal.js';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

/**
 * Workflow step definition from .traceenv.json
 */
export interface WorkflowStep {
  command: string;
  cwd?: string;
  description?: string;
}

/**
 * Root .traceenv.json structure
 */
export interface TraceEnvMetadata {
  version: string;
  workflow: WorkflowStep[];
  prerequisites?: string[];
  estimatedTime?: string;
}

/**
 * Result of a step execution
 */
export interface StepResult {
  stepIndex: number;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

/**
 * Tracer class handles loading and executing workflows from .traceenv.json
 */
export class Tracer {
  private ui: TerminalUI;
  private aborted = false;
  private executedSteps: StepResult[] = [];
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.ui = new TerminalUI();
    this.workingDir = workingDir;
  }

  /**
   * Find .traceenv.json by searching up the directory tree
   */
  static findMetadataFile(startDir: string = process.cwd()): string | null {
    let currentDir = startDir;
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const metadataPath = path.join(currentDir, '.traceenv.json');
      if (fs.existsSync(metadataPath)) {
        return metadataPath;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Try to load .traceenv.json from the given directory
   */
  loadMetadata(dir: string = this.workingDir): TraceEnvMetadata | null {
    const metadataPath = path.join(dir, '.traceenv.json');
    
    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(metadataPath, 'utf-8');
      const metadata: TraceEnvMetadata = JSON.parse(raw);

      // Validate structure
      if (!metadata.version || !Array.isArray(metadata.workflow)) {
        throw new Error('Invalid .traceenv.json structure');
      }

      return metadata;
    } catch (err) {
      throw new Error(
        `Failed to parse .traceenv.json: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Try to find and load .traceenv.json from current dir or parents
   */
  autoLoadMetadata(): { metadata: TraceEnvMetadata | null; projectDir: string } {
    const metadataPath = Tracer.findMetadataFile(this.workingDir);
    
    if (!metadataPath) {
      return { metadata: null, projectDir: this.workingDir };
    }

    const projectDir = path.dirname(metadataPath);
    const metadata = this.loadMetadata(projectDir);
    
    return { metadata, projectDir };
  }

  /**
   * Display the setup plan interactively and ask for confirmation
   */
  async displayPlan(metadata: TraceEnvMetadata, projectDir: string = this.workingDir): Promise<boolean> {
    const { TRACEENV_LOGO } = await import('../ui/animations.js');
    
    console.log(TRACEENV_LOGO);
    
    const relativePath = path.relative(process.cwd(), projectDir);
    if (relativePath && relativePath !== '.') {
      console.log(`\n📍 Project: ${relativePath}\n`);
    }

    console.log('🚀 Setup Plan\n');

    if (metadata.prerequisites && metadata.prerequisites.length > 0) {
      TerminalUI.section('Prerequisites');
      metadata.prerequisites.forEach((prereq) => {
        console.log(`  • ${prereq}`);
      });
      console.log();
    }

    TerminalUI.section('Workflow Steps');
    metadata.workflow.forEach((step, idx) => {
      const desc = step.description ? ` — ${step.description}` : '';
      const cwd = step.cwd && step.cwd !== '.' ? ` (in ${step.cwd})` : '';
      console.log(`  [${idx + 1}] ${step.command}${cwd}${desc}`);
    });

    if (metadata.estimatedTime) {
      console.log(`\n  ⏱️  Estimated time: ${metadata.estimatedTime}`);
    }

    console.log();

    // Ask for confirmation
    const rl = readline.createInterface({ input, output });
    try {
      const answer = await rl.question('  Continue? (Y/n) ');
      rl.close();
      return answer.toLowerCase() !== 'n';
    } catch {
      rl.close();
      return false;
    }
  }

  /**
   * Execute all workflow steps sequentially
   */
  async execute(
    metadata: TraceEnvMetadata,
    options: {
      dryRun?: boolean;
      skipSteps?: number[];
      projectDir?: string;
    } = {}
  ): Promise<boolean> {
    const { dryRun = false, skipSteps = [], projectDir = this.workingDir } = options;

    if (dryRun) {
      console.log('\n📋 Dry Run Mode — No commands will be executed\n');
    }

    console.log('Running setup...\n');

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < metadata.workflow.length; i++) {
      const step = metadata.workflow[i];
      const stepNum = i + 1;

      // Check if this step should be skipped
      if (skipSteps.includes(stepNum)) {
        console.log(`  [${stepNum}/${metadata.workflow.length}] ⊘ SKIP: ${step.command}`);
        skipCount++;
        continue;
      }

      console.log(`  [${stepNum}/${metadata.workflow.length}] ▶ ${step.command}`);

      if (dryRun) {
        console.log(`            (would execute in ${step.cwd || '.'}) ✓\n`);
        successCount++;
        continue;
      }

      // Execute the step
      const result = await this.executeStep(step, i, projectDir);

      if (result.exitCode === 0) {
        console.log(`            ✓ Success\n`);
        successCount++;
        this.executedSteps.push(result);
      } else {
        console.log(`            ✗ Failed (exit code: ${result.exitCode})\n`);
        this.ui.error(`Command failed: ${step.command}`);
        
        if (result.stderr) {
          console.log('Error output:');
          console.log(result.stderr);
          console.log();
        }

        return false; // Stop on first error
      }
    }

    // Summary
    console.log(`\n✅ Setup complete!\n`);
    console.log(`  Executed: ${successCount}`);
    if (skipCount > 0) {
      console.log(`  Skipped:  ${skipCount}`);
    }
    console.log();

    return true;
  }

  /**
   * Execute a single step with timeout and output capture
   */
  private executeStep(step: WorkflowStep, stepIndex: number, projectDir: string): Promise<StepResult> {
    return new Promise((resolve) => {
      const cwd = step.cwd ? path.resolve(projectDir, step.cwd) : projectDir;
      let stdout = '';
      let stderr = '';
      const startTime = Date.now();

      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const shellArg = process.platform === 'win32' ? '/c' : '-c';

      const proc = child_process.spawn(shell, [shellArg, step.command], {
        cwd,
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout: 5 * 60 * 1000, // 5 minute timeout
      });

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const duration = Date.now() - startTime;
        resolve({
          stepIndex,
          command: step.command,
          exitCode: code ?? 1,
          stdout,
          stderr,
          duration,
        });
      });

      proc.on('error', (err) => {
        const duration = Date.now() - startTime;
        resolve({
          stepIndex,
          command: step.command,
          exitCode: 1,
          stdout,
          stderr: err.message,
          duration,
        });
      });
    });
  }

  /**
   * Get executed steps (for rollback/undo functionality)
   */
  getExecutedSteps(): StepResult[] {
    return [...this.executedSteps];
  }

  /**
   * Abort current execution
   */
  abort(): void {
    this.aborted = true;
  }
}

