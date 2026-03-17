export interface TraceMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  stepsExecuted: number;
}

export class MetricsCollector {
  private metrics: TraceMetrics = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    stepsExecuted: 0,
  };

  recordRun(success: boolean, stepCount: number): void {
    this.metrics.totalRuns += 1;
    this.metrics.stepsExecuted += stepCount;
    if (success) {
      this.metrics.successfulRuns += 1;
    } else {
      this.metrics.failedRuns += 1;
    }
  }

  snapshot(): TraceMetrics {
    return { ...this.metrics };
  }
}
