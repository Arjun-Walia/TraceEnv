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
  const compactPayload = kind === 'infer-workflow' ? compactInferPayload(payload) : payload;

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
    'Use this schema:',
    '{"version":"1.0.0","steps":[{"id":"step-1","command":"npm install","cwd":".","phase":"deps","description":"Install dependencies"}],"prerequisites":["Node.js 18+"],"estimatedTime":"2-5 minutes"}',
    'Only include commands that are directly useful for reconstructing the environment.',
    'Use per-step cwd for monorepos and polyglot repositories when manifests are in subdirectories.',
    'Do not include markdown fences or explanations outside JSON.',
    `Payload: ${JSON.stringify(compactPayload)}`,
  ].join(' ');

  return {
    systemPrompt,
    taskPrompt: taskPromptMap[kind],
    templatePrompt,
  };
}

function compactInferPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const manifestEntries = Array.isArray(payload.manifestEntries)
    ? payload.manifestEntries
        .slice(0, 80)
        .map((entry) => {
          const item = entry as { name?: unknown; directory?: unknown; relativePath?: unknown };
          return {
            name: typeof item.name === 'string' ? item.name : undefined,
            directory: typeof item.directory === 'string' ? item.directory : '.',
            relativePath: typeof item.relativePath === 'string' ? item.relativePath : undefined,
          };
        })
    : [];

  return {
    ...payload,
    manifestEntries,
  };
}
