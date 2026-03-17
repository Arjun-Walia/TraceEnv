/**
 * TraceEnv · Logo
 * Pixel-art block font — 5 rows, top-lit for 3D depth.
 * Each row uses a different green shade: bright → dim → shadow
 */

import {
  accentBright, accent, accentDim, secondary, muted, white, offWhite,
  bold, SYM, ruler, muted as mutedColor,
} from './theme.js';

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function visibleLength(text: string): number {
  return text.replace(ANSI_PATTERN, '').length;
}

function fitToWidth(text: string, width: number): string {
  if (width <= 0) return '';
  if (visibleLength(text) <= width) return text;
  const plain = text.replace(ANSI_PATTERN, '');
  if (width === 1) return '…';
  return `${plain.slice(0, width - 1)}…`;
}

// ─── Pixel font rows ──────────────────────────────────────────────────────────
// Letters: T R A C E E N V  (6 chars wide, 1 space between)

const R1 = ' ███████████                                       ██████████                       ';
const R2 = '▒█▒▒▒███▒▒▒█                                      ▒▒███▒▒▒▒▒█                       ';
const R3 = '▒   ▒███  ▒  ████████   ██████    ██████   ██████  ▒███  █ ▒  ████████   █████ █████';
const R4 = '    ▒███    ▒▒███▒▒███ ▒▒▒▒▒███  ███▒▒███ ███▒▒███ ▒██████   ▒▒███▒▒███ ▒▒███ ▒▒███ ';
const R5 = '    ▒███     ▒███ ▒▒▒   ███████ ▒███ ▒▒▒ ▒███████  ▒███▒▒█    ▒███ ▒███  ▒███  ▒███ ';
const R6 = '    ▒███     ▒███      ███▒▒███ ▒███  ███▒███▒▒▒   ▒███ ▒   █ ▒███ ▒███  ▒▒███ ███  ';
const R7 = '    █████    █████    ▒▒████████▒▒██████ ▒▒██████  ██████████ ████ █████  ▒▒█████   ';
const R8 = '   ▒▒▒▒▒    ▒▒▒▒▒      ▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒   ▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒▒▒ ▒▒▒▒ ▒▒▒▒▒    ▒▒▒▒▒    ';

// ─── Full startup logo (big + tagline) ───────────────────────────────────────

export function renderBigLogo(): void {
  console.log();
  // Top-lit shading: highlight on row 1, fading to shadow at row 5
  console.log('  ' + accentBright(R1));
  console.log('  ' + accentBright(R2));
  console.log('  ' + accent(R3));
  console.log('  ' + accentDim(R4));
  console.log('  ' + secondary(R5));
  console.log('  ' + secondary(R6));
  console.log('  ' + secondary(R7));
  console.log('  ' + secondary(R8));

  // Divider + tagline beneath
  const tagW = 56;
  const tagText = 'local-first workspace synthesizer';
  const pad = Math.floor((tagW - tagText.length) / 2);
  console.log();
  console.log('  ' + secondary('┄'.repeat(pad)) + ' ' + muted(tagText) + ' ' + secondary('┄'.repeat(pad)));
  console.log();
}

// ─── Compact command-line header ─────────────────────────────────────────────

export function renderCommandLogo(): void {
  const terminalWidth = process.stdout.columns ?? 80;
  const outerWidth = Math.max(44, Math.min(84, terminalWidth - 1));
  const INNER = outerWidth - 2;

  // ── top rail ──
  const topLeft  = accentBright('▛') + accent('▀'.repeat(INNER)) + accentBright('▜');

  // ── title line ──
  const headerCore =
    ' ' + bold(accentBright('TRACEENV')) +
    ' ' + secondary('▸▸') + ' ' +
    white('workspace synthesizer');

  const suffixCandidates = [
    ' ' + secondary('·') + ' ' + muted('local-first · safe · reproducible') + ' ',
    ' ' + secondary('·') + ' ' + muted('local-first · safe') + ' ',
    ' ' + secondary('·') + ' ' + muted('local-first') + ' ',
    ' ',
  ];

  const suffix = suffixCandidates.find((candidate) => visibleLength(headerCore + candidate) <= INNER) ?? ' ';
  const titleBody = fitToWidth(headerCore + suffix, INNER);
  const titleLine =
    accentBright('▌') +
    titleBody +
    ' '.repeat(Math.max(0, INNER - visibleLength(titleBody))) +
    accentBright('▐');

  // ── bottom rail ──
  const botLeft  = accentBright('▙') + accent('▄'.repeat(INNER)) + accentBright('▟');

  console.log();
  console.log(topLeft);
  console.log(titleLine);
  console.log(botLeft);
  console.log();
}

// ─── Section header ───────────────────────────────────────────────────────────

export function renderSection(title: string): void {
  const maxW = 56;
  const label = ' ' + title.toUpperCase() + ' ';
  const trailW = Math.max(0, maxW - label.length);
  console.log(
    '\n' +
    accent('◈') + ' ' +
    accentBright(label) +
    secondary('─'.repeat(trailW))
  );
}

// ─── Phase indicator (multi-step progress) ───────────────────────────────────

export function renderPhaseBar(
  steps: string[],
  current: number
): void {
  const parts = steps.map((s, i) => {
    if (i < current)  return accent('◉') + ' ' + accentDim(s);
    if (i === current) return accentBright('◈') + ' ' + white(s);
    return secondary('◌') + ' ' + muted(s);
  });

  console.log('\n  ' + parts.join('  ' + secondary('──')  + '  '));
  console.log(
    '  ' +
    steps.map((_, i) => {
      if (i < current)   return accent('─────');
      if (i === current) return accentBright('──●──');
      return secondary('─────');
    }).join(secondary('┬'))
  );
}

// ─── Horizontal rule styles ───────────────────────────────────────────────────

export function renderDivider(style: 'thin' | 'heavy' | 'double' | 'block' = 'thin'): void {
  const chars: Record<string, string> = {
    thin:   '─',
    heavy:  '━',
    double: '═',
    block:  '▄',
  };
  console.log(secondary(chars[style].repeat(68)));
}

// ─── Startup sequence lines ───────────────────────────────────────────────────

export function renderStartupLines(): void {
  const items: Array<[string, string]> = [
    ['◌', 'Mounting shell history adapter'],
    ['◌', 'Warming noise filter'],
    ['◌', 'Indexing workspace context'],
    ['◈', 'TraceEnv ready'],
  ];

  items.forEach(([sym, text], i) => {
    const isLast = i === items.length - 1;
    const symStr = isLast ? accent(sym) : secondary(sym);
    const txtStr = isLast ? accentBright(text) : muted(text);
    console.log(`  ${symStr}  ${txtStr}`);
  });

  console.log();
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function renderFooter(version: string = '0.1.0'): void {
  console.log(
    '\n  ' +
    secondary('TraceEnv') + ' ' +
    muted(`v${version}`) + '  ' +
    muted('·') + '  ' +
    muted('https://github.com/traceenv') +
    '\n'
  );
}