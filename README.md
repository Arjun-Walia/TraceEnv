# TraceEnv

<div align="center">

![TraceEnv Logo](https://raw.githubusercontent.com/Arjun-Walia/TraceEnv/main/ONBOARDING.md)

**Documentation should be executed, not remembered.**

A local-first developer tool that automatically generates reproducible setup documentation from real terminal workflows.

[Features](#features) • [Quick Start](#quick-start) • [Installation](#installation) • [Usage](#usage) • [Documentation](#documentation)

</div>

---

## The Problem

Documentation drift is a universal developer pain point.

Your README says:
```bash
npm install
npm run dev
```

But the actual working environment requires:
```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

This gap causes:
- ❌ Broken onboarding for new team members
- ❌ Wasted time debugging environment issues
- ❌ Inconsistent setups across machines
- ❌ Outdated documentation that nobody trusts

**TraceEnv solves this by generating documentation directly from what actually works.**

---

## What is TraceEnv?

TraceEnv is an intelligent CLI tool that observes your terminal activity and automatically generates accurate, reproducible setup documentation.

**Key insight:** Your terminal history IS your documentation. TraceEnv just extracts and structures it.

Instead of manually writing setup steps, you:
1. **Run your workflow naturally** in the terminal
2. **TraceEnv watches** successful commands
3. **AI synthesizes** the minimal reproducible steps
4. **Generates** setup.sh and SETUP.md automatically

Everything runs **100% locally** — no cloud, no APIs, no data leaving your machine.

---

## Features

### 🚀 Zero-Setup Onboarding

The first time you run TraceEnv, an interactive demo automatically shows you how it works:

```bash
$ traceenv synthesize
```

TraceEnv:
- ✅ Creates a sample project
- ✅ Seeds example commands
- ✅ Generates documentation in real-time
- ✅ Shows you the output

**One-time only** — on subsequent runs it stays out of the way.

### 🔒 Privacy-First Architecture

- **Local-only computation** — No cloud inference, no external APIs
- **No telemetry** — Your commands stay on your machine
- **No network dependencies** — Works completely offline
- **SQLite storage** — Simple, portable database format

### 📡 Intelligent Shell Integration

Passively observes your terminal **without slowing you down**:

**Supported shells:**
- Bash (`.bashrc`, `.bash_profile`)
- Zsh (`.zshrc`)

**What it captures:**
- Commands and arguments
- Working directory
- Exit codes
- Execution order
- Session ID for grouping

**One-line installation:**
```bash
traceenv install-hooks --shell bash
```

### 🧠 Smart Noise Filtering

Automatically excludes irrelevant activity:
- ✂️ Failed commands (non-zero exit codes)
- ✂️ Navigation commands (`cd`, `ls`, `pwd`)
- ✂️ Typos and corrections
- ✂️ Git log, help commands
- ✂️ Interactive exploration

**Result:** Only the essential reproducible steps are kept.

### 📚 Automatic Documentation

Generates production-ready artifacts:

**setup.sh** — Executable, shebang-included script
```bash
#!/usr/bin/env bash
set -euo pipefail

# Prerequisites:
#   - Node.js v18+
#   - Docker

cp .env.example .env
docker compose up -d
npm install
npm run dev

echo "Setup complete!"
```

**SETUP.md** — Human-readable markdown guide
```markdown
# Project Setup

Run the generated setup script:
```bash
bash setup.sh
```

Or run the steps manually:
```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

**Prerequisites detected:**
- Node.js v18+
- Docker
```

### 🤖 Optional Local AI Enhancement

Improves analysis accuracy when enabled:

**Included:** Rule-based fallback (always works)
**Optional:** Qwen2.5-Coder GGUF model (AI-powered)

```bash
# Download and enable
# Model size: ~4GB (Qwen2.5-Coder)
traceenv model info
```

---

## How It Works

<div align="center">

```
┌─────────────┐
│   Bash/Zsh  │ ← Commands executed naturally
└──────┬──────┘
       │ Shell hooks (one-time setup)
       ▼
┌──────────────────────────┐
│  TraceEnv Daemon         │ ← Lightweight HTTP server (7842)
│  (runs in background)    │
└──────┬───────────────────┘
       │ Persists / Queries
       ▼
┌──────────────────────────┐
│  Local SQLite Database   │ ← Command history
└──────┬───────────────────┘
       │ Analyzes
       ▼
┌──────────────────────────┐
│  Analysis Engine         │ ← Filters noise, detects prerequisites
└──────┬───────────────────┘
       │ Synthesizes
       ▼
┌──────────────────────────┐
│  Setup Documentation     │ ← setup.sh + SETUP.md
└──────────────────────────┘
```

</div>

### Step-by-Step Execution

**Phase 1: Capture**
1. Shell hooks POST commands to daemon (localhost:7842)
2. Daemon validates and stores in SQLite database
3. Failed commands are recorded but excluded from synthesis

**Phase 2: Analyze**
1. Workflow analyzer queries commands from target directory
2. Smart filters remove noise (navigation, typos, failed attempts)
3. Technology detection identifies prerequisites (Node, Docker, Python, etc.)

**Phase 3: Synthesize**
1. AI model analyzes filtered commands
2. Extracts minimal reproducible sequence
3. Detects which tools are required
4. Generates setup sequence

**Phase 4: Generate**
1. Creates executable `setup.sh` script
2. Creates `SETUP.md` documentation
3. Includes prerequisites and detailed instructions

---

## Quick Start

### 1. Install TraceEnv

<tabs>

**Option A: From npm (recommended)**
```bash
npm install -g traceenv
```

**Option B: From source**
```bash
git clone https://github.com/Arjun-Walia/TraceEnv.git
cd TraceEnv
npm install
npm run build
chmod +x dist/cli/index.js
```

</tabs>

### 2. See It In Action (First Run)

```bash
traceenv synthesize
```

**TraceEnv automatically launches an interactive demo that:**
- Creates a sample project
- Seeds example commands
- Generates documentation
- Shows you the output

This happens **once** on first run, then gets out of the way.

### 3. Install Shell Hooks (Optional but Recommended)

**For Bash:**
```bash
traceenv install-hooks --shell bash
source ~/.bashrc
```

**For Zsh:**
```bash
traceenv install-hooks --shell zsh
source ~/.zshrc
```

**What happens:**
- Hook is installed to `~/.traceenv/hooks/`
- Automatically loads on shell startup
- Sends successful commands to daemon

### 4. Run Your Workflow

Simply work normally:
```bash
cd my-project
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

### 5. Generate Documentation

```bash
traceenv synthesize --dir ~/my-project
```

**Output:**
```
Reading command history...
✓ Found 12 relevant commands

Analyzing workflow...
✓ Analysis complete

Generating documentation...
✓ Generated documentation

Generated files:
  📄 ~/my-project/setup.sh
  📄 ~/my-project/SETUP.md
```

**Then commit to your repo:**
```bash
git add setup.sh SETUP.md
git commit -m "docs: add generated setup documentation"
```

---

## Installation

### System Requirements

- **Node.js**: v18 or higher
- **npm**: v8 or higher
- **OS**: macOS, Linux, Windows (with WSL or PowerShell)
- **Shells**: Bash or Zsh (for hooks)

### Install Methods

#### Global Installation (Recommended)

```bash
npm install -g traceenv
traceenv --help
```

#### Local Project Installation

```bash
npm install --save-dev traceenv
npx traceenv --help
```

#### From Source

```bash
git clone https://github.com/Arjun-Walia/TraceEnv.git
cd TraceEnv
npm install
npm run build

# Run from dist
node dist/cli/index.js --help

# Or make it global
sudo npm link
traceenv --help
```

#### Verify Installation

```bash
traceenv --version
# Output: 0.1.0

traceenv daemon status
# Output: [traceenv] Daemon is NOT running.
```

---

## Usage

### Command Reference

#### `traceenv synthesize`

Generate setup documentation from command history.

```bash
# Analyze current directory
traceenv synthesize

# Analyze specific project
traceenv synthesize --dir ~/my-project

# Output to specific location
traceenv synthesize --dir ~/my-project --output ~/docs

# Alias: shortened form
traceenv synthesize -d ~/my-project -o ~/docs
```

**Options:**
- `-d, --dir <path>` — Project directory to analyze (default: current directory)
- `-o, --output <path>` — Output directory for generated files (default: project directory)

**Output files:**
- `setup.sh` — Executable setup script
- `SETUP.md` — Setup documentation

---

#### `traceenv install-hooks`

Install shell hooks for automatic command capture.

```bash
# Install Bash hooks
traceenv install-hooks --shell bash

# Install Zsh hooks
traceenv install-hooks --shell zsh

# Alias
traceenv install-hooks -s bash
```

**What it does:**
- Creates hook files in `~/.traceenv/hooks/`
- Appends sourcing code to shell rc file (`.bashrc` / `.zshrc`)
- Hooks remain dormant until daemon is running

**To activate hooks immediately:**
```bash
source ~/.bashrc    # Bash
source ~/.zshrc     # Zsh
```

---

#### `traceenv daemon`

Manage the background daemon.

**Start daemon:**
```bash
traceenv daemon start
# [traceenv] Daemon started (PID: 12345, port: 7842)
```

**Check status:**
```bash
traceenv daemon status
# [traceenv] Daemon is running — PID: 12345, status: ok
```

**Stop daemon:**
```bash
traceenv daemon stop
# [traceenv] Daemon stopped (PID: 12345)
```

**Daemon details:**
- Runs in background on `localhost:7842`
- Auto-starts on first `synthesize` command if needed
- Accepts POST requests at `/command` endpoint
- Responds to GET `/health` for status checks

---

#### `traceenv config`

View or update configuration.

**View current config:**
```bash
traceenv config
# {
#   "shell": "bash",
#   "storage": "/Users/user/.traceenv/commands.db",
#   "model": "qwen2.5-coder",
#   "daemonPort": 7842,
#   "privacy": { "telemetry": false }
# }
```

**Update shell:**
```bash
traceenv config --shell zsh
```

**Update daemon port:**
```bash
traceenv config --port 8080
```

**Configuration file location:**
```
~/.traceenv/config.json
```

---

#### `traceenv model`

Manage local LLM models (optional).

**Check model status:**
```bash
traceenv model info
# Model directory: /Users/user/.traceenv/models
# No GGUF models found.
```

**Enable AI synthesis (optional):**
1. Download Qwen2.5-Coder from Hugging Face
2. Place in `~/.traceenv/models/`
3. Restart daemon

Without a model, TraceEnv uses rule-based analysis (which works great for most cases).

---

### Usage Workflows

#### Workflow 1: Quick One-Time Documentation

```bash
# For a simple project:
traceenv synthesize --dir ~/my-project

# Files generated:
# ~/my-project/setup.sh
# ~/my-project/SETUP.md

# Commit them
cd ~/my-project
git add setup.sh SETUP.md
git commit -m "docs: add generated setup instructions"
git push
```

#### Workflow 2: Long-Running Observation

```bash
# 1. Install hooks (one-time)
traceenv install-hooks --shell bash

# 2. Work normally on your project
cd ~/my-project
cp .env.example .env
docker compose up -d
npm install
npm run dev

# 3. When ready, synthesize
traceenv synthesize --dir ~/my-project

# 4. Review, commit, push
git add setup.sh SETUP.md
git commit -m "docs: update setup documentation"
```

#### Workflow 3: Team Onboarding

```bash
# New team member clones repo:
git clone https://github.com/company/my-app.git
cd my-app

# If setup.sh exists:
bash setup.sh

# Done! Environment is ready
```

---

## Configuration

### Configuration File

Location: `~/.traceenv/config.json`

```json
{
  "shell": "bash",
  "storage": "/Users/user/.traceenv/commands.db",
  "model": "qwen2.5-coder",
  "daemonPort": 7842,
  "privacy": {
    "telemetry": false
  }
}
```

### Directory Structure

```
~/.traceenv/
├── config.json              # Configuration settings
├── commands.db              # SQLite command history
├── daemon.pid               # Daemon process ID
├── .demo-run                # First-time demo flag
├── hooks/                   # Shell hook scripts
│   ├── bash_hook.sh
│   └── zsh_hook.zsh
└── models/                  # Optional LLM models
    └── qwen2.5-coder.gguf
```

### Environment Variables

```bash
# Override daemon port
export TRACEENV_PORT=8080

# Set config directory
export TRACEENV_HOME=/custom/path

# Enable debug logging
export DEBUG=traceenv:*
```

---

## Troubleshooting

### "Daemon is NOT running"

**Problem:** Commands aren't being captured.

**Solution:**
```bash
# Start the daemon explicitly
traceenv daemon start

# Verify it's running
traceenv daemon status

# Check if port is in use
lsof -i :7842
```

### "No commands found for this directory"

**Possible causes:**
1. Hooks aren't installed or activated
2. Commands were run in different directory
3. All commands failed (non-zero exit code)

**Solution:**
```bash
# Check if hooks are installed
grep "TraceEnv" ~/.bashrc  # or ~/.zshrc for Zsh

# Reinstall hooks
traceenv install-hooks --shell bash
source ~/.bashrc

# Run commands in the target directory
cd ~/my-project
npm install
npm run dev

# Then synthesize
traceenv synthesize --dir ~/my-project
```

### "SQLite is an experimental feature" Warning

**This is normal on Node.js 24+**

TraceEnv uses Node's built-in SQLite (experimental but stable). The warning is harmless and doesn't affect functionality.

### Daemon process hangs

**Solution:**
```bash
# Kill the daemon
traceenv daemon stop

# If that doesn't work, force kill
ps aux | grep "traceenv"
kill -9 <PID>

# Remove PID file
rm ~/.traceenv/daemon.pid

# Restart
traceenv daemon start
```

### Generated scripts don't work

**Possible issues:**
1. Prerequisites not installed (Node, Docker, etc.)
2. Environment variables missing
3. Network dependencies unavailable

**Solution:**
- Check `SETUP.md` for listed prerequisites
- Install missing tools
- Verify environment setup manually
- Review generated `setup.sh` for correctness

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 18+ | Execution engine |
| **Language** | TypeScript 5.3+ | Type-safe development |
| **CLI Framework** | Commander.js | Command parsing & help |
| **Database** | SQLite (node:sqlite) | Local command storage |
| **HTTP Server** | Node http module | Daemon server |
| **AI (Optional)** | node-llama-cpp | Local LLM inference |
| **Models** | Qwen2.5-Coder GGUF | AI synthesis (optional) |
| **UI** | Custom terminal lib | Animations & formatting |

---

## Privacy & Security

✅ **Zero Data Collection**
- No analytics, no tracking, no telemetry
- No data sent outside your machine

✅ **Local Inference**
- LLM runs locally on your CPU/GPU
- No cloud API calls

✅ **Secure Storage**
- Commands stored in local SQLite
- File permissions: 0o644 (readable by user only)

✅ **No External Dependencies**
- LLM integration is optional
- Works entirely offline

✅ **Open Source**
- Full source code available
- Auditable and transparent

---

## Getting Help

### Documentation

- **[ONBOARDING.md](ONBOARDING.md)** — Detailed onboarding demo guide
- **Generated SETUP.md** — Project-specific setup docs
- **`traceenv --help`** — CLI help documentation

### Troubleshooting

Common issues and solutions covered in the [Troubleshooting](#troubleshooting) section above.

### Issues & Feedback

Report bugs or request features on GitHub:
https://github.com/Arjun-Walia/TraceEnv/issues

---

## Roadmap

### Current (v0.1 MVP)
- ✅ Shell integration (Bash, Zsh)
- ✅ Command capture and storage
- ✅ Workflow analysis
- ✅ Documentation generation
- ✅ First-time demo

### Planned (v0.2+)
- 📋 Fish shell support
- 📋 Advanced prerequisite detection
- 📋 Multi-project workspace support
- 📋 Integration with Package.json
- 📋 GitHub Actions CI integration

### Community Wishlist
- 🚀 PowerShell support
- 🚀 Automated environment variable detection
- 🚀 Docker container setup generation
- 🚀 Cloud deployment integration

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License — see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Inspired by developer tools like:
- **Docker CLI** — Seamless onboarding
- **Supabase CLI** — Local-first approach
- **Railway CLI** — Beautiful terminal UX

---

## FAQ

**Q: Does TraceEnv upload my commands to the cloud?**
A: No. Everything runs locally. Your commands never leave your machine.

**Q: Can I use TraceEnv without installing shell hooks?**
A: Yes. Use the daemon to capture commands manually, or provide existing command history.

**Q: What if I run failed commands?**
A: Failed commands (non-zero exit codes) are recorded but excluded from synthesis during document generation.

**Q: How often should I run `traceenv synthesize`?**
A: Whenever your setup process changes. You can regenerate documentation anytime.

**Q: Is the AI model required?**
A: No. TraceEnv includes rule-based analysis that works without a model. AI enhancement is optional for improved accuracy.

**Q: Can multiple users on a team use TraceEnv?**
A: Yes. Each user has their own `~/.traceenv/` directory. The generated scripts are shareable via git.

**Q: Does TraceEnv work on Windows?**
A: Partially. Works with WSL (Windows Subsystem for Linux) or PowerShell. Native Windows shell support is planned.

---

<div align="center">

### Made with ❤️ for developers

**[Install Now](https://github.com/Arjun-Walia/TraceEnv#installation)** • **[GitHub](https://github.com/Arjun-Walia/TraceEnv)** • **[Issues](https://github.com/Arjun-Walia/TraceEnv/issues)**

</div>

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
