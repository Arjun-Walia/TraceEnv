export const PALETTE = {
  accent: '#00FF41',
  secondary: '#005F20',
  white: '#FFFFFF',
  muted: '#6B7280',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function color(hex: string, text: string): string {
  if (!process.stdout.isTTY) {
    return text;
  }
  const { r, g, b } = hexToRgb(hex);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

export function accent(text: string): string {
  return color(PALETTE.accent, text);
}

export function secondary(text: string): string {
  return color(PALETTE.secondary, text);
}

export function white(text: string): string {
  return color(PALETTE.white, text);
}

export function muted(text: string): string {
  return color(PALETTE.muted, text);
}

export function bold(text: string): string {
  if (!process.stdout.isTTY) {
    return text;
  }
  return `\x1b[1m${text}\x1b[0m`;
}

export const BRAILLE_SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function clearLine(): void {
  process.stdout.write('\r\x1b[K');
}

export function padRight(text: string, width: number): string {
  if (text.length >= width) return text;
  return text + ' '.repeat(width - text.length);
}
