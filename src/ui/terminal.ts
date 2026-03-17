/**
 * TraceEnv · Terminal UI
 * Renders every piece of output with deliberate visual hierarchy.
 */

import {
  accent, accentBright, accentDim, secondary, muted, white, offWhite,
  danger, warn, info,
  bold, dimStyle,
  SYM, BORDER, BRAILLE_SPINNER, BadgeStyle, badge,
  clearLine, padRight, padLeft, ruler,
  progressBar as themeProgressBar,
} from './theme.js';

const CURSOR_HIDE = '\x1b[?25l';
const CURSOR_SHOW = '\x1b[?25h';
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

// ─── TerminalUI ───────────────────────────────────────────────────────────────

export class TerminalUI {
  private frameIndex        = 0;
  private animationInterval: NodeJS.Timeout | null = null;

  // ─── Animation ─────────────────────────────────────────────────────────────

  animate(
    frames:      string[],
    delayMs:     number = 180,
    onComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!process.stdout.isTTY) {
        console.log(frames[frames.length - 1]);
        onComplete?.();
        resolve();
        return;
      }

      process.stdout.write(CURSOR_HIDE);
      let frameCount   = 0;
      let linesPrinted = 0;

      this.animationInterval = setInterval(() => {
        const frame = frames[this.frameIndex % frames.length];
        const lines = frame.split('\n').length;

        // Erase previous frame
        if (linesPrinted > 0) {
          process.stdout.write(`\x1b[${linesPrinted}A\x1b[J`);
        }

        process.stdout.write(frame);
        linesPrinted = lines;
        this.frameIndex++;
        frameCount++;

        if (frameCount >= frames.length + 2) {
          this.stopAnimation();
          process.stdout.write(CURSOR_SHOW);
          onComplete?.();
          resolve();
        }
      }, delayMs);
    });
  }

  // ─── Spinner ───────────────────────────────────────────────────────────────

  spinner(
    frames:     string[],
    statusText: string,
    delayMs:    number = 120
  ): { stop: (finalMsg?: string) => void } {
    if (!process.stdout.isTTY) {
      console.log(muted('  ' + SYM.pending + '  ' + statusText));
      return { stop: (msg) => msg && console.log(accent('  ' + SYM.ok + '  ' + msg)) };
    }

    let idx       = 0;
    const started = Date.now();

    process.stdout.write(muted('  ' + frames[0]));

    const interval = setInterval(() => {
      idx++;
      clearLine();
      process.stdout.write(muted('  ' + frames[idx % frames.length]));
    }, delayMs);

    return {
      stop: (finalMsg?: string) => {
        clearInterval(interval);
        const elapsed = Date.now() - started;
        const flush = () => {
          clearLine();
          if (finalMsg) {
            console.log(accent('  ' + SYM.ok + '  ') + white(finalMsg));
          }
        };
        elapsed < 800
          ? setTimeout(flush, 800 - elapsed)
          : flush();
      },
    };
  }

  // ─── Bordered box ──────────────────────────────────────────────────────────

  box(
    title:   string,
    lines:   string[],
    options: { style?: 'rounded' | 'heavy' | 'double' | 'block'; width?: number } = {}
  ): void {
    const { style = 'heavy', width = 52 } = options;

    let tl: string, tr: string, bl: string, br: string, h: string, v: string;

    switch (style) {
      case 'rounded':
        [tl, tr, bl, br, h, v] = ['╭','╮','╰','╯','─','│']; break;
      case 'double':
        [tl, tr, bl, br, h, v] = ['╔','╗','╚','╝','═','║']; break;
      case 'block':
        [tl, tr, bl, br, h, v] = ['▛','▜','▙','▟','▀','▌']; break;
      default: // heavy
        [tl, tr, bl, br, h, v] = ['┏','┓','┗','┛','━','┃']; break;
    }

    const terminalWidth = process.stdout.columns ?? (width + 2);
    const outerWidth = Math.max(14, Math.min(width, terminalWidth - 1));
    const innerW = outerWidth - 2;
    const bodyW = Math.max(1, innerW - 2);
    const top = secondary(tl) + secondary(h.repeat(innerW)) + secondary(tr);
    const bottom = secondary(bl) + secondary(h.repeat(innerW)) + secondary(br);

    console.log(top);

    const fittedTitle = fitToWidth(accent(title), bodyW);
    const titleRow = padRight(fittedTitle, bodyW);
    console.log(secondary(v) + ' ' + titleRow + ' ' + secondary(v));

    lines.forEach((line) => {
      const fitted = fitToWidth(line, bodyW);
      const padded = padRight(fitted, bodyW);
      console.log(secondary(v) + ' ' + padded + ' ' + secondary(v));
    });

    console.log(bottom);
  }

  // ─── Key-value pairs ───────────────────────────────────────────────────────

  keyValue(
    pairs:   Array<[string, string]>,
    options: { keyWidth?: number; title?: string } = {}
  ): void {
    const { keyWidth = 22, title } = options;

    if (title) {
      console.log('\n  ' + accent(SYM.spark + ' ') + white(title.toUpperCase()) + ' ' + secondary('─'.repeat(40 - title.length)));
    }

    pairs.forEach(([key, value]) => {
      const k = padRight(muted(key), keyWidth + 8); // +8 for escape codes
      console.log('  ' + k + secondary(SYM.sep) + '  ' + white(value));
    });
  }

  // ─── Table ─────────────────────────────────────────────────────────────────

  table(
    headers: string[],
    rows:    string[][],
    options: { title?: string } = {}
  ): void {
    const { title } = options;

    // Compute column widths
    const colWidths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)) + 2
    );

    const totalW = colWidths.reduce((a, b) => a + b, 0) + colWidths.length + 1;
    const hSep   = secondary('─'.repeat(totalW));

    if (title) {
      console.log('\n  ' + accent(SYM.spark + ' ') + white(title.toUpperCase()));
    }

    // Header
    const headerRow =
      secondary('│') +
      headers.map((h, i) => secondary(' ') + accentDim(h.padEnd(colWidths[i] - 1)) + secondary('│')).join('');
    console.log('  ' + hSep);
    console.log('  ' + headerRow);
    console.log('  ' + hSep);

    // Rows
    rows.forEach((row, ri) => {
      const rowStr =
        secondary('│') +
        headers.map((_, i) => {
          const cell = (row[i] ?? '').padEnd(colWidths[i] - 1);
          return secondary(' ') + (ri % 2 === 0 ? white(cell) : offWhite(cell)) + secondary('│');
        }).join('');
      console.log('  ' + rowStr);
    });

    console.log('  ' + hSep);
  }

  // ─── File tree ─────────────────────────────────────────────────────────────

  tree(
    items: Array<{ name: string; note?: string; isLast?: boolean; depth?: number }>,
    root?:  string
  ): void {
    if (root) {
      console.log('\n  ' + accent(SYM.diamond + '  ') + white(root));
    }

    items.forEach((item, i) => {
      const isLast = item.isLast ?? i === items.length - 1;
      const depth  = item.depth ?? 0;
      const indent = '  '.repeat(depth);
      const branch = isLast ? accent(SYM.treeEnd) : accent(SYM.treeMid);
      const name   = accentDim(item.name);
      const note   = item.note ? '  ' + muted(item.note) : '';
      console.log(`  ${indent}${branch} ${name}${note}`);
    });

    console.log();
  }

  // ─── Timeline (multi-step progress) ───────────────────────────────────────

  timeline(
    steps:   string[],
    current: number,
    options: { title?: string } = {}
  ): void {
    const { title } = options;

    if (title) {
      console.log('\n  ' + accent(SYM.spark + ' ') + white(title.toUpperCase()));
      console.log('  ' + secondary('─'.repeat(52)));
    }

    steps.forEach((step, i) => {
      let sym: string;
      let labelFn: (t: string) => string;

      if (i < current) {
        sym     = accent(SYM.ok);
        labelFn = accentDim;
      } else if (i === current) {
        sym     = accentBright(SYM.spark);
        labelFn = white;
      } else {
        sym     = secondary(SYM.pending);
        labelFn = muted;
      }

      const connector = i < steps.length - 1
        ? (i < current ? accent('  │') : secondary('  │'))
        : '';

      console.log(`  ${sym}  ${labelFn(step)}`);
      if (connector) console.log(connector);
    });

    console.log();
  }

  // ─── Phase bar (inline horizontal) ────────────────────────────────────────

  phaseBar(steps: string[], current: number): void {
    const parts = steps.map((s, i) => {
      if (i < current)    return accent(SYM.ok + ' ') + accentDim(s);
      if (i === current)  return accentBright(SYM.spark + ' ') + white(s);
      return secondary(SYM.pending + ' ') + muted(s);
    });
    console.log('\n  ' + parts.join('  ' + secondary('──') + '  ') + '\n');
  }

  // ─── Progress bar ──────────────────────────────────────────────────────────

  progress(current: number, total: number, label: string = ''): void {
    const bar = themeProgressBar(current, total, 28, label);
    process.stdout.write('\r  ' + bar);
    if (current >= total) console.log();
  }

  // ─── Success / error ───────────────────────────────────────────────────────

  success(message: string, files: string[] = []): void {
    console.log('\n  ' + accent(SYM.ok + '  ') + white(message));
    files.forEach((f, i) => {
      const isLast = i === files.length - 1;
      console.log('  ' + accent(isLast ? SYM.treeEnd : SYM.treeMid) + ' ' + accentDim(f));
    });
    console.log();
  }

  error(message: string, hint?: string): void {
    console.error('\n  ' + danger(SYM.fail + '  ') + white(message));
    if (hint) console.error('     ' + muted(hint));
    console.error();
  }

  warnMessage(message: string): void {
    console.log('\n  ' + warn(SYM.warn + '  ') + white(message) + '\n');
  }

  // ─── Status line ───────────────────────────────────────────────────────────

  statusLine(pairs: Array<[string, string]>): void {
    const parts = pairs.map(
      ([k, v]) => muted(k) + ' ' + secondary(SYM.sep) + ' ' + accent(v)
    );
    console.log('  ' + parts.join('  ' + muted(SYM.dot) + '  '));
  }

  // ─── Badge row ─────────────────────────────────────────────────────────────

  badges(items: Array<{ label: string; style: BadgeStyle }>): void {
    const row = items.map((b) => badge(b.label, b.style)).join('  ');
    console.log('  ' + row);
  }

  // ─── Statics ───────────────────────────────────────────────────────────────

  static clear(): void {
    process.stdout.write('\x1b[2J\x1b[0f');
  }

  static header(title: string): void {
    const inner = ` ${title} `;
    const top   = '╔' + '═'.repeat(inner.length) + '╗';
    const mid   = '║' + inner + '║';
    const bot   = '╚' + '═'.repeat(inner.length) + '╝';
    console.log('\n  ' + secondary(top));
    console.log('  ' + secondary('║') + accentBright(inner) + secondary('║'));
    console.log('  ' + secondary(bot) + '\n');
  }

  static section(title: string): void {
    const trail = '─'.repeat(Math.max(0, 44 - title.length));
    console.log('\n  ' + accent(SYM.spark + ' ') + white(title.toUpperCase()) + ' ' + secondary(trail));
  }

  static divider(char: string = '─', width: number = 52): void {
    console.log('  ' + secondary(char.repeat(width)));
  }

  static blank(): void {
    console.log();
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private stopAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }
}