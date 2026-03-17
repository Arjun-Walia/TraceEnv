/**
 * TraceEnv UI theme utilities.
 */

export const PALETTE = {
  accentBright: '#80FFB4',
  accent: '#00FF41',
  accentDim: '#00CC33',
  secondary: '#005F20',
  tertiary: '#003311',
  ghost: '#0D1F10',
  white: '#F0FFF4',
  offWhite: '#C8EDCC',
  muted: '#4B7A57',
  dim: '#2A3D2E',
  danger: '#FF3B30',
  warn: '#FFB800',
  info: '#00CFFF',
  ok: '#00FF41',
} as const;

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function color(hex: string, text: string): string {
  if (!process.stdout.isTTY) return text;
  const { r, g, b } = hexToRgb(hex);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

export const accentBright = (t: string) => color(PALETTE.accentBright, t);
export const accent = (t: string) => color(PALETTE.accent, t);
export const accentDim = (t: string) => color(PALETTE.accentDim, t);
export const secondary = (t: string) => color(PALETTE.secondary, t);
export const tertiary = (t: string) => color(PALETTE.tertiary, t);
export const ghostColor = (t: string) => color(PALETTE.ghost, t);
export const white = (t: string) => color(PALETTE.white, t);
export const offWhite = (t: string) => color(PALETTE.offWhite, t);
export const muted = (t: string) => color(PALETTE.muted, t);
export const danger = (t: string) => color(PALETTE.danger, t);
export const warn = (t: string) => color(PALETTE.warn, t);
export const info = (t: string) => color(PALETTE.info, t);

export function bold(t: string): string {
  if (!process.stdout.isTTY) return t;
  return `\x1b[1m${t}\x1b[0m`;
}

export function dimStyle(t: string): string {
  if (!process.stdout.isTTY) return t;
  return `\x1b[2m${t}\x1b[0m`;
}

export function italic(t: string): string {
  if (!process.stdout.isTTY) return t;
  return `\x1b[3m${t}\x1b[0m`;
}

export function underline(t: string): string {
  if (!process.stdout.isTTY) return t;
  return `\x1b[4m${t}\x1b[0m`;
}

export const SYM = {
  ok: '✓',
  fail: '✗',
  warn: '⚠',
  pending: '◌',
  active: '◉',
  node: '◎',
  spark: '◈',
  pulse: '⊛',
  trace: '⌁',
  arrowR: '→',
  arrowD: '↓',
  arrowL: '←',
  arrowU: '↑',
  flow: '⟶',
  pipe: '▸',
  pipeDouble: '▸▸',
  full: '█',
  dark: '▓',
  medium: '▒',
  light: '░',
  treeEnd: '└─',
  treeMid: '├─',
  treeVert: '│ ',
  dot: '·',
  bullet: '•',
  diamond: '◆',
  sep: '│',
} as const;

export type BadgeStyle = 'ok' | 'error' | 'warn' | 'info' | 'muted' | 'live';

export function badge(label: string, style: BadgeStyle = 'ok'): string {
  const fn: Record<BadgeStyle, (t: string) => string> = {
    ok: (t) => accent(`▐ ${t} ▌`),
    error: (t) => danger(`▐ ${t} ▌`),
    warn: (t) => warn(`▐ ${t} ▌`),
    info: (t) => info(`▐ ${t} ▌`),
    muted: (t) => muted(`▐ ${t} ▌`),
    live: (t) => accentBright(`▐ ${t} ▌`),
  };
  return fn[style](label.toUpperCase());
}

export const BORDER = {
  tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
  htl: '┏', htr: '┓', hbl: '┗', hbr: '┛', hh: '━', hv: '┃',
  dtl: '╔', dtr: '╗', dbl: '╚', dbr: '╝', dh: '═', dv: '║',
  btl: '▛', btr: '▜', bbl: '▙', bbr: '▟', bh: '▀', bhb: '▄',
  ltee: '├', rtee: '┤', ttee: '┬', btee: '┴', cross: '┼',
  hltee: '┣', hrtee: '┫',
} as const;

export const BRAILLE_SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export const GEO_SPINNER = ['◢ ', '◣ ', '◤ ', '◥ '];
export const PULSE_SPINNER = ['▱▱▱▱▱', '▰▱▱▱▱', '▰▰▱▱▱', '▰▰▰▱▱', '▰▰▰▰▱', '▰▰▰▰▰', '▱▰▰▰▰', '▱▱▰▰▰', '▱▱▱▰▰', '▱▱▱▱▰'];
export const WAVE_SPINNER = ['▁▂▃▄▅▆▇█', '▂▃▄▅▆▇█▇', '▃▄▅▆▇█▇▆', '▄▅▆▇█▇▆▅', '▅▆▇█▇▆▅▄', '▆▇█▇▆▅▄▃', '▇█▇▆▅▄▃▂', '█▇▆▅▄▃▂▁'];
export const CIRCUIT_SPINNER = ['◌─────', '─◎────', '──◉───', '───◎──', '────◌─', '───◎──', '──◉───', '─◎────'];
export const SCAN_SPINNER = ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸'];
export const GROW_SPINNER = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█', '▉', '▊', '▋', '▌', '▍', '▎'];

export function progressBar(current: number, total: number, width: number = 24, label: string = ''): string {
  const pct = Math.min(1, current / total);
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const bar = accent('█'.repeat(filled)) + secondary('░'.repeat(empty));
  const pctStr = muted(`${Math.round(pct * 100)}%`);
  const prefix = label ? `${muted(label)} ` : '';
  return `${prefix}${secondary('▕')}${bar}${secondary('▏')} ${pctStr}`;
}

export function clearLine(): void {
  process.stdout.write('\r\x1b[K');
}

export function moveCursorUp(n: number): void {
  if (process.stdout.isTTY) process.stdout.write(`\x1b[${n}A`);
}

export function padRight(text: string, width: number): string {
  const visible = text.replace(ANSI_PATTERN, '').length;
  return text + ' '.repeat(Math.max(0, width - visible));
}

export function padLeft(text: string, width: number): string {
  const visible = text.replace(ANSI_PATTERN, '').length;
  return ' '.repeat(Math.max(0, width - visible)) + text;
}

export function ruler(width: number = 60, char: string = '─'): string {
  return secondary(char.repeat(width));
}
