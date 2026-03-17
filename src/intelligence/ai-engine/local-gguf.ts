import { IntelligenceProvider } from './adapter.js';
import { WorkflowSpec } from '../../domain/types.js';
import { IntelligenceRequest } from './adapter.js';
import * as fs from 'fs';
import * as path from 'path';
import { MODELS_DIR } from '../../config.js';

export class LocalGgufProvider implements IntelligenceProvider {
  id = 'local';
  label = 'Local GGUF via llama.cpp';
  requiresNetwork = false;

  private findModel(modelHint?: string): string | null {
    if (!fs.existsSync(MODELS_DIR)) {
      return null;
    }

    const files = fs.readdirSync(MODELS_DIR).filter((file) => file.endsWith('.gguf'));
    if (files.length === 0) {
      return null;
    }

    if (modelHint) {
      const normalizedHint = modelHint.toLowerCase();
      const exact = files.find((file) => file.toLowerCase().includes(normalizedHint));
      if (exact) {
        return path.join(MODELS_DIR, exact);
      }
    }

    return path.join(MODELS_DIR, files[0]);
  }

  private parseWorkflow(response: string): WorkflowSpec | null {
    const trimmed = response.trim();
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      return null;
    }

    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as WorkflowSpec;
    if (!parsed || !Array.isArray(parsed.steps)) {
      return null;
    }

    return parsed;
  }

  async inferWorkflow(request: IntelligenceRequest): Promise<WorkflowSpec | null> {
    const modelPath = this.findModel(request.model);
    if (!modelPath) {
      throw new Error(`No GGUF model found in ${MODELS_DIR}.`);
    }

    const { getLlama, LlamaChatSession } = await import('node-llama-cpp');

    const llama = await getLlama();
    const model = await llama.loadModel({ modelPath });
    const context = await model.createContext({ contextSize: 4096 });
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
    });

    const prompt = [
      request.prompt.systemPrompt,
      '',
      request.prompt.taskPrompt,
      '',
      request.prompt.templatePrompt,
    ].join('\n');

    try {
      const response = await session.prompt(prompt, { maxTokens: 1024 });
      return this.parseWorkflow(response);
    } finally {
      await context.dispose();
      await llama.dispose();
    }
  }
}
