# TraceEnv

> **Clone. Run `trace`. Done.**

TraceEnv automatically reconstructs your development environment from any cloned repository.

```bash
git clone https://github.com/example/project
cd project

trace
```

TraceEnv detects required setup steps, shows you the plan, and executes them automatically. **No manual setup commands required.**

**Everything runs locally.** No cloud, no telemetry, no data leaves your machine.

---

## Why TraceEnv?

### The Problem

Setting up a development environment is tedious:

```bash
# What developers currently do:
cp .env.example .env
npm install
docker compose up -d
npm run migrate
npm run dev
```

**Every time.** For every project. For every developer.

### The Solution

With TraceEnv:

```bash
trace
```

That's it. The entire setup runs automatically.

---

## Installation (One Time)

### 1. Install globally from source

**From GitHub (or a zip file):**

```bash
# Clone the repo (or extract the zip)
git clone https://github.com/Arjun-Walia/TraceEnv
cd TraceEnv

# Build and install globally
npm install
npm run build
npm install -g .

# Verify installation
trace --version
```

> **Note:** `traceenv` package will be published to npm soon. After that: `npm install -g traceenv`

### 2. First-time setup (automatic)

```bash
trace
```

On first run, TraceEnv will:

```
TraceEnv Initial Setup

✓ Creating ~/.traceenv directory
✓ Creating SQLite command database
✓ Installing shell hooks (optional)
✓ Starting background daemon

Setup complete.
```

**After this, you're ready.**

---

## Core Workflow

### For New Developers (Simplest)

```bash
# 1. Clone project
git clone https://github.com/someone/project
cd project

# 2. Run trace
trace

# 3. See the setup plan (automatic)
$ trace

🚀 Setup Plan

  ─ Prerequisites ────────────────────────────
  • Node.js 18+
  • Docker
  • Docker Compose

  ─ Workflow Steps ──────────────────────────────
  [1] cp .env.example .env — Setup environment variables
  [2] docker compose up -d — Start Docker services
  [3] npm install — Install dependencies
  [4] npm run migrate — Run database migrations
  [5] npm run dev — Start development server

  ⏱️  Estimated time: 5-10 minutes

  Continue? (Y/n) y

# 4. Automatic execution
Running setup...

  [1/5] ▶ cp .env.example .env
            ✓ Success

  [2/5] ▶ docker compose up -d
            ✓ Containers started

  [3/5] ▶ npm install
            ✓ Dependencies installed

  [4/5] ▶ npm run migrate
            ✓ Database ready

  [5/5] ▶ npm run dev
            ✓ Server running on http://localhost:3000

✅ Setup complete!

  Executed: 5
```

**That's the entire workflow. Nothing else needed.**

---

### For Project Creators (Setup Once)

**1. Create `.traceenv.json` in your project root:**

```json
{
  "version": "1.0.0",
  "workflow": [
    {
      "command": "cp .env.example .env",
      "cwd": ".",
      "description": "Setup environment variables"
    },
    {
      "command": "docker compose up -d",
      "cwd": ".",
      "description": "Start Docker services"
    },
    {
      "command": "npm install",
      "cwd": ".",
      "description": "Install dependencies"
    },
    {
      "command": "npm run migrate",
      "cwd": ".",
      "description": "Run database migrations"
    },
    {
      "command": "npm run dev",
      "cwd": ".",
      "description": "Start development server"
    }
  ],
  "prerequisites": [
    "Node.js 18+",
    "Docker",
    "Docker Compose"
  ],
  "estimatedTime": "5-10 minutes"
}
```

**2. Or generate it automatically:**

```bash
# From an existing setup.sh
traceenv record --from setup.sh

# Interactively
traceenv record --dir .
```

**3. Commit to your repository:**

```bash
git add .traceenv.json
git commit -m "chore: add environment setup metadata"
git push
```

**Done.** Every new developer can now run `trace`.

---

## Commands

### `trace` — Setup environment (Main Command)

Automatically detect and run the setup workflow.

```bash
trace                  # Run interactive setup
trace --dry-run        # Preview without executing
trace --skip 2 3       # Skip specific steps
```

