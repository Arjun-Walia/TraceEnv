# TraceEnv

> **Documentation should be executed, not remembered.**

TraceEnv watches your terminal commands and automatically generates setup documentation (`setup.sh` + `SETUP.md`).

**The problem:** Your README's setup instructions are always outdated. Your actual workflow has extra steps nobody documented.

**The solution:** TraceEnv records successful commands → filters out the noise → generates accurate docs.

**Everything runs locally.** No cloud, no telemetry, no data leaves your machine.

---

## How It Works

**Simple flow:**
1. You run commands in your terminal (normally)
2. Shell hooks send them to TraceEnv daemon
3. Daemon stores them in local SQLite
4. You run `traceenv synthesize`
5. TraceEnv filters noise and generates `setup.sh` + `SETUP.md`
6. Commit to your repo

**That's it.**

## What You Get

- **setup.sh** - Executable script with all prerequisites and commands
- **SETUP.md** - Human-readable setup guide
- **Git-friendly** - Commit both files to your repo
- **Accurate** - Based on actual working commands, not guesses

## Quick Start

### 1. Install

```bash
npm install -g traceenv
```

### 2. First Run (Auto Demo)

```bash
traceenv synthesize
```

This shows you exactly how TraceEnv works with a sample project. **Runs once, then it's done.**

### 3. Set Up Hooks (Optional)

To automatically capture your actual commands:

```bash
# Bash
traceenv install-hooks --shell bash
source ~/.bashrc

# Zsh
traceenv install-hooks --shell zsh
source ~/.zshrc
```

### 4. Use It

```bash
# Work normally
cd my-project
cp .env.example .env
docker compose up -d
npm install
npm run dev

# Generate docs
traceenv synthesize --dir ~/my-project

# Commit to repo
git add setup.sh SETUP.md
git commit -m "docs: add generated setup instructions"
```

**Done.** Your repo now has accurate setup docs.

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

### `traceenv synthesize`

Generate documentation from commands.

```bash
# Current directory
traceenv synthesize

# Specific project
traceenv synthesize --dir ~/my-project --output ~/my-project
```

**Generates:**
- `setup.sh` (executable script)
- `SETUP.md` (readable guide)

### `traceenv install-hooks`

Capture commands automatically.

```bash
traceenv install-hooks --shell bash
```

Hooks into `~/.bashrc` or `~/.zshrc`. Commands are sent to daemon automatically.

### `traceenv daemon`

Manage the background daemon.

```bash
traceenv daemon start   # Start background daemon
traceenv daemon status  # Check if running
traceenv daemon stop    # Stop daemon
```

The daemon runs on `localhost:7842` and stores commands in SQLite.

### `traceenv config`

View and change settings.

```bash
traceenv config                    # View current config
traceenv config --shell zsh        # Change shell
traceenv config --port 8080        # Change daemon port
```

Config file: `~/.traceenv/config.json`

### `traceenv model`

Check LLM models (optional).

```bash
traceenv model info
```

Without a model, TraceEnv uses rule-based analysis (works fine). Optional AI improves accuracy.

## Setup

### Where Things Live

```
~/.traceenv/
├── config.json              # Settings
├── commands.db              # Command history (SQLite)
├── daemon.pid               # Daemon process ID
├── hooks/                   # Shell hooks
│   ├── bash_hook.sh
│   └── zsh_hook.zsh
└── models/                  # LLM models (optional)
```

### Configuration (config.json)

```json
{
  "shell": "bash",
  "storage": "/Users/user/.traceenv/commands.db",
  "daemonPort": 7842,
  "privacy": {
    "telemetry": false
  }
}
```

### Environment Variables

```bash
export TRACEENV_PORT=8080           # Override daemon port
export TRACEENV_HOME=/custom/path   # Custom config directory
```

## Troubleshooting

**Daemon not running?**
```bash
traceenv daemon start
traceenv daemon status
```

**No commands found?**
```bash
# Make sure hooks are installed
traceenv install-hooks --shell bash
source ~/.bashrc

# Then run commands and try again
traceenv synthesize --dir ~/my-project
```

**"SQLite is experimental" warning?**
Normal on Node.js 24+. Harmless, doesn't affect anything.

**Daemon won't stop?**
```bash
# Force kill it
ps aux | grep traceenv
kill -9 <PID>
rm ~/.traceenv/daemon.pid
```

**Generated script doesn't work?**
- Check prerequisites are installed
- Review generated `SETUP.md`
- Make sure you ran it in the right directory

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

**Cloud upload?** No. Local only.

**Need AI model?** No. Rule-based analysis works fine by default.

**Failed commands excluded?** Yes. Only successful commands are used.

**How often to run?** Whenever your setup changes.

**All platforms?** Bash/Zsh on Linux/macOS. WSL on Windows.

## License

MIT

```bash
npm install
npm run build
```

Start the background daemon:

```bash
node dist/cli/index.js daemon start
```

## Basic Usage

Start TraceEnv:

```bash
node dist/cli/index.js daemon start
```

Work normally in your terminal (Bash or Zsh with hooks installed):

```bash
git clone https://github.com/example/project
cd project
npm install
docker compose up -d
npm run dev
```

After a successful workflow, synthesize documentation:

```bash
node dist/cli/index.js synthesize --dir /path/to/project --output /path/to/project
```

Generated output:

```text
Generated setup.sh
Generated SETUP.md
```

## Example Output

### setup.sh

```bash
#!/usr/bin/env bash

set -euo pipefail

docker compose up -d
npm install
```

### SETUP.md

````md
# Project Setup

Run the following command to initialize the environment:

```bash
bash setup.sh
```

Prerequisites:

- Docker
- Node.js v18+
````

## Configuration

TraceEnv stores configuration in:

```text
~/.traceenv/config.json
```

Example:

```json
{
  "shell": "zsh",
  "storage": "~/.traceenv/commands.db",
  "model": "qwen2.5-coder",
  "daemonPort": 7842,
  "privacy": {
    "telemetry": false
  }
}
```

## Project Structure

```text
traceenv
|
|-- daemon
|   |-- command-capture
|   |-- workflow-analyzer
|   '-- synthesis-engine
|
|-- storage
|   '-- sqlite
|
|-- ai
|   '-- llama.cpp integration
|
|-- generators
|   |-- setup-script
|   '-- readme-generator
|
'-- cli
```

## Privacy and Security

TraceEnv follows a strict local-first security model.

Guarantees:

- no cloud processing
- no telemetry collection
- no command logging outside your machine
- no external API calls

All analysis occurs locally using embedded models.

## Contributing

Contributions are welcome.

Steps:

```bash
git clone https://github.com/your-org/traceenv
cd traceenv
npm install
npm run dev
```

Please open issues for:

- bug reports
- feature requests
- architecture improvements

## License

MIT License

## Philosophy

Infrastructure should be reproducible.

Documentation should be generated from execution, not memory.

TraceEnv ensures that repository instructions reflect what actually works.
