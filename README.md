<div align="center">
  <img src="https://img.shields.io/badge/TraceEnv-Local--First%20Reproducibility-brightgreen?style=for-the-badge" alt="TraceEnv Logo">
  <h1>TraceEnv</h1>
  <p><b>Clone. Run <code>trace</code>. Your environment works.</b></p>
  <p>
    <a href="#"> <img src="https://img.shields.io/npm/v/traceenv.svg" alt="npm version"></a>
    <a href="#"> <img src="https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg" alt="Node version"></a>
    <a href="#"> <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT"></a>
    <a href="#"> <img src="https://img.shields.io/badge/macOS%20%7C%20Linux%20%7C%20Windows-supported-lightgrey.svg" alt="Platform Support"></a>
  </p>
  <p>Run one command inside a repository and TraceEnv figures out the setup, shows you the plan, and executes it safely.</p>
</div>

<hr />

## Clone -> trace -> done

Use this path first.

```bash
git clone https://github.com/Arjun-Walia/TraceEnv.git
cd TraceEnv
npm install
npm run build
npm install -g .
trace
```

What you get:

- Instant setup plan before anything runs
- Confirmation prompt before execution
- Clear success or failure output with recovery hints

## ⚡ What is TraceEnv?

> Clone. Run `trace`. Your environment works.

**TraceEnv** replaces brittle setup docs and outdated `setup.sh` scripts with a CLI that gets a project running after you clone it. It detects the setup workflow, shows you exactly what will run, and executes it locally with confirmation, retries, and clear failure reporting.

Whether it's `npm install`, `docker compose up`, or complex database migrations, TraceEnv handles it seamlessly.

```bash
git clone https://github.com/Arjun-Walia/TraceEnv.git
cd TraceEnv
trace
```

## Stop Writing Setup Instructions

Your README is usually out of date.

TraceEnv uses the setup steps that actually worked, so new developers do not have to guess which commands are still valid.

## What You Get

- No setup instructions to follow manually
- No README guessing after clone
- No hidden commands
- A working environment faster on real projects
- A reproducible path to deterministic setup when you want it

## Works Even Without Configuration

No `.traceenv.json`? TraceEnv still works.

It will:

- detect the project structure
- infer likely setup steps
- generate a setup plan
- ask for confirmation
- execute locally and stop on failure

## ✨ Key Features

- **Works on existing projects:** No rewrite, no migration, no special project template.
- **Shows commands before execution:** You see the plan before anything runs.
- **Handles common setup stacks:** Node.js, Python, Docker, Go, Rust, and mixed environments.
- **Recovers better than shell scripts:** Retries, failure classification, and recovery hints are built in.
- **Stays local-first:** No telemetry and no forced cloud dependency.
- **Supports smarter inference when needed:** Local GGUF, OpenAI, and Claude providers can help infer workflows.

## Demo

![TraceEnv demo](./demo.gif)

## 📦 Quick Start

### Installation

Install the package globally:

```bash
git clone https://github.com/Arjun-Walia/TraceEnv.git
cd TraceEnv
npm install
npm run build
npm install -g .
```

The npm package is `traceenv`. The command you run is `trace`.

Verify the install:

```bash
trace --version
```

### Basic Usage

Navigate to any project repository and let TraceEnv do the heavy lifting:

```bash
cd /path/to/any/project
trace
```

TraceEnv will detect the project type, build an execution plan, and ask for your confirmation before running.

## Why Not Docker / Dev Containers / Nix?

- No container overhead for projects that do not need containers
- No requirement to define a new environment system before you can use it
- Works with existing repositories immediately
- Lets teams adopt deterministic setup gradually instead of all at once

TraceEnv adapts to how the project already works instead of forcing everything into a new workflow.

## Safety Guarantees

- Shows commands before execution
- Requires confirmation unless you explicitly skip it
- Never hides steps behind background magic
- Stops on failure and reports what broke
- Executes locally on your machine

You stay in control of what runs.

## 🛠️ CLI Reference

TraceEnv comes with a powerful suite of subcommands:

| Command | Description | Options |
| :--- | :--- | :--- |
| `trace` | Detect and run the setup workflow for the current directory. | `--dry-run`, `--skip`, `--yes` |
| `trace record` | Interactively capture setup steps or extract them from an existing `setup.sh`. | `--dir`, `--from` |
| `trace synthesize` | Generate a `.traceenv.json` manifest from project context. | `--dir`, `--output` |
| `trace daemon` | Manage the background agent for real-time state tracking. | `start`, `stop`, `status` |
| `trace config` | Configure shell, network port, or intelligence provider. | `--shell`, `--mode`, `--provider` |
| `trace model` | Manage AI models for setup inference (Local, OpenAI, Claude). | `list`, `use`, `info`, `auth` |
| `trace install-hooks`| Install shell hooks to monitor environment state. | `--shell bash\|zsh` |

## Optional: Add `.traceenv.json` for Perfect Reproducibility

TraceEnv works without `.traceenv.json`.

If you want guaranteed, deterministic setup for every developer on every machine, add a manifest and commit it to the repository.

<details>
<summary><b>View Example Manifest</b></summary>

```json
{
  "version": "1.0.0",
  "workflow": [
    { "command": "cp .env.example .env", "cwd": ".", "description": "Prepare env" },
    { "command": "docker compose up -d", "cwd": ".", "description": "Start services" },
    { "command": "npm install", "cwd": ".", "description": "Install dependencies" },
    { "command": "npm run migrate", "cwd": ".", "description": "Run migrations" }
  ],
  "prerequisites": ["Node.js 18+", "Docker", "Docker Compose"],
  "estimatedTime": "5-10 minutes"
}
```
</details>

You can create one by recording or synthesizing a workflow:

```bash
trace record --dir .
trace synthesize --dir .
```

## 📊 Feature Status Matrix

We are actively developing TraceEnv. Here is the current capability snapshot:

### ✅ Working
* **Core Pipeline:** `trace` execution flow (planning, confirm prompt, `--dry-run`, `--skip`, `--yes`, retry/recovery).
* **Manifests:** Loading and parsing `.traceenv.json` from local or parent directories.
* **Recording:** `trace record` local workflows and existing bash scripts.
* **Daemons:** `trace daemon` HTTP health tracking and event preview.
* **Models/Config:** CLI configuration, model switching, and secure `auth` key storage locally.
* **UI Engine:** Responsive, auto-scaling Unicode box-drawing layouts.

### 🚧 Not Implemented Yet / Known Limitations
* `trace --undo` rollback mechanisms are currently unsupported.
* Shell hooks (`trace install-hooks`) are limited to `bash` and `zsh` (Fish/PowerShell coming soon).
* Local GGUF models require manual environment setup before they can be leveraged.
* Strict ASCII-only fallback modes (for extremely legacy terminals) are not yet available.

## 🛡️ Privacy & Security

**Your environment is your business.**
TraceEnv operates with a strict **Local-First** philosophy. 
- 🚫 Zero telemetry collection.
- 🚫 No forced cloud connectivity.
- 💾 All credentials, models, and execution logs are securely stored locally in `~/.traceenv`.

## 🤝 Contributing

We welcome community contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) (coming soon) before submitting PRs.

```bash
# Local development setup
npm install
npm run build
npm run dev
```

## 📄 License

TraceEnv is open-sourced software licensed under the **[MIT License](LICENSE)**.
