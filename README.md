# TraceEnv

> **Clone. Run `trace`. Done.**

TraceEnv automatically reconstructs your development environment from a cloned repository.

Instead of manually running:
```bash
npm install
docker compose up
cp .env.example .env
npm run dev
```

Just run:
```bash
trace
```

TraceEnv extracts the setup commands from your repository, asks for confirmation, and executes them automatically.

**Everything runs locally.** No cloud, no telemetry, no data leaves your machine.

---

## The Workflow

**For Project Creators:**

1. Work normally on your project
2. TraceEnv daemon watches and records successful commands
3. When done, commit `setup.sh` and deployment metadata to your repo
4. Done

**For New Developers:**

1. Clone the repository
2. Run `trace`
3. TraceEnv shows the setup plan
4. Press Y to execute automatically
5. Environment is ready

## How It Works

**Behind the scenes:**

1. TraceEnv daemon runs in background, capturing successful terminal commands
2. Commands are stored locally in SQLite (project-specific)
3. When `trace` is called, TraceEnv:
   - Detects the repository
   - Loads stored setup commands
   - Displays them to the user with a plan
   - Asks for confirmation
   - Executes each step sequentially
   - Reports success/failure for each step
   - Stops on first error (safe)

**That's it.**

## Quick Start

### For Project Creators

**1. Install TraceEnv**

```bash
npm install -g traceenv
```

**2. Start daemon**

```bash
traceenv daemon start
```

**3. Work normally**

```bash
git init my-project
cd my-project

# Your normal setup workflow
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

TraceEnv watches and records each successful step.

**4. When done, commit metadata**

```bash
git add .traceenv.json setup.sh
git commit -m "chore: add environment setup metadata"
git push
```

---

### For New Developers

**1. Clone repository**

```bash
git clone https://github.com/someone/my-project.git
cd my-project
```

**2. Run trace**

```bash
trace
```

**3. See the setup plan**

```
TraceEnv detected project environment.

Analyzing setup instructions...

Found 4 setup steps:

1. cp .env.example .env
2. docker compose up -d
3. npm install
4. npm run dev

Run these commands now? (Y/n)
```

**4. Press Y**

```
Executing setup...

[1/4] cp .env.example .env
âœ“ Completed

[2/4] docker compose up -d
âœ“ Containers started

[3/4] npm install
âœ“ Dependencies installed

[4/4] npm run dev
âœ“ Development server running

Environment setup completed.
```

**Done.** Everything is running.

## Installation

### Requirements

- Node.js 18+
- npm 8+

### Install Globally

```bash
npm install -g traceenv
traceenv --version
```

### Install in Project

```bash
npm install --save-dev traceenv
npx traceenv --version
```

### From Source

```bash
git clone https://github.com/Arjun-Walia/TraceEnv.git
cd TraceEnv
npm install
npm run build

node dist/cli/index.js --help
```

## Commands

### `trace` (Main Command)

Automatically execute the setup workflow in current directory.

```bash
trace
```

**What it does:**
1. Detects if current directory is a TraceEnv-enabled repository
2. Loads setup commands from `.traceenv.json` or `setup.sh`
3. Displays the setup plan with all steps
4. Asks for confirmation
5. Executes each step sequentially
6. Reports progress and handles errors

**Example output:**

```
TraceEnv detected project environment.

Analyzing setup instructions...

Found 4 setup steps:

1. cp .env.example .env
2. docker compose up -d
3. npm install
4. npm run dev

Run these commands now? (Y/n) > y

Executing setup...

[1/4] cp .env.example .env
âœ“ Completed

[2/4] docker compose up -d
Pulling images... done
âœ“ Containers started

[3/4] npm install
Added 523 packages... done
âœ“ Dependencies installed

[4/4] npm run dev
Server running on http://localhost:3000
âœ“ Development server running

