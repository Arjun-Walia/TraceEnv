export interface PromptBundle {
  systemPrompt: string;
  taskPrompt: string;
  templatePrompt: string;
}

export type IntelligenceTaskKind =
  | 'infer-workflow'
  | 'detect-dependencies'
  | 'reorder-commands'
  | 'repair-workflow'
  | 'suggest-improvements';

export function buildPromptBundle(
  kind: IntelligenceTaskKind,
  payload: Record<string, unknown>
): PromptBundle {
  const systemPrompt = [
    'You are TraceEnv Intelligence.',
    'You analyze developer setup workflows.',
    'You never assume permission to execute commands.',
    'You must return structured, deterministic output that can be validated before use.',
  ].join(' ');

  const taskPromptMap: Record<IntelligenceTaskKind, string> = {
    'infer-workflow': 'Infer a reproducible development environment workflow from repository context.',
    'detect-dependencies': 'Detect setup dependencies and prerequisites from repository context.',
    'reorder-commands': 'Reorder commands into a safer and more deterministic setup workflow.',
    'repair-workflow': 'Repair a broken setup workflow while preserving intent.',
    'suggest-improvements': 'Suggest improvements for reliability, reproducibility, and onboarding speed.',
  };

  const templatePrompt = [
    'Return JSON only.',
    'Include commands, prerequisites, rationale, risks, and validation notes.',
    `Payload: ${JSON.stringify(payload)}`,
  ].join(' ');

  return {
    systemPrompt,
    taskPrompt: taskPromptMap[kind],
    templatePrompt,
  };
}
