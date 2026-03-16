/**
 * Terminal UI utilities for TraceEnv CLI
 * Handles animation rendering and progress display
 */

const CLEAR_LINE = '\x1b[2K\r';
const CURSOR_HIDE = '\x1b[?25l';
const CURSOR_SHOW = '\x1b[?25h';

export class TerminalUI {
  private frameIndex = 0;
  private animationInterval: NodeJS.Timeout | null = null;

  /**
   * Render frames continuously and cycle through them
   */
  animate(
    frames: string[],
    delayMs: number = 200,
    onComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!process.stdout.isTTY) {
        // Non-interactive mode: just show last frame
        console.log(frames[frames.length - 1]);
        onComplete?.();
        resolve();
        return;
      }

      process.stdout.write(CURSOR_HIDE);
      const startTime = Date.now();
      let frameCount = 0;

      this.animationInterval = setInterval(() => {
        const frame = frames[this.frameIndex % frames.length];

        // Clear and redraw
        process.stdout.write(CLEAR_LINE);
        process.stdout.write(frame);

        this.frameIndex++;
        frameCount++;

        // Auto-stop after ~2 seconds or when reaching end
        if (frameCount >= frames.length + 3) {
          this.stopAnimation();
          process.stdout.write(CURSOR_SHOW);
          onComplete?.();
          resolve();
        }
      }, delayMs);
    });
  }

  /**
   * Animate spinner with status text
   */
  spinner(
    frames: string[],
    statusText: string,
    delayMs: number = 350
  ): { stop: () => void } {
    if (!process.stdout.isTTY) {
      console.log(statusText);
      return { stop: () => {} };
    }

    let frameIdx = 0;
    const startTime = Date.now();

    // Show initial frame
    process.stdout.write(frames[0]);

    const interval = setInterval(() => {
      frameIdx++;
      const frame = frames[frameIdx % frames.length];
      // Overwrite current line
      process.stdout.write('\r' + frame);
    }, delayMs);

    return {
      stop: () => {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        
        // Ensure spinner runs for at least 1000ms to be visible
        if (elapsed < 1000) {
          const remaining = 1000 - elapsed;
          setTimeout(() => {
            process.stdout.write('\n');
          }, remaining);
        } else {
          process.stdout.write('\n');
        }
      },
    };
  }

  /**
   * Show success with checkmarks
   */
  success(message: string, files: string[] = []): void {
    console.log(`\n  ✓ ${message}\n`);
    files.forEach((file) => {
      console.log(`    ✔ ${file}`);
    });
    console.log();
  }

  /**
   * Show error with cross
   */
  error(message: string): void {
    console.error(`\n  ✗ ${message}\n`);
  }

  /**
   * Progress bar display
   */
  progress(current: number, total: number, label: string = ''): void {
    const percent = current / total;
    const width = 30;
    const filled = Math.round(percent * width);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentage = Math.round(percent * 100);

    const text =
      label && percentage < 100
        ? `  ${label} [${bar}] ${percentage}%`
        : `  [${bar}] ${percentage}%`;

    process.stdout.write('\r' + text);

    if (percentage === 100) {
      console.log(); // newline on completion
    }
  }

  /**
   * Stop current animation
   */
  private stopAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  /**
   * Clear screen (portable cross-platform)
   */
  static clear(): void {
    process.stdout.write('\x1b[2J\x1b[0f'); // Clear screen + move cursor to top
  }

  /**
   * Print formatted header
   */
  static header(title: string): void {
    console.log(`\n  ╔${'═'.repeat(title.length + 2)}╗`);
    console.log(`  ║ ${title} ║`);
    console.log(`  ╚${'═'.repeat(title.length + 2)}╝\n`);
  }

  /**
   * Print section with divider
   */
  static section(title: string): void {
    console.log(`\n  ─ ${title} ${'─'.repeat(Math.max(0, 40 - title.length))}`);
  }
}
