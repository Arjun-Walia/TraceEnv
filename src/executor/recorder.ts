import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { TraceEnvMetadata, WorkflowStep } from './tracer.js';

/**
 * Recorder class handles creating .traceenv.json from various sources
 */
export class Recorder {
  /**
   * Generate metadata from setup.sh file
   * Extracts commands as workflow steps
   */
  static fromSetupScript(setupPath: string): TraceEnvMetadata {
    if (!fs.existsSync(setupPath)) {
      throw new Error(`setup.sh not found at ${setupPath}`);
    }

    const content = fs.readFileSync(setupPath, 'utf-8');
    const lines = content.split('\n');
    const workflow: WorkflowStep[] = [];

    // Skip shebang and set lines, extract actual commands
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip shebang, comments, blank lines, and set commands
      if (
        trimmed.startsWith('#') ||
        trimmed === '' ||
        trimmed.startsWith('set ') ||
        trimmed === 'set -euo pipefail'
      ) {
        continue;
      }

      // Skip conditional/control flow lines
      if (trimmed.startsWith('if ') || trimmed.startsWith('fi') || trimmed === 'then' || trimmed === 'else') {
        continue;
      }

      // Add as workflow step
      workflow.push({
        command: trimmed,
        cwd: '.',
        description: '', // User can add later
      });
    }

