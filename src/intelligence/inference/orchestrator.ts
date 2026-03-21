import {
  InferenceContribution,
  InferenceContext,
  InferenceResult,
  MergeDecision,
  WorkflowStep,
} from './contracts.js';
import { ProviderRegistry } from './provider-registry.js';

const PHASE_ORDER: Record<string, number> = {
  prepare: 0,
  deps: 1,
  services: 2,
  build: 3,
  test: 4,
  run: 5,
  install: 1,
};

export class InferenceOrchestrator {
  constructor(private readonly registry: ProviderRegistry) {}

  infer(context: InferenceContext): InferenceResult {
    const contributions: InferenceContribution[] = [];
    const decisions: MergeDecision[] = [];
    const selectedSteps: WorkflowStep[] = [];
    const prerequisites: string[] = [];
    const stepKeys = new Set<string>();
    const prerequisiteKeys = new Set<string>();

    for (const provider of this.registry.resolve(context)) {
      const contribution = provider.infer(context);
      if (!contribution) {
        continue;
      }

      contributions.push(contribution);

      for (const step of contribution.steps) {
        const normalizedCwd = (step.cwd ?? '.').trim() || '.';
        const key = `${normalizedCwd}::${step.command.trim()}`;

        if (stepKeys.has(key)) {
          decisions.push({
            type: 'step-skipped-conflict',
            key,
            providerId: contribution.providerId,
            reason: 'Skipped duplicate step key.',
          });
          continue;
        }

        stepKeys.add(key);
        selectedSteps.push({ ...step, cwd: normalizedCwd });
        decisions.push({
          type: 'step-added',
          key,
          providerId: contribution.providerId,
          reason: 'Accepted unique step.',
        });
      }

      for (const prerequisite of contribution.prerequisites ?? []) {
        const key = prerequisite.toLowerCase();
        if (prerequisiteKeys.has(key)) {
          decisions.push({
            type: 'prerequisite-skipped-duplicate',
            key,
            providerId: contribution.providerId,
            reason: 'Skipped duplicate prerequisite.',
          });
          continue;
        }

        prerequisiteKeys.add(key);
        prerequisites.push(prerequisite);
        decisions.push({
          type: 'prerequisite-added',
          key,
          providerId: contribution.providerId,
          reason: 'Accepted unique prerequisite.',
        });
      }
    }

    selectedSteps.sort((left, right) => {
      const phaseDiff = (PHASE_ORDER[left.phase] ?? 99) - (PHASE_ORDER[right.phase] ?? 99);
      if (phaseDiff !== 0) {
        return phaseDiff;
      }
      return left.command.localeCompare(right.command);
    });

    return {
      steps: selectedSteps,
      prerequisites,
      contributions,
      decisions,
    };
  }
}