#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as child_process from 'child_process';
import * as os from 'os';

import {
  loadConfig,
  saveConfig,
  ensureConfigDir,
  DAEMON_PORT,
  DAEMON_PID_FILE,
  HOOKS_DIR,
  MODELS_DIR,
} from '../config';

const program = new Command();

program
  .name('traceenv')
  .description('Local-first workspace synthesizer')
  .version('0.1.0');

// ─── traceenv daemon ──────────────────────────────────────────────────────────

const daemonCmd = program.command('daemon').description('Manage the TraceEnv daemon');

daemonCmd
  .command('start')
  .description('Start the TraceEnv background daemon')
  .option('-p, --port <port>', 'Port to listen on', String(DAEMON_PORT))
  .action(async (opts: { port: string }) => {
    if (isDaemonRunning()) {
      console.log('[traceenv] Daemon is already running.');
      return;
    }

    ensureConfigDir();
    const port = parseInt(opts.port, 10);
    const daemonEntry = resolveDaemonPath();

    const child = child_process.spawn(process.execPath, [daemonEntry], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, TRACEENV_PORT: String(port) },
    });

    child.unref();
    fs.writeFileSync(DAEMON_PID_FILE, String(child.pid));

    // Wait briefly and verify the HTTP endpoint is responding
    await sleep(1200);
    try {
      await httpGet(`http://127.0.0.1:${port}/health`);
      console.log(`[traceenv] Daemon started (PID: ${child.pid}, port: ${port})`);
    } catch {
      console.error('[traceenv] Daemon process spawned but HTTP health check failed.');
      console.error('           Check that the port is free and the build is up to date (npm run build).');
      process.exit(1);
    }
  });

daemonCmd
  .command('stop')
  .description('Stop the TraceEnv daemon')
  .action(() => {
    if (!fs.existsSync(DAEMON_PID_FILE)) {
      console.log('[traceenv] No daemon PID file found — daemon may not be running.');
      return;
    }

    const pid = parseInt(fs.readFileSync(DAEMON_PID_FILE, 'utf-8').trim(), 10);
    try {
      process.kill(pid, 'SIGTERM');
      fs.unlinkSync(DAEMON_PID_FILE);
      console.log(`[traceenv] Daemon stopped (PID: ${pid})`);
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ESRCH') {
        console.log('[traceenv] Daemon was not running.');
        fs.unlinkSync(DAEMON_PID_FILE);
      } else {
        console.error('[traceenv] Failed to stop daemon:', e.message);
        process.exit(1);
      }
    }
  });

daemonCmd
  .command('status')
  .description('Show daemon status')
  .action(async () => {
    const config = loadConfig();
    if (!isDaemonRunning()) {
      console.log('[traceenv] Daemon is NOT running.');
      return;
    }
    try {
      const raw = await httpGet(`http://127.0.0.1:${config.daemonPort}/health`);
      const info = JSON.parse(raw) as { status: string; pid: number };
      console.log(`[traceenv] Daemon is running — PID: ${info.pid}, status: ${info.status}`);
    } catch {
      console.log('[traceenv] Daemon process exists but HTTP endpoint is not responding.');
    }
  });

// ─── traceenv synthesize ──────────────────────────────────────────────────────

