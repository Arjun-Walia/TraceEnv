/**
 * TraceEnv Terminal UI Animations
 * ASCII art animations for CLI workflow visualization
 */

// ─────────────────────────────────────────────────────────────────────────────
// TRACEENV LOGO: Main branding
// ─────────────────────────────────────────────────────────────────────────────

export const TRACEENV_LOGO = `
 ███████████                                       ██████████                       
▒█▒▒▒███▒▒▒█                                      ▒▒███▒▒▒▒▒█                       
▒   ▒███  ▒  ████████   ██████    ██████   ██████  ▒███  █ ▒  ████████   █████ █████
    ▒███    ▒▒███▒▒███ ▒▒▒▒▒███  ███▒▒███ ███▒▒███ ▒██████   ▒▒███▒▒███ ▒▒███ ▒▒███ 
    ▒███     ▒███ ▒▒▒   ███████ ▒███ ▒▒▒ ▒███████  ▒███▒▒█    ▒███ ▒███  ▒███  ▒███ 
    ▒███     ▒███      ███▒▒███ ▒███  ███▒███▒▒▒   ▒███ ▒   █ ▒███ ▒███  ▒▒███ ███  
    █████    █████    ▒▒████████▒▒██████ ▒▒██████  ██████████ ████ █████  ▒▒█████   
   ▒▒▒▒▒    ▒▒▒▒▒      ▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒   ▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒▒▒ ▒▒▒▒ ▒▒▒▒▒    ▒▒▒▒▒    

  Local-first workspace synthesizer
  Generates reproducible setup documentation from terminal history.
`;

// ─── Workflow frames ──────────────────────────────────────────────────────────
// Frame story: idle → connect → analyze → filter → write → done

export const WORKFLOW_FRAMES = [
  // ── Frame 0: Standby — commands in shell, TraceEnv waiting ──
  `
  ┏━ SHELL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃  $ npm install                              ┃
  ┃  $ docker compose up -d                     ┃
  ┃  $ npm run dev                              ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
              │
      ╔═══════╧═══════╗
      ║ ◌  TRACEENV   ║
      ╚═══════════════╝
              │
  ┌─ OUTPUT ─────────────────────────────────────┐
  │  setup.sh               ░░░░░░░░░░░░░░░░░░   │
  │  SETUP.md               ░░░░░░░░░░░░░░░░░░   │
  └──────────────────────────────────────────────┘
  `,

  // ── Frame 1: Connection established — reading history ──
  `
  ┏━ SHELL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃  $ npm install              ◎ reading       ┃
  ┃  $ docker compose up -d     ◎ reading       ┃
  ┃  $ npm run dev              ◎ reading       ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
              │ ▸ 3 commands captured
      ╔═══════╧═══════╗
      ║ ◈  TRACEENV   ║
      ╚═══════╤═══════╝
              │
  ┌─ OUTPUT ─────────────────────────────────────┐
  │  setup.sh               ░░░░░░░░░░░░░░░░░░   │
  │  SETUP.md               ░░░░░░░░░░░░░░░░░░  │
  └──────────────────────────────────────────────┘
  `,

  // ── Frame 2: Analyzing — noise filter active ──
  `
  ┏━ SHELL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃  $ npm install              ✓ ranked #1     ┃
  ┃  $ docker compose up -d     ✓ ranked #2     ┃
  ┃  $ npm run dev              · filtering...  ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
              │ ▸ scanning · dedup · rank
      ╔═══════╧════════════╗
      ║ ◉  TRACEENV  ▐▌    ║
      ╚═══════╤════════════╝
              │
  ┌─ OUTPUT ─────────────────────────────────────┐
  │  setup.sh               ░░░░░░░░░░░░░░░░░░   │
  │  SETUP.md               ░░░░░░░░░░░░░░░░░░   │
  └──────────────────────────────────────────────┘
  `,

  // ── Frame 3: Processing complete — generating docs ──
  `
  ┏━ SHELL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃  $ npm install              ✓ ranked #1     ┃
  ┃  $ docker compose up -d     ✓ ranked #2     ┃
  ┃  $ npm run dev              ✓ ranked #3     ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
              │ ▸ 3/3 resolved  ·  2 prereqs
      ╔═══════╧════════════╗
      ║ ◉  TRACEENV  ▀▄▀   ║
      ╚═══════╤════════════╝
              │ ▸ writing...
  ┌─ OUTPUT ─────────────────────────────────────┐
  │  setup.sh               ▓▓▓▓▓▓▓░░░░░░░░░░░   │
  │  SETUP.md               ▓▓░░░░░░░░░░░░░░░░  │
  └──────────────────────────────────────────────┘
  `,

  // ── Frame 4: Writing files ──
  `
  ┏━ SHELL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃  $ npm install              ✓ ranked #1     ┃
  ┃  $ docker compose up -d     ✓ ranked #2     ┃
  ┃  $ npm run dev              ✓ ranked #3     ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
              │ ▸ Node.js v18+  ·  Docker
      ╔═══════╧════════════╗
      ║ ◉  TRACEENV  ▄▀▄   ║
      ╚═══════╤════════════╝
              │ ▸ finalizing...
  ┌─ OUTPUT ─────────────────────────────────────┐
  │  setup.sh               ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░    │
  │  SETUP.md               ▓▓▓▓▓▓▓░░░░░░░░░░    │
  └──────────────────────────────────────────────┘
  `,

  // ── Frame 5: Complete ──
  `
  ┏━ SHELL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃  $ npm install              ✓ ranked #1     ┃
  ┃  $ docker compose up -d     ✓ ranked #2     ┃
  ┃  $ npm run dev              ✓ ranked #3     ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
              │ ▸ 3 commands  ·  2 prereqs  ·  2 files
      ╔═══════╧════════════╗
      ║ ✓  TRACEENV  DONE  ║
      ╚═══════╤════════════╝
              │
  ┌─ OUTPUT ─────────────────────────────────────┐
  │  setup.sh               ✓ written  52 lines  │
  │  SETUP.md               ✓ written  89 lines  │
  └──────────────────────────────────────────────┘
  `,
];

