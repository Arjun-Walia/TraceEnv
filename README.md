<div align="center">
  <img src="https://img.shields.io/badge/TraceEnv-Local--First%20Reproducibility-brightgreen?style=for-the-badge" alt="TraceEnv Logo">
  <h1>TraceEnv</h1>
  <p><b>Local-first CLI for universal, reproducible project setup.</b></p>
  <p>
    <a href="#"> <img src="https://img.shields.io/npm/v/traceenv.svg" alt="npm version"></a>
    <a href="#"> <img src="https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg" alt="Node version"></a>
    <a href="#"> <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT"></a>
    <a href="#"> <img src="https://img.shields.io/badge/macOS%20%7C%20Linux%20%7C%20Windows-supported-lightgrey.svg" alt="Platform Support"></a>
  </p>
  <p>Run <i>one</i> command in any repository and TraceEnv will intelligently detect, plan, and precisely execute the required setup steps.</p>
</div>

<hr />

## ⚡ What is TraceEnv?

**TraceEnv** replaces brittle README instructions and outdated `setup.sh` scripts with an intelligent, deterministic CLI. By running `trace` in any project, TraceEnv automatically infers the required workflow (or reads a `.traceenv.json` manifest), shows you a safe execution plan, and runs it with built-in retries, failure classification, and recovery.

Whether it's `npm install`, `docker compose up`, or complex database migrations, TraceEnv handles it seamlessly.

## ✨ Key Features

- **🚀 Universal Execution:** Works across Node.js, Python, Docker, Go, Rust, and more.
- **🧠 Intelligence Engine:** Fallback to LLM-powered inference (Local GGUF, OpenAI, Claude) if no setup manifest exists.
- **🛡️ Safe & Predictable:** View a comprehensive plan, estimated time, and prerequisites before anything runs.
- **🔄 Auto-Recovery:** Automatic retries and smart failure classification when steps break.
- **🔒 Local-First Privacy:** Zero telemetry, zero forced cloud dependencies. Everything lives in `~/.traceenv`.
- **🖥️ Beautiful Terminal UI:** Responsive, matrix-style bordered panels that scale to your terminal width.

## 📦 Quick Start

### Installation

Install globally via npm:

```bash
git clone https://github.com/Arjun-Walia/TraceEnv.git
cd TraceEnv
npm install
npm run build
npm install -g .
```

Verify the installation:

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

> *Note: Both `trace` and `traceenv` are valid command aliases.*

## ⚙️ How It Works (The `.traceenv.json` Manifest)

TraceEnv is powered by a standard JSON manifest. If a project lacks one, TraceEnv tries to infer it. When provided, it guarantees 100% deterministic setups.

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
