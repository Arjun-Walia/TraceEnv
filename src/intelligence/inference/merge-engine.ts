import {
  InferenceResult,
  MergeDecision,
  ProviderContributionCandidate,
  StepPhase,
  StepProvenance,
  WorkflowStep,
} from './contracts.js';

export const PHASE_ORDER: Record<StepPhase, number> = {
  prepare: 0,
  deps: 1,
  services: 2,
  build: 3,
  test: 4,
  run: 5,
  install: 1,
};

export class MergeEngine {
  merge(candidates: ProviderContributionCandidate[]): InferenceResult {
    const decisions: MergeDecision[] = [];
    const prerequisites: string[] = [];
    const prerequisiteKeys = new Set<string>();
    const selectedByKey = new Map<string, SelectedStep>();

    for (const candidate of candidates) {
      const contribution = candidate.contribution;

      for (const step of contribution.steps) {
        const normalized = normalizeStep(step);
        const existing = selectedByKey.get(normalized.key);

        if (!existing) {
          selectedByKey.set(normalized.key, {
            providerId: candidate.providerId,
            providerPriority: candidate.providerPriority,
            confidence: contribution.confidence,
            insertionOrder: selectedByKey.size,
            step: normalized.step,
          });

          decisions.push({
            type: 'step-added',
            key: normalized.key,
            providerId: candidate.providerId,
            reason: `Accepted unique step in phase ${normalized.step.phase}.`,
          });
          continue;
        }

        const winner = compareCandidates(
          {
            providerId: candidate.providerId,
            providerPriority: candidate.providerPriority,
            confidence: contribution.confidence,
          },
          {
            providerId: existing.providerId,
            providerPriority: existing.providerPriority,
            confidence: existing.confidence,
          }
        );

        if (winner < 0) {
          selectedByKey.set(normalized.key, {
            providerId: candidate.providerId,
            providerPriority: candidate.providerPriority,
            confidence: contribution.confidence,
            insertionOrder: existing.insertionOrder,
            step: normalized.step,
          });
          decisions.push({
            type: 'step-replaced-conflict',
            key: normalized.key,
            providerId: candidate.providerId,
            reason: `Replaced conflicting step from ${existing.providerId} by higher precedence (priority/confidence).`,
          });
        } else {
          decisions.push({
            type: 'step-skipped-conflict',
            key: normalized.key,
            providerId: candidate.providerId,
            reason: `Skipped conflicting step because ${existing.providerId} has higher precedence (priority/confidence).`,
          });
        }
      }

      for (const prerequisite of contribution.prerequisites ?? []) {
        const key = prerequisite.toLowerCase();
        if (prerequisiteKeys.has(key)) {
          decisions.push({
            type: 'prerequisite-skipped-duplicate',
            key,
            providerId: candidate.providerId,
            reason: 'Skipped duplicate prerequisite.',
          });
          continue;
        }

        prerequisiteKeys.add(key);
        prerequisites.push(prerequisite);
        decisions.push({
          type: 'prerequisite-added',
          key,
          providerId: candidate.providerId,
          reason: 'Accepted unique prerequisite.',
        });
      }
    }

    const selected = [...selectedByKey.values()];
    selected.sort((left, right) => {
      const phaseDiff = PHASE_ORDER[left.step.phase] - PHASE_ORDER[right.step.phase];
      if (phaseDiff !== 0) {
        return phaseDiff;
      }

      const priorityDiff = left.providerPriority - right.providerPriority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const confidenceDiff = right.confidence - left.confidence;
      if (confidenceDiff !== 0) {
        return confidenceDiff;
      }

      const commandDiff = left.step.command.localeCompare(right.step.command);
      if (commandDiff !== 0) {
        return commandDiff;
      }

      const cwdDiff = left.step.cwd.localeCompare(right.step.cwd);
      if (cwdDiff !== 0) {
        return cwdDiff;
      }

      return left.insertionOrder - right.insertionOrder;
    });

    const stepProvenance: StepProvenance[] = selected.map((item) => ({
      stepKey: `${item.step.cwd}::${item.step.command}`,
      stepId: item.step.id,
      command: item.step.command,
      cwd: item.step.cwd,
      providerId: item.providerId,
      confidence: item.confidence,
      providerPriority: item.providerPriority,
      reason: `Selected from ${item.providerId} (priority=${item.providerPriority}, confidence=${item.confidence}).`,
    }));

    return {
      steps: selected.map((item) => item.step),
      prerequisites,
      contributions: candidates.map((candidate) => candidate.contribution),
      providerDecisions: candidates.map((candidate) => ({
        providerId: candidate.providerId,
        applied: candidate.contribution.steps.length > 0 || (candidate.contribution.prerequisites?.length ?? 0) > 0,
        reason:
          candidate.contribution.steps.length > 0 || (candidate.contribution.prerequisites?.length ?? 0) > 0
            ? 'Provider produced contribution.'
            : 'Provider matched but produced no executable contribution.',
        producedSteps: candidate.contribution.steps.length,
      })),
      decisions,
      stepProvenance,
    };
  }
}

interface SelectedStep {
  providerId: string;
  providerPriority: number;
  confidence: number;
  insertionOrder: number;
  step: WorkflowStep;
}

function normalizeStep(step: WorkflowStep): { key: string; step: WorkflowStep } {
  const normalizedCwd = (step.cwd ?? '.').trim() || '.';
  const normalizedCommand = step.command.trim();
  const phase = step.phase === 'install' ? 'deps' : step.phase;

  return {
    key: `${normalizedCwd}::${normalizedCommand}`,
    step: {
      ...step,
      cwd: normalizedCwd,
      phase,
    },
  };
}

function compareCandidates(
  left: { providerId: string; providerPriority: number; confidence: number },
  right: { providerId: string; providerPriority: number; confidence: number }
): number {
  if (left.providerPriority !== right.providerPriority) {
    return left.providerPriority - right.providerPriority;
  }

  if (left.confidence !== right.confidence) {
    return right.confidence - left.confidence;
  }

  return left.providerId.localeCompare(right.providerId);
}