// ─── Boot / startup sequence ─────────────────────────────────────────────────

export const BOOT_FRAMES = [
  `
  ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
  ▌  TRACEENV  ·  initializing                  ▐
  ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

  ◌  shell adapter         ░░░░░░░░░░░░░░░░░░░░
  ◌  noise filter          ░░░░░░░░░░░░░░░░░░░░
  ◌  workspace context     ░░░░░░░░░░░░░░░░░░░░
  `,
  `
  ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
  ▌  TRACEENV  ·  loading components            ▐
  ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

  ✓  shell adapter         ████████████████████
  ◌  noise filter          ░░░░░░░░░░░░░░░░░░░░
  ◌  workspace context     ░░░░░░░░░░░░░░░░░░░░
  `,
  `
  ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
  ▌  TRACEENV  ·  loading components            ▐
  ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

  ✓  shell adapter         ████████████████████
  ✓  noise filter          ████████████████████
  ◌  workspace context     ░░░░░░░░░░░░░░░░░░░░
  `,
  `
  ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
  ▌  TRACEENV  ·  ready                         ▐
  ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

  ✓  shell adapter         ████████████████████
  ✓  noise filter          ████████████████████
  ✓  workspace context     ████████████████████
  `,
];

// ─── Scan animation (history analysis) ───────────────────────────────────────

export const SCAN_FRAMES = [
  `
  ─── scanning history ────────────────────────────
  ▸ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  `,
  `
  ─── scanning history ────────────────────────────
  ▸ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  `,
  `
  ─── scanning history ────────────────────────────
  ▸ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  `,
  `
  ─── scanning history ────────────────────────────
  ▸ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  `,
  `
  ─── scanning history ────────────────────────────
  ▸ ████████████████████████░░░░░░░░░░░░░░░░░░░░
  `,
  `
  ─── scanning history ────────────────────────────
  ▸ ████████████████████████████████░░░░░░░░░░░░
  `,
  `
  ─── scanning history ────────────────────────────
  ▸ ████████████████████████████████████████░░░░
  `,
  `
  ─── scanning history ────────────────────────────
  ▸ ██████████████████████████████████████████████
  `,
];

// ─── Spinners ─────────────────────────────────────────────────────────────────

export const ANALYSIS_SPINNER = [
  '  ▹▹▹▹▹  scanning commands...',
  '  ▸▹▹▹▹  scanning commands...',
  '  ▹▸▹▹▹  scanning commands...',
  '  ▹▹▸▹▹  scanning commands...',
  '  ▹▹▹▸▹  scanning commands...',
  '  ▹▹▹▹▸  scanning commands...',
];

