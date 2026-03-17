import { ExecutionPlan } from '../domain/types.js';

export class RollbackCoordinator {
  async rollback(_plan: ExecutionPlan): Promise<void> {
    // Reserved for future: execute rollback rules in reverse order.
  }
}
