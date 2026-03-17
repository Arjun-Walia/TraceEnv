export interface TraceEvent {
  at: number;
  name: string;
  payload?: Record<string, unknown>;
}

export class EventBus {
  private readonly events: TraceEvent[] = [];

  emit(name: string, payload?: Record<string, unknown>): void {
    this.events.push({ at: Date.now(), name, payload });
  }

  list(): TraceEvent[] {
    return [...this.events];
  }
}
