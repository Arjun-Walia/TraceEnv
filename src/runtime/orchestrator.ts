import { RuntimeManager, RuntimeOrchestrationResult } from './manager-types.js';
import { RuntimeRequirement } from './types.js';

export interface RuntimeOrchestratorOptions {
  managers: RuntimeManager[];
}

export class RuntimeOrchestrator {
  private readonly managerMap: Map<RuntimeRequirement['runtime'], RuntimeManager>;

  constructor(private readonly options: RuntimeOrchestratorOptions) {
    this.managerMap = new Map<RuntimeRequirement['runtime'], RuntimeManager>();
    for (const manager of options.managers) {
      this.managerMap.set(manager.runtime, manager);
    }
  }

  async resolveRequirements(
    projectRoot: string,
    requirements: RuntimeRequirement[]
  ): Promise<RuntimeOrchestrationResult> {
    const resolved: RuntimeOrchestrationResult['resolved'] = [];
    const unresolved: RuntimeOrchestrationResult['unresolved'] = [];

    for (const requirement of requirements) {
      const manager = this.managerMap.get(requirement.runtime);
      if (!manager) {
        unresolved.push({
          requirement,
          reason: `No runtime manager is registered for ${requirement.runtime}.`,
          remediation: [`Install or enable a ${requirement.runtime} runtime manager.`],
        });
        continue;
      }

      if (!manager.supportsPlatform(process.platform)) {
        unresolved.push({
          requirement,
          reason: `${requirement.runtime} manager does not support this platform.`,
          remediation: [
            `Run on a supported platform or add a compatible ${requirement.runtime} manager.`,
          ],
        });
        continue;
      }

      const installed = await manager.detectInstalled(projectRoot);
      const selected = await manager.resolveCompatible(requirement.versionRange, installed);

      if (!selected) {
        unresolved.push({
          requirement,
          reason: `No installed ${requirement.runtime} version satisfies ${requirement.versionRange}.`,
          remediation: [
            `Install ${requirement.runtime} ${requirement.versionRange}.`,
            'Retry the workflow after installation.',
          ],
        });
        continue;
      }

      const context = await manager.activate(selected, projectRoot);
      resolved.push({
        requirement,
        selected,
        context,
        installedNow: false,
        reason: `Selected installed ${requirement.runtime} ${selected.version} that satisfies ${requirement.versionRange}.`,
      });
    }

    return {
      resolved,
      unresolved,
    };
  }
}