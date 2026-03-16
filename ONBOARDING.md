# TraceEnv First-Time Onboarding Demo

## Overview

TraceEnv now includes an automatic **first-time onboarding demo** that runs when users install and run the CLI for the first time. The demo showcases how TraceEnv works by simulating a typical developer workflow and generating documentation automatically.

## How It Works

### Automatic Execution

When a user runs any TraceEnv command for the first time, the tool automatically:

1. **Starts the daemon** (if not already running)
2. **Creates a demo project** at `~/.traceenv/demo-project`
3. **Simulates a workflow** with 4 example commands:
   - `cp .env.example .env`
   - `docker compose up -d`
   - `npm install`
   - `npm run dev`
4. **Analyzes the workflow** and detects prerequisites
5. **Generates setup documentation**:
   - `setup.sh` (executable script)
   - `SETUP.md` (human-readable guide)
6. **Displays the output** with next steps and guidance

### One-Time Execution

The demo runs only once. A flag file (`~/.traceenv/.demo-run`) is created after the first run, ensuring users aren't interrupted by the demo on subsequent commands.

To reset and run the demo again (for testing):

```bash
rm ~/.traceenv/.demo-run
rm -rf ~/.traceenv/demo-project
```

## Implementation Details

### New Files

- **`src/onboarding/firstTimeDemo.ts`** - Core onboarding module
  - `hasRunDemo()` - Check if demo has run before
  - `markDemoAsRun()` - Set the one-time flag
  - `setupDemoDirectory()` - Create demo project structure
  - `seedDemoCommands()` - Seed example commands to daemon
  - `getDemoProjectDir()` - Get demo directory path

### Modified Files

- **`src/cli/index.ts`** - Integrated demo into CLI startup
  - Added async IIFE wrapper for main entry point
  - `runFirstTimeDemo()` function - Orchestrates the demo flow
  - `startDaemonSync()` - Helper to start daemon without waiting for external process
  - Demo check runs before any command processing

- **`src/config.ts`** - Added config schema extension
  - Added optional `demoCompleted` field to `TraceEnvConfig`

### Demo Workflow

The simulated workflow demonstrates:

- **Version control**: `cp .env.example .env`
- **Infrastructure**: `docker compose up -d`
- **Dependency management**: `npm install`
- **Development server**: `npm run dev`

### Generated Files

The demo creates:

```
~/.traceenv/demo-project/
├── .env.example              # Mock environment file
├── docker-compose.yml        # Mock Docker configuration
├── package.json              # Mock Node.js project
├── setup.sh                  # Generated executable script
└── SETUP.md                  # Generated documentation
```

## User Experience

**First Run:**
```
🎬 Welcome to TraceEnv!

This is an interactive demonstration of how TraceEnv works.

I'm simulating a typical developer workflow...

[Logo displayed]

📋 Simulated workflow:

   • cp .env.example .env
   • docker compose up -d
   • npm install
   • npm run dev

✓ Commands recorded
✓ Found 4 commands
✓ Analysis complete
✓ Generated documentation

Generated files:
  📄 ~/.traceenv/demo-project/setup.sh
  📄 ~/.traceenv/demo-project/SETUP.md

🎉 TraceEnv is ready!
```

**Subsequent Runs:**
No demo, commands execute normally.

## Design Philosophy

The onboarding demo aligns with industry best practices from tools like:
- **Docker CLI** - Interactive first-run experience
- **Supabase CLI** - Self-demonstrating tool behavior  
- **Railway CLI** - Polished initialization flow

The implementation ensures:
- ✅ **Non-intrusive** - Runs only once
- ✅ **Modular** - Cleanly separated from core logic
- ✅ **Reliable** - Handles daemon state and errors gracefully
- ✅ **Self-contained** - Creates its own demo data, doesn't affect user projects
- ✅ **Educational** - Shows real generated output

## Testing

### Reset Demo (for testing)

```bash
rm ~/.traceenv/.demo-run
rm -rf ~/.traceenv/demo-project
rm ~/.traceenv/commands.db  # Optional: also reset command history
```

Then run any command:
```bash
traceenv synthesize
```

### Verify One-Time Execution

```bash
traceenv daemon status  # First command - no demo
traceenv daemon status  # Second command - no demo
```

## Future Enhancements

Possible improvements:
- Interactive walkthrough options
- Custom demo workflow selection
- Metrics collection (opt-in) on demo completion
- Integration with getting-started video/documentation
