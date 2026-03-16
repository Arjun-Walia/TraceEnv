# TraceEnv

> Documentation should be executed, not remembered.

TraceEnv is a local-first workspace synthesizer that automatically generates reproducible setup documentation by observing real terminal workflows.

Instead of manually writing and maintaining README setup instructions, TraceEnv passively watches successful commands in your shell and reconstructs the exact steps required to recreate the development environment.

Everything runs entirely locally: no cloud APIs, no telemetry, and no external data processing.

## Why TraceEnv Exists

In most projects, documentation becomes outdated quickly.

Your README might say:

```bash
npm install
npm run dev
```

But the actual working environment may require:

```bash
docker compose up
redis-server
cp .env.example .env
npm install
npm run dev
```

This gap between documentation and reality causes:

- broken onboarding
- wasted developer time
- inconsistent environments

TraceEnv solves this problem by generating documentation directly from successful execution history.

## Key Features

### Local-First Architecture

TraceEnv runs completely on your machine.

- no cloud inference
- no external APIs
- no telemetry
- no network dependencies

Your commands and code never leave your environment.

### Workflow Observation

TraceEnv hooks into your shell and passively observes terminal activity.

Supported shells:

- Bash
- Zsh

It captures:

- commands
- working directories
- exit codes
- execution order

Only successful commands are considered for synthesis.

### Smart Noise Filtering

TraceEnv automatically filters irrelevant activity including:

- typos
- failed commands
- navigation commands
- command experimentation
- shell noise

The system extracts the minimal reproducible sequence required to recreate the environment.

### Automatic Documentation Generation

From a successful workflow, TraceEnv generates:

- setup.sh
- README content
- dependency instructions
- environment requirements

The generated documentation reflects what actually worked, not what someone remembered to write.

### Auto Provisioning

Repositories using TraceEnv can include metadata that enables automatic environment bootstrapping.

When another developer clones the repository, TraceEnv can prompt to run generated setup scripts automatically.

## How It Works

TraceEnv runs as a background daemon that coordinates between your shell, local storage, and an embedded local language model.

Workflow:

```text
Shell
  ↓
TraceEnv Daemon
  ↓
Command History (SQLite)
  ↓
Local LLM Analysis
  ↓
Generated Documentation
```

Steps:

1. Terminal commands are captured by shell hooks.
2. Commands are stored in a local SQLite database.
3. Successful workflows are analyzed by a local AI model.
4. The system reconstructs the minimal setup process.
5. Documentation and scripts are generated automatically.

## Tech Stack

### Engine

- Node.js
- TypeScript

### Local AI

- node-llama-cpp
- Qwen2.5-Coder GGUF models

### Storage

- SQLite (Node built-in sqlite module)

### Shell Integration

- Bash hooks
- Zsh hooks

## Installation

Install TraceEnv dependencies:

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
