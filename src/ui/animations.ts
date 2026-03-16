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

export const WORKFLOW_FRAMES = [
  // Frame 1: Shell collecting commands
  `
  ┌─ SHELL ─────────────────────────────────────┐
  │ $ npm install                               │
  │ $ docker compose up -d                      │
  │ $ npm run dev                               │
  └─────────────────────────────────────────────┘
                      ⬇
  [ TraceEnv ]
                      ⬇
  ┌─ DOCS ──────────────────────────────────────┐
  │ setup.sh                                    │
  │ SETUP.md                                    │
  └─────────────────────────────────────────────┘
  `,

  // Frame 2: TraceEnv analyzing
  `
  ┌─ SHELL ─────────────────────────────────────┐
  │ $ npm install                               │
  │ $ docker compose up -d                      │
  │ $ npm run dev                               │
  └─────────────────────────────────────────────┘
                      ⬇
  [ TraceEnv ▐▌ ]
                      ⬇
  ┌─ DOCS ──────────────────────────────────────┐
  │ setup.sh                                    │
  │ SETUP.md                                    │
  └─────────────────────────────────────────────┘
  `,

  // Frame 3: Filtering noise
  `
  ┌─ SHELL ─────────────────────────────────────┐
  │ $ npm install          ✓                    │
  │ $ docker compose up -d ✓                    │
  │ $ npm run dev          ✓                    │
  └─────────────────────────────────────────────┘
                      ⬇
  [ TraceEnv ▀▄▀ ]
                      ⬇
  ┌─ DOCS ──────────────────────────────────────┐
  │ setup.sh                                    │
  │ SETUP.md                                    │
  └─────────────────────────────────────────────┘
  `,

  // Frame 4: Generating output
  `
  ┌─ SHELL ─────────────────────────────────────┐
  │ $ npm install          ✓                    │
  │ $ docker compose up -d ✓                    │
  │ $ npm run dev          ✓                    │
  └─────────────────────────────────────────────┘
                      ⬇
  [ TraceEnv ▄▀▄ ]
                      ⬇
  ┌─ DOCS ──────────────────────────────────────┐
  │ setup.sh        ▌▐                          │
  │ SETUP.md        ▌▐                          │
  └─────────────────────────────────────────────┘
  `,

  // Frame 5: Complete
  `
  ┌─ SHELL ─────────────────────────────────────┐
  │ $ npm install          ✓                    │
  │ $ docker compose up -d ✓                    │
  │ $ npm run dev          ✓                    │
  └─────────────────────────────────────────────┘
                      ⬇
  [ TraceEnv ✓ ]
                      ⬇
  ┌─ DOCS ──────────────────────────────────────┐
  │ setup.sh        ✓                           │
  │ SETUP.md        ✓                           │
  └─────────────────────────────────────────────┘
  `,
];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS SPINNER: Represents scanning & filtering
// ─────────────────────────────────────────────────────────────────────────────

export const ANALYSIS_SPINNER = [
  '  ▹▹▹▹▹ Analyzing commands...',
  '  ▸▹▹▹▹ Analyzing commands...',
  '  ▹▸▹▹▹ Analyzing commands...',
  '  ▹▹▸▹▹ Analyzing commands...',
  '  ▹▹▹▸▹ Analyzing commands...',
  '  ▹▹▹▹▸ Analyzing commands...',
];

export const SYNTHESIS_SPINNER = [
  '  ◐ Synthesizing workflow...',
  '  ◓ Synthesizing workflow...',
  '  ◑ Synthesizing workflow...',
  '  ◒ Synthesizing workflow...',
];

export const GENERATION_SPINNER = [
  '  ⠋ Generating setup.sh',
  '  ⠙ Generating setup.sh',
  '  ⠹ Generating setup.sh',
  '  ⠸ Generating setup.sh',
  '  ⠼ Generating setup.sh',
  '  ⠴ Generating setup.sh',
  '  ⠦ Generating setup.sh',
  '  ⠧ Generating setup.sh',
  '  ⠇ Generating setup.sh',
  '  ⠏ Generating setup.sh',
];

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS SCREEN: Final output visualization
// ─────────────────────────────────────────────────────────────────────────────

export const SUCCESS_SCREEN = `
  ╔════════════════════════════════════════════╗
  ║                                            ║
  ║          ✓ Documentation Generated         ║
  ║                                            ║
  ╚════════════════════════════════════════════╝

  Files created:

  ✔ setup.sh
    └─ Executable setup script with all dependencies

  ✔ SETUP.md
    └─ Human-readable setup guide with prerequisites

  Prerequisites detected:
  • Node.js v18+
  • Docker

  Run: bash setup.sh
`;

// ─────────────────────────────────────────────────────────────────────────────
// LOGO FRAMES: Mini animated logo
// ─────────────────────────────────────────────────────────────────────────────

export const LOGO_FRAMES = [
  `
   ▁▂▃ TraceEnv ▃▂▁
   ━━━━━━━━━━━━━━━━
  `,
  `
   ▂▃▄ TraceEnv ▄▃▂
   ━━━━━━━━━━━━━━━━
  `,
];

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BAR: Progress indicator
// ─────────────────────────────────────────────────────────────────────────────

export function createProgressBar(
  current: number,
  total: number,
  width: number = 20
): string {
  const percent = current / total;
  const filled = Math.round(percent * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentage = Math.round(percent * 100);

  return `  [${bar}] ${percentage}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND FLOW VISUALIZATION
// ─────────────────────────────────────────────────────────────────────────────

export function formatCommand(cmd: string, index: number, total: number): string {
  const status = '✓';
  const position = `[${index}/${total}]`;
  return `  ${status} ${position}  ${cmd}`;
}

export function createFlowVisualization(
  commands: string[],
  highlightIndex: number = -1
): string {
  const lines: string[] = [
    '  ┌─ Command Flow ──────────────────────────────┐',
  ];

  commands.forEach((cmd, idx) => {
    const isHighlight = idx === highlightIndex;
    const marker = isHighlight ? '▶' : '•';
    const prefix = isHighlight ? '→' : ' ';

    lines.push(`  ${prefix} ${marker} ${cmd.substring(0, 40)}`);
  });

  lines.push('  └──────────────────────────────────────────────┘');

  return lines.join('\n');
}