program
  .command('synthesize')
  .description('Analyse command history and generate setup documentation')
  .option('-d, --dir <dir>', 'Project directory to analyse', process.cwd())
  .option('-o, --output <dir>', 'Output directory for generated files', process.cwd())
  .action(async (opts: { dir: string; output: string }) => {
    const { analyzeWorkflow } = await import('../workflow/analyzer.js');
    const { synthesize } = await import('../ai/llm.js');
    const { generateSetupScript } = await import('../generators/setup.js');
    const { generateReadme } = await import('../generators/readme.js');
    const { TRACEENV_LOGO, ANALYSIS_SPINNER, GENERATION_SPINNER, SUCCESS_SCREEN } = await import('../ui/animations.js');
    const terminalModule = await import('../ui/terminal.js');
    const TerminalUI = terminalModule.TerminalUI;

    const targetDir = path.resolve(opts.dir);
    const outputDir = path.resolve(opts.output);
    const ui = new TerminalUI();

    // Show logo
    console.log(TRACEENV_LOGO);

    console.log(`📍 Project: ${path.basename(targetDir)}\n`);

    // Analyze
    console.log('Reading command history...\n');
    const workflow = analyzeWorkflow(targetDir);

    if (workflow.commands.length === 0) {
      ui.error('No commands found for this directory.');
      console.log('Make sure the daemon is running and you have executed setup commands in your shell.\n');
      process.exit(1);
    }

    console.log(`✓ Found ${workflow.commands.length} relevant commands\n`);

    // Synthesize with spinner
    const spinner = ui.spinner(ANALYSIS_SPINNER, 'Analyzing workflow...');
    await new Promise(resolve => setTimeout(resolve, 1200));
    const result = await synthesize(workflow.commands, targetDir);
    spinner.stop();

    console.log('✓ Analysis complete\n');

    // Generate
    const genSpinner = ui.spinner(GENERATION_SPINNER, 'Generating documentation...');
    await new Promise(resolve => setTimeout(resolve, 1200));
    fs.mkdirSync(outputDir, { recursive: true });
    const setupPath = generateSetupScript(result, outputDir);
    const readmePath = generateReadme(result, path.basename(targetDir), outputDir);
    genSpinner.stop();

    // Success
    console.log('\n' + SUCCESS_SCREEN);
    console.log(`📁 Output directory: ${outputDir}\n`);
  });

// ─── traceenv install-hooks ───────────────────────────────────────────────────

program
  .command('install-hooks')
  .description('Install shell hooks so TraceEnv can capture commands')
  .option('-s, --shell <shell>', 'Shell to configure: bash | zsh', 'bash')
  .action((opts: { shell: string }) => {
    ensureConfigDir();
    if (opts.shell === 'bash') {
      installHook('bash');
    } else if (opts.shell === 'zsh') {
      installHook('zsh');
    } else {
      console.error('[traceenv] Unsupported shell. Use --shell bash or --shell zsh.');
      process.exit(1);
    }
  });

// ─── traceenv config ──────────────────────────────────────────────────────────

program
  .command('config')
  .description('View or update TraceEnv configuration')
  .option('--shell <shell>', 'Set default shell (bash | zsh)')
  .option('--port <port>', 'Set daemon port')
  .action((opts: { shell?: string; port?: string }) => {
    const config = loadConfig();
    let changed = false;

    if (opts.shell) {
      config.shell = opts.shell as 'bash' | 'zsh';
      changed = true;
    }
    if (opts.port) {
      config.daemonPort = parseInt(opts.port, 10);
      changed = true;
    }

    if (changed) {
      saveConfig(config);
      console.log('[traceenv] Configuration updated.');
    }

    console.log('\nCurrent configuration:');
    console.log(JSON.stringify(config, null, 2));
  });

// ─── traceenv model ───────────────────────────────────────────────────────────

program
  .command('model')
  .description('Manage the local LLM model')
  .command('info')
  .description('Show model directory and currently loaded model')
  .action(() => {
    console.log(`Model directory: ${MODELS_DIR}`);
    if (!fs.existsSync(MODELS_DIR)) {
      console.log('No models directory found.');
      return;
    }
    const models = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.gguf'));
    if (models.length === 0) {
      console.log('No GGUF models found.');
      console.log('Download a Qwen2.5-Coder GGUF from https://huggingface.co and place it there.');
    } else {
      console.log('Available models:');
      models.forEach((m) => console.log(`  ${m}`));
    }
  });

// ─── helpers ──────────────────────────────────────────────────────────────────

function resolveDaemonPath(): string {
  // dist/cli/index.js  →  dist/daemon/index.js
  const compiled = path.join(__dirname, '..', 'daemon', 'index.js');
  if (fs.existsSync(compiled)) return compiled;
  throw new Error(
    'Daemon entry point not found. Run `npm run build` before starting the daemon.'
  );
}

