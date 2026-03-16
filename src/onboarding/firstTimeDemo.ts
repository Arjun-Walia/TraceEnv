import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';

import { CONFIG_DIR, ensureConfigDir } from '../config';

const DEMO_STATE_FILE = path.join(CONFIG_DIR, '.demo-run');
const DEMO_PROJECT_DIR = path.join(CONFIG_DIR, 'demo-project');

export interface DemoCommand {
  command: string;
  cwd: string;
  exitCode: number;
  timestamp: number;
}

const DEMO_WORKFLOW: DemoCommand[] = [
  {
    command: 'cp .env.example .env',
    cwd: DEMO_PROJECT_DIR,
    exitCode: 0,
    timestamp: Date.now() - 3000,
  },
  {
    command: 'docker compose up -d',
    cwd: DEMO_PROJECT_DIR,
    exitCode: 0,
    timestamp: Date.now() - 2000,
  },
  {
    command: 'npm install',
    cwd: DEMO_PROJECT_DIR,
    exitCode: 0,
    timestamp: Date.now() - 1000,
  },
  {
    command: 'npm run dev',
    cwd: DEMO_PROJECT_DIR,
    exitCode: 0,
    timestamp: Date.now(),
  },
];

export function hasRunDemo(): boolean {
  return fs.existsSync(DEMO_STATE_FILE);
}

export function markDemoAsRun(): void {
  fs.writeFileSync(DEMO_STATE_FILE, JSON.stringify({ runAt: new Date().toISOString() }), 'utf-8');
}

export async function seedDemoCommands(daemonPort: number): Promise<void> {
  const sessionId = `demo-session-${Date.now()}`;

  for (const cmd of DEMO_WORKFLOW) {
    await postCommandToDaemon(daemonPort, {
      command: cmd.command,
      cwd: cmd.cwd,
      exitCode: cmd.exitCode,
      sessionId,
    });

    // Small delay between seeding commands for effect
    await sleep(150);
  }
}

async function postCommandToDaemon(
  port: number,
  payload: {
    command: string;
    cwd: string;
    exitCode: number;
    sessionId: string;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:${port}/command`);
    const options = {
      hostname: '127.0.0.1',
      port,
      path: '/command',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 4000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(4000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

export function setupDemoDirectory(): void {
  ensureConfigDir();

  if (fs.existsSync(DEMO_PROJECT_DIR)) {
    // Clean existing demo directory
    fs.rmSync(DEMO_PROJECT_DIR, { recursive: true, force: true });
  }

  // Create demo project directory structure
  fs.mkdirSync(DEMO_PROJECT_DIR, { recursive: true });

  // Create a mock .env.example file
  const envExample = `# Example environment file
NODE_ENV=development
DEBUG=false
DATABASE_URL=postgresql://localhost:5432/myapp
`;
  fs.writeFileSync(path.join(DEMO_PROJECT_DIR, '.env.example'), envExample, 'utf-8');

  // Create a mock package.json
  const packageJson = {
    name: 'demo-app',
    version: '1.0.0',
    description: 'Demo project for TraceEnv onboarding',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      'next': '^14.0.0',
      'react': '^18.0.0',
      'react-dom': '^18.0.0',
    },
  };
  fs.writeFileSync(
    path.join(DEMO_PROJECT_DIR, 'package.json'),
    JSON.stringify(packageJson, null, 2),
    'utf-8'
  );

  // Create a mock docker-compose.yml
  const dockerCompose = `version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: password
    ports:
      - '5432:5432'
`;
  fs.writeFileSync(
    path.join(DEMO_PROJECT_DIR, 'docker-compose.yml'),
    dockerCompose,
    'utf-8'
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getDemoProjectDir(): string {
  return DEMO_PROJECT_DIR;
}
