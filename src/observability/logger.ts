export class Logger {
  info(message: string): void {
    console.log(`[traceenv] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[traceenv] ${message}`);
  }

  error(message: string): void {
    console.error(`[traceenv] ${message}`);
  }
}