function isDaemonRunning(): boolean {
  if (!fs.existsSync(DAEMON_PID_FILE)) return false;
  try {
    const pid = parseInt(fs.readFileSync(DAEMON_PID_FILE, 'utf-8').trim(), 10);
    if (isNaN(pid)) return false;
    process.kill(pid, 0); // signal 0 only checks process existence
    return true;
  } catch {
    return false;
  }
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(4000, () => {
      req.destroy();
      reject(new Error('HTTP timeout'));
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function installHook(shell: 'bash' | 'zsh'): void {
  const ext = shell === 'bash' ? 'sh' : 'zsh';
  const hookFile = path.join(HOOKS_DIR, `${shell}_hook.${ext}`);
  const rcFile = path.join(
    os.homedir(),
    shell === 'bash' ? '.bashrc' : '.zshrc'
  );

  const hookContent = shell === 'bash' ? bashHook() : zshHook();
  fs.writeFileSync(hookFile, hookContent, { mode: 0o644 });

  const sourceLine = `\n# TraceEnv hook\nsource "${hookFile}"\n`;
  const existing = fs.existsSync(rcFile) ? fs.readFileSync(rcFile, 'utf-8') : '';

  if (!existing.includes('TraceEnv hook')) {
    fs.appendFileSync(rcFile, sourceLine);
    console.log(
      `[traceenv] ${shell} hook installed.\n` +
        `           Activate now: source ~/${shell === 'bash' ? '.bashrc' : '.zshrc'}`
    );
  } else {
    console.log(`[traceenv] ${shell} hook already present in rc file.`);
  }
}

function bashHook(): string {
  return `#!/usr/bin/env bash
# TraceEnv Bash Hook — auto-generated, do not edit

TRACEENV_PORT=\${TRACEENV_PORT:-7842}
export TRACEENV_SESSION_ID=\${TRACEENV_SESSION_ID:-\$(date +%s%N)-\$\$}

_traceenv_precmd() {
  local _exit=\$?
  local _cmd
  _cmd=\$(HISTTIMEFORMAT='' history 1 2>/dev/null | sed 's/^[[:space:]]*[0-9]*[[:space:]]*//')
  [ -z "\$_cmd" ] && return
  curl -s -X POST "http://127.0.0.1:\${TRACEENV_PORT}/command" \\
    -H 'Content-Type: application/json' \\
    --data-binary "{\\\"command\\\":\\\"\${_cmd//\\\"/\\\\\\\"}\\\",\\\"cwd\\\":\\\"\${PWD//\\\"/\\\\\\\"}\\\",\\\"exitCode\\\":\${_exit},\\\"sessionId\\\":\\\"\${TRACEENV_SESSION_ID}\\\"}" \\
    2>/dev/null &
}

PROMPT_COMMAND="_traceenv_precmd\${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
`;
}

function zshHook(): string {
  return `#!/usr/bin/env zsh
# TraceEnv Zsh Hook — auto-generated, do not edit

TRACEENV_PORT=\${TRACEENV_PORT:-7842}
export TRACEENV_SESSION_ID=\${TRACEENV_SESSION_ID:-\$(date +%s%N)-\$\$}

_traceenv_precmd() {
  local _exit=\$?
  local _cmd=\$(fc -ln -1 2>/dev/null)
  [ -z "\$_cmd" ] && return
  curl -s -X POST "http://127.0.0.1:\${TRACEENV_PORT}/command" \\
    -H 'Content-Type: application/json' \\
    --data-binary "{\\\"command\\\":\\\"\${_cmd//\\\"/\\\\\\\"}\\\",\\\"cwd\\\":\\\"\${PWD//\\\"/\\\\\\\"}\\\",\\\"exitCode\\\":\${_exit},\\\"sessionId\\\":\\\"\${TRACEENV_SESSION_ID}\\\"}" \\
    2>/dev/null &
}

autoload -Uz add-zsh-hook
add-zsh-hook precmd _traceenv_precmd
`;
}

// ─── startup handler ──────────────────────────────────────────────────────────

async function runFirstTimeDemo(): Promise<void> {
  const { hasRunDemo, markDemoAsRun, setupDemoDirectory, getDemoProjectDir, seedDemoCommands } =
    await import('../onboarding/firstTimeDemo.js');

  if (hasRunDemo()) {
    return;
  }

  // Check if daemon is running; if not, start it
  if (!isDaemonRunning()) {
    startDaemonSync();
    await sleep(1500);
  }

  const config = loadConfig();
  setupDemoDirectory();
  const demoProjDir = getDemoProjectDir();

  console.log('\n🎬 Welcome to TraceEnv!\n');
  console.log('This is an interactive demonstration of how TraceEnv works.\n');
  console.log('I\'m simulating a typical developer workflow...\n');

  const { TRACEENV_LOGO } = await import('../ui/animations.js');
  console.log(TRACEENV_LOGO);

  const terminalModule = await import('../ui/terminal.js');
  const TerminalUI = terminalModule.TerminalUI;
  const ui = new TerminalUI();

  // Show seeding commands
  console.log('\n📋 Simulated workflow:\n');
  const demoCommands = [
    'cp .env.example .env',
    'docker compose up -d',
    'npm install',
    'npm run dev',
  ];

  demoCommands.forEach((cmd) => {
    console.log(`   • ${cmd}`);
  });

  console.log('\n');

  // Seed commands
  const seedSpinner = ui.spinner(
    [
      '   ⠋',
      '   ⠙',
      '   ⠹',
      '   ⠸',
      '   ⠼',
      '   ⠴',
      '   ⠦',
      '   ⠧',
      '   ⠇',
      '   ⠏',
    ],
    'Sending commands to daemon...'
  );

  try {
    await seedDemoCommands(config.daemonPort);
  } catch (err) {
    seedSpinner.stop();
    console.error('❌ Failed to seed demo commands:', err instanceof Error ? err.message : String(err));
    return;
  }

  seedSpinner.stop();
  console.log('✓ Commands recorded\n');

  // Analyze
  const { analyzeWorkflow } = await import('../workflow/analyzer.js');
  const workflow = analyzeWorkflow(demoProjDir);

  console.log(`✓ Found ${workflow.commands.length} commands\n`);

  // Synthesize with spinner
  const { synthesize } = await import('../ai/llm.js');
  const spinner = ui.spinner(
    [
      '   ▹▹▹▹▹',
      '   ▸▹▹▹▹',
      '   ▹▸▹▹▹',
      '   ▹▹▸▹▹',
      '   ▹▹▹▸▹',
      '   ▹▹▹▹▸',
    ],
    'Analyzing workflow...'
  );

  await new Promise(resolve => setTimeout(resolve, 1200));
  const result = await synthesize(workflow.commands, demoProjDir);
  spinner.stop();

  console.log('✓ Analysis complete\n');

  // Generate
  const { generateSetupScript } = await import('../generators/setup.js');
  const { generateReadme } = await import('../generators/readme.js');

  const genSpinner = ui.spinner(
    [
      '   ⠋',
      '   ⠙',
      '   ⠹',
      '   ⠸',
      '   ⠼',
      '   ⠴',
      '   ⠦',
      '   ⠧',
      '   ⠇',
      '   ⠏',
    ],
    'Generating documentation...'
  );

  await new Promise(resolve => setTimeout(resolve, 1200));

  const outputDir = demoProjDir;
  generateSetupScript(result, outputDir);
  generateReadme(result, 'demo-app', outputDir);

  genSpinner.stop();

  // Show generated files
  console.log('✓ Generated documentation\n');

  console.log('Generated files:\n');
  console.log(`  📄 ${path.join(outputDir, 'setup.sh')}`);
  console.log(`  📄 ${path.join(outputDir, 'SETUP.md')}\n`);

  // Display setup.sh preview
  const setupPath = path.join(outputDir, 'setup.sh');
  if (fs.existsSync(setupPath)) {
    const setupContent = fs.readFileSync(setupPath, 'utf-8');
    console.log('Preview of generated setup.sh:\n');
    console.log('─'.repeat(60));
    console.log(setupContent.split('\n').slice(0, 15).join('\n'));
    console.log('─'.repeat(60));
    console.log('');
  }

  // Summary
  console.log('🎉 TraceEnv is ready!\n');
  console.log('Next steps:\n');
  console.log('  1. Install shell hooks:');
  console.log('     $ traceenv install-hooks --shell bash\n');
  console.log('  2. Run commands in your terminal');
  console.log('  3. Generate docs from real workflows:');
  console.log('     $ traceenv synthesize --dir ~/my-project\n');
  console.log('  Docs: https://github.com/Arjun-Walia/TraceEnv\n');

  markDemoAsRun();
}

function startDaemonSync(): void {
  if (isDaemonRunning()) {
    return;
  }

  ensureConfigDir();
  const config = loadConfig();
  const daemonEntry = resolveDaemonPath();

  const child = child_process.spawn(process.execPath, [daemonEntry], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, TRACEENV_PORT: String(config.daemonPort) },
  });

  child.unref();
  fs.writeFileSync(DAEMON_PID_FILE, String(child.pid));
}

// ─── main ──────────────────────────────────────────────────────────────────────

(async () => {
  // Run first-time demo if needed
  await runFirstTimeDemo();

  if (process.argv.length <= 2) {
    program.outputHelp();
    process.exit(0);
  }

  program.parse(process.argv);
})();