Environment setup completed.
```

**Safety:**
- Shows all commands before execution
- Requires user confirmation
- Stops on first error
- Reports what went wrong

---

### `traceenv record`

Manually save current successful workflow.

```bash
traceenv record --dir ~/my-project
```

Extracts the last N successful commands and stores them as the setup sequence.

---

### `traceenv synthesize`

Generate `setup.sh` and `SETUP.md` from recorded commands (optional).

```bash
traceenv synthesize --dir ~/my-project
```

Creates:
- `setup.sh` (executable script)
- `SETUP.md` (documentation)
- `.traceenv.json` (metadata)

---

### `traceenv daemon`

Manage the background daemon.

```bash
traceenv daemon start   # Start background daemon
traceenv daemon status  # Check if running
traceenv daemon stop    # Stop daemon
```

The daemon runs on `localhost:7842` and records successful commands.

---

### `traceenv install-hooks`

Install shell hooks for automatic command capture.

```bash
traceenv install-hooks --shell bash
source ~/.bashrc
```

Optional but recommended for automatic tracking.

---

### `traceenv config`

View and change settings.

```bash
traceenv config                    # View current config
traceenv config --shell zsh        # Change shell
traceenv config --port 8080        # Change daemon port
```

Config file: `~/.traceenv/config.json`

## Repository Setup Files

When you commit to your repository, TraceEnv creates:

### `.traceenv.json` (Required)

Stores the setup workflow for this project.

```json
{
  "version": "1",
  "workflow": [
    {
      "command": "cp .env.example .env",
      "cwd": "/path/to/project",
      "description": "Setup environment variables"
    },
    {
      "command": "docker compose up -d",
      "cwd": "/path/to/project",
      "description": "Start Docker services"
    },
    {
      "command": "npm install",
      "cwd": "/path/to/project",
      "description": "Install dependencies"
    },
    {
      "command": "npm run dev",
      "cwd": "/path/to/project",
      "description": "Start development server"
    }
  ],
  "prerequisites": [
    "Node.js 18+",
    "Docker",
    "Docker Compose"
  ],
  "estimatedTime": "5 minutes"
}
```

### `setup.sh` (Optional)

Executable script for manual setup (useful as fallback).

```bash
#!/usr/bin/env bash
set -euo pipefail

cp .env.example .env
docker compose up -d
npm install
npm run dev

echo "Setup complete!"
```

### `SETUP.md` (Optional)

Human-readable setup guide.

```markdown
# Project Setup

Run this command to setup your environment:

\`\`\`bash
trace
\`\`\`

Or manually:

\`\`\`bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
\`\`\`

## Prerequisites

- Node.js 18+
- Docker
- Docker Compose
```

---

## Global config

Stored on your machine:

```
~/.traceenv/
â”œâ”€â”€ config.json              # Your settings
â”œâ”€â”€ commands.db              # Command history
â”œâ”€â”€ daemon.pid               # Daemon process
â”œâ”€â”€ hooks/                   # Shell hooks
â”‚   â”œâ”€â”€ bash_hook.sh
â”‚   â””â”€â”€ zsh_hook.zsh
â””â”€â”€ cache/                   # Cache directory
```

## Troubleshooting

**`trace` command not found?**

```bash
npm install -g traceenv
```

---

**"No setup metadata found"?**

The repository doesn't have `.traceenv.json`. Either:

1. Creator hasn't recorded the setup yet:
   ```bash
   traceenv record --dir .
   git add .traceenv.json
   git commit -m "chore: add setup metadata"
   ```

2. Or record manually from setup.sh:
   ```bash
   traceenv record --from setup.sh
   ```

---

**A command failed during trace?**

TraceEnv stops at the first error and shows:

```
Command failed: docker compose up -d

Reason: Docker daemon not running

Resolution: Start Docker daemon and try again
```

Fix the issue, then run `trace` again. It will resume.

---

**Permissions denied on setup.sh?**

```bash
chmod +x setup.sh
trace
```

---

**Want to skip a step?**

```bash
trace --skip 2
```

This skips step 2 in the setup sequence.

---

**Dry run (show what would execute)?**

```bash
trace --dry-run
```

Shows the plan without executing.

## Tech Stack

| Part | Tech |
|------|------|
| Runtime | Node.js 18+ |
| Language | TypeScript |
| Database | SQLite (Node built-in) |
| CLI | Commander.js |
| Server | Node http |
| AI (optional) | Qwen2.5-Coder GGUF |

## FAQ

**How do I make `trace` available globally?**

```bash
npm install -g traceenv
```

Then `trace` works from anywhere.

---

**Can I use `trace` without installing hooks?**

Yes. The project creator can manually run `traceenv record --dir .` to save the setup workflow to `.traceenv.json`.

---

**What if a command fails during setup?**

TraceEnv stops immediately and shows the error. You can fix the issue and run `trace` again. It remembers where it stopped.

---

**How do I test the setup before committing?**

Run `trace --dry-run` to see what would execute without actually running it.

---

**Can I modify `.traceenv.json` manually?**

Yes. It's a regular JSON file. Just edit it and save.

---

**Does this work on Windows?**

Bash/Zsh only. Use WSL (Windows Subsystem for Linux) for Windows machines. See [#45](https://github.com/Arjun-Walia/TraceEnv/issues/45) for native PowerShell support.

---

**Can multiple team members use `trace` on the same project?**

Yes. Each developer clones the repo, runs `trace`, and their environment is set up identically. The `.traceenv.json` is committed to the repo.

---

**What if I want different setup for different branches?**

Create different `.traceenv.json` files per branch, or use conditional logic in the workflow array.

---

**How do I know which version of TraceEnv created my setup?**

Check the `version` field in `.traceenv.json`. It's included automatically.

---

**Can I rollback setup if something goes wrong?**

Use `trace --undo` (if last run failed) or manually undo commands. Future versions may add auto-rollback.

## License

MIT