    return {
      version: '1.0.0',
      workflow,
      prerequisites: Recorder.detectPrerequisites(workflow),
      estimatedTime: '5-10 minutes',
    };
  }

  /**
   * Generate metadata interactively from common project patterns
   */
  static async interactive(projectDir: string): Promise<TraceEnvMetadata> {
    const rl = readline.createInterface({ input, output });
    const workflow: WorkflowStep[] = [];

    console.log('\n🎯 TraceEnv Setup Recorder\n');
    console.log('I will help you record the setup workflows for your project.\n');
    console.log('Common setup commands detected:\n');

    const commonCommands = Recorder.detectCommonSetupCommands(projectDir);

    if (commonCommands.length === 0) {
      console.log('  No common setup patterns detected.');
      console.log('  You can manually add commands below.\n');
    } else {
      commonCommands.forEach((cmd, idx) => {
        console.log(`  [${idx + 1}] ${cmd}`);
      });
      console.log();
    }

    try {
      // Ask about dependencies
      const copyEnv = await rl.question('Does your project need a .env file? (Y/n) ');
      if (copyEnv.toLowerCase() !== 'n') {
        workflow.push({
          command: 'cp .env.example .env',
          cwd: '.',
          description: 'Setup environment configuration',
        });
      }

      // Check for package.json
      const pkgPath = path.join(projectDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const installDeps = await rl.question('Install npm dependencies? (Y/n) ');
        if (installDeps.toLowerCase() !== 'n') {
          workflow.push({
            command: 'npm install',
            cwd: '.',
            description: 'Install npm dependencies',
          });
        }
      }

      // Check for docker-compose.yml
      const dockerPath = path.join(projectDir, 'docker-compose.yml');
      if (fs.existsSync(dockerPath) || fs.existsSync(path.join(projectDir, 'docker-compose.yaml'))) {
        const docker = await rl.question('Start Docker Compose? (Y/n) ');
        if (docker.toLowerCase() !== 'n') {
          workflow.push({
            command: 'docker compose up -d',
            cwd: '.',
            description: 'Start Docker services',
          });
        }
      }

      // Check for Makefile
      const makefilePath = path.join(projectDir, 'Makefile');
      if (fs.existsSync(makefilePath)) {
        const makeBuild = await rl.question('Run make build? (Y/n) ');
        if (makeBuild.toLowerCase() !== 'n') {
          workflow.push({
            command: 'make build',
            cwd: '.',
            description: 'Build project',
          });
        }
      }

      // Ask for additional commands
      let addMore = true;
      while (addMore) {
        const moreCmd = await rl.question(
          workflow.length > 0
            ? '\nAdd another command? (leave blank to finish) '
            : 'Add a command (leave blank to skip) '
        );

        if (moreCmd.trim() === '') {
          addMore = false;
        } else {
          workflow.push({
            command: moreCmd.trim(),
            cwd: '.',
            description: '',
          });
        }
      }
    } finally {
      rl.close();
    }

    return {
      version: '1.0.0',
      workflow,
      prerequisites: Recorder.detectPrerequisites(workflow),
      estimatedTime: Recorder.estimateTime(workflow),
    };
  }

  /**
   * Detect common setup commands in the project
   */
  private static detectCommonSetupCommands(projectDir: string): string[] {
    const commands: string[] = [];

    // Check for setup files
    const commonSetupFiles = ['setup.sh', 'setup.bash', 'bootstrap.sh', 'install.sh'];
    for (const file of commonSetupFiles) {
      const filePath = path.join(projectDir, file);
      if (fs.existsSync(filePath)) {
        commands.push(`bash ${file} — existing setup script`);
      }
    }

    // Check for package.json
    if (fs.existsSync(path.join(projectDir, 'package.json'))) {
      commands.push('npm install — install npm dependencies');
    }

    // Check for docker-compose
    if (
      fs.existsSync(path.join(projectDir, 'docker-compose.yml')) ||
      fs.existsSync(path.join(projectDir, 'docker-compose.yaml'))
    ) {
      commands.push('docker compose up -d — startup Docker services');
    }

    // Check for Makefile
    if (fs.existsSync(path.join(projectDir, 'Makefile'))) {
      commands.push('make build — build project');
    }

    // Check for Python requirements
    if (fs.existsSync(path.join(projectDir, 'requirements.txt'))) {
      commands.push('pip install -r requirements.txt — install Python dependencies');
    }

    return commands;
  }

  /**
   * Detect prerequisites from workflow commands
   */
  private static detectPrerequisites(workflow: WorkflowStep[]): string[] {
    const prerequisites = new Set<string>();

    workflow.forEach((step) => {
      const cmd = step.command.toLowerCase();

      if (cmd.includes('npm') || cmd.includes('yarn') || cmd.includes('pnpm')) {
        prerequisites.add('Node.js 18+');
      }
      if (cmd.includes('python') || cmd.includes('pip')) {
        prerequisites.add('Python 3.8+');
      }
      if (cmd.includes('docker')) {
        prerequisites.add('Docker');
        if (cmd.includes('docker compose')) {
          prerequisites.add('Docker Compose');
        }
      }
      if (cmd.includes('make')) {
        prerequisites.add('make');
      }
      if (cmd.includes('rustc') || cmd.includes('cargo')) {
        prerequisites.add('Rust');
      }
      if (cmd.includes('go ')) {
        prerequisites.add('Go 1.18+');
      }
    });

    return Array.from(prerequisites);
  }

  /**
   * Estimate setup time based on commands
   */
  private static estimateTime(workflow: WorkflowStep[]): string {
    let totalSeconds = 0;

    workflow.forEach((step) => {
      const cmd = step.command.toLowerCase();

      // Estimate based on command type
      if (cmd.includes('npm install')) totalSeconds += 120; // 2 minutes
      else if (cmd.includes('pip install')) totalSeconds += 60; // 1 minute
      else if (cmd.includes('docker compose')) totalSeconds += 90; // 1.5 minutes
      else if (cmd.includes('make build')) totalSeconds += 120; // 2 minutes
      else totalSeconds += 15; // 15 seconds default
    });

    if (totalSeconds < 60) return 'Less than 1 minute';
    if (totalSeconds < 120) return '1-2 minutes';
    if (totalSeconds < 300) return '2-5 minutes';
    if (totalSeconds < 600) return '5-10 minutes';
    return '10+ minutes';
  }

  /**
   * Save metadata to .traceenv.json
   */
  static save(metadata: TraceEnvMetadata, targetDir: string): string {
    const outputPath = path.join(targetDir, '.traceenv.json');
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
    return outputPath;
  }
}