**What it does:**
- Automatically detects `.traceenv.json` (searches current dir and parents)
- Shows setup plan with prerequisites and time estimate
- Asks for confirmation (safety check)
- Executes each step, showing progress
- Stops on first error with helpful messages
- Reports completion

---

### `traceenv record` — Create setup metadata

Generate `.traceenv.json` for your project.

```bash
# From existing setup.sh
traceenv record --from setup.sh

# Interactive setup
traceenv record --dir .
```

---

### `traceenv daemon` — Manage background service

```bash
traceenv daemon start   # Start background service
traceenv daemon status  # Check if running
traceenv daemon stop    # Stop service
```

(Optional. Used for advanced command capture features.)

---

### `traceenv install-hooks` — Enable auto-capture

Install shell hooks to automatically record commands (optional).

```bash
traceenv install-hooks --shell bash
```

---

### `traceenv config` — Change settings

```bash
traceenv config              # View current config
traceenv config --shell zsh  # Change shell
```

---

## Features

### ✅ Automatic Detection

TraceEnv automatically finds your project and loads setup metadata:

```bash
# From any directory inside your project
cd my-project/src/utils
trace  # Finds .traceenv.json in project root
```

### ✅ Safety First

- **Shows commands before execution** — Review what will run
- **Requires confirmation** — Press Y to proceed  
- **Stops on error** — Doesn't continue on failure
- **Clear error messages** — Shows exactly what went wrong

### ✅ Flexible Skipping

```bash
trace --skip 2      # Skip step 2
trace --skip 2 3 4  # Skip multiple steps
```

### ✅ Preview Mode

```bash
trace --dry-run     # Show what would execute (no execution)
```

### ✅ Works Everywhere

After one-time installation, the `trace` command works in any project:

```bash
cd ~/projects/nodejs-app && trace
cd ~/projects/python-service && trace
cd ~/projects/go-microservice && trace
```

**All automatic.**

---

## Requirements

- **Node.js:** 18+
- **npm:** 8+
- **OS:** macOS, Linux, Windows (WSL recommended)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Language | TypeScript |
| Database | SQLite (Node built-in) |
| CLI | Commander.js |
| Server | Node http |

---

## Files Created

### `.traceenv.json`

Stores your project's setup workflow. Commit this to version control.

```json
{
  "version": "1.0.0",
  "workflow": [
    { "command": "cp .env.example .env", "cwd": "." },
    { "command": "npm install", "cwd": "." },
    { "command": "npm run dev", "cwd": "." }
  ],
  "prerequisites": ["Node.js 18+"],
  "estimatedTime": "2-5 minutes"
}
```

### `setup.sh` (Optional)

Fallback executable script for manual setup.

### `SETUP.md` (Optional)

Human-readable setup guide.

---

## FAQ

**Q: Where does TraceEnv store data?**

A: Everything is stored locally in `~/.traceenv/`. No cloud, no external servers.

---

**Q: Can I modify `.traceenv.json` manually?**

A: Yes. It's a regular JSON file. Edit freely.

---

**Q: What if a setup step fails?**

A: TraceEnv stops immediately and shows the error. Fix the issue and run `trace` again.

---

**Q: Does this work on Windows?**

A: Yes, on WSL (Windows Subsystem for Linux). Native Windows support coming soon.

---

**Q: Can I use `trace` with monorepos?**

A: Yes. Place `.traceenv.json` in each workspace root.

---

**Q: How do I uninstall?**

A: `npm uninstall -g traceenv`

---

## Troubleshooting

### `trace` command not found

```bash
npm install -g traceenv
npm list -g traceenv
```

### No `.traceenv.json` found

```bash
traceenv record --dir .
```

### Command failed with permissions error

```bash
chmod +x setup.sh
trace
```

### Docker not running

Start Docker and run `trace` again.

---

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/Arjun-Walia/TraceEnv).

---

## License

MIT

---

**TraceEnv** — Automatic environment reconstruction for developers.

For more information: https://github.com/Arjun-Walia/TraceEnv
