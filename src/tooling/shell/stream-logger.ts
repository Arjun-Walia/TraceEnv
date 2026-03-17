import { Logger } from '../../observability/logger.js';

export class StreamLogger {
  constructor(private readonly logger: Logger) {}

  onStdout(stepId: string, chunk: Buffer): void {
    const text = chunk.toString();
    if (text.trim()) {
      this.logger.info(`[${stepId}] ${text.trimEnd()}`);
    }
  }

  onStderr(stepId: string, chunk: Buffer): void {
    const text = chunk.toString();
    if (text.trim()) {
      this.logger.warn(`[${stepId}] ${text.trimEnd()}`);
    }
  }
}