export const SYNTHESIS_SPINNER = [
  '  ◐  synthesizing workflow...',
  '  ◓  synthesizing workflow...',
  '  ◑  synthesizing workflow...',
  '  ◒  synthesizing workflow...',
];

export const GENERATION_SPINNER = [
  '  ⠋  writing setup.sh',
  '  ⠙  writing setup.sh',
  '  ⠹  writing setup.sh',
  '  ⠸  writing setup.sh',
  '  ⠼  writing setup.sh',
  '  ⠴  writing setup.sh',
  '  ⠦  writing setup.sh',
  '  ⠧  writing setup.sh',
  '  ⠇  writing setup.sh',
  '  ⠏  writing setup.sh',
];

export const FILTER_SPINNER = [
  '  ◌─────  filtering noise',
  '  ─◎────  filtering noise',
  '  ──◉───  filtering noise',
  '  ───◎──  filtering noise',
  '  ────◌─  filtering noise',
  '  ───◎──  filtering noise',
  '  ──◉───  filtering noise',
  '  ─◎────  filtering noise',
];

// ─── Success screen ───────────────────────────────────────────────────────────

export const SUCCESS_SCREEN = `
  ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
  ▌                                             ▐
  ▌       ✓  Documentation generated            ▐
  ▌                                             ▐
  ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

  Files written:

    ✓  setup.sh
       └─ executable bootstrap · dependencies · env

    ✓  SETUP.md
       └─ human-readable guide · prerequisites · steps

  ─────────────────────────────────────────────

  Prerequisites detected:
    •  Node.js v18+
    •  Docker

  Run:  bash setup.sh
`;

// ─── Mini logo frames (animated) ──────────────────────────────────────────────

export const LOGO_FRAMES = [
  `
   ▁▂▃ TraceEnv ▃▂▁
   ━━━━━━━━━━━━━━━━
  `,
  `
   ▂▃▄ TraceEnv ▄▃▂
   ━━━━━━━━━━━━━━━━
  `,
  `
   ▃▄▅ TraceEnv ▅▄▃
   ━━━━━━━━━━━━━━━━
  `,
  `
   ▂▃▄ TraceEnv ▄▃▂
   ━━━━━━━━━━━━━━━━
  `,
];

// ─── Progress bar helper ──────────────────────────────────────────────────────

export function createProgressBar(
  current: number,
  total: number,
  width: number = 24
): string {
  const pct    = Math.min(1, current / total);
  const filled = Math.round(pct * width);
  const empty  = width - filled;
  return `  ${'█'.repeat(filled)}${'░'.repeat(empty)}  ${Math.round(pct * 100)}%`;
}

// ─── Command flow visualization ───────────────────────────────────────────────

export function formatCommand(cmd: string, index: number, total: number): string {
  return `  ✓  [${index}/${total}]  ${cmd}`;
}

export function createFlowVisualization(
  commands: string[],
  highlightIndex: number = -1
): string {
  const lines = ['  ┌─ Command flow ─────────────────────────────┐'];

  commands.forEach((cmd, idx) => {
    const isActive = idx === highlightIndex;
    const marker   = isActive ? '▶' : '•';
    const prefix   = isActive ? '→' : ' ';
    lines.push(`  ${prefix} ${marker}  ${cmd.slice(0, 42)}`);
  });

  lines.push('  └────────────────────────────────────────────┘');
  return lines.join('\n');
}

// ─── Panel: show a labeled data block ─────────────────────────────────────────

export function createPanel(
  title: string,
  lines: string[],
  status?: string
): string {
  const W      = 48;
  const dash   = '─'.repeat(Math.max(0, W - title.length - 4));
  const header = `  ┌─ ${title} ${dash}┐`;
  const footer = `  └${'─'.repeat(W + 2)}┘`;

  const body = lines.map((l) => {
    const padded = l.padEnd(W);
    return `  │  ${padded}│`;
  });

  const statusLine = status
    ? `  │  ${status.padEnd(W)}│`
    : '';

  return [header, ...body, statusLine, footer].filter(Boolean).join('\n');
}