import { IntelligenceProvider } from './adapter.js';
import { WorkflowSpec } from '../../domain/types.js';
import { IntelligenceRequest } from './adapter.js';

export class RemoteApiProvider implements IntelligenceProvider {
  id: string;
  label: string;
  requiresNetwork = true;

  constructor(providerId: 'openai' | 'claude' = 'openai') {
    this.id = providerId;
    this.label = providerId === 'claude' ? 'Claude API' : 'OpenAI API';
  }

  private resolveApiKey(request: IntelligenceRequest): string {
    if (request.apiKey) {
      return request.apiKey;
    }

    if (this.id === 'claude') {
      return process.env.ANTHROPIC_API_KEY ?? '';
    }

    return process.env.OPENAI_API_KEY ?? '';
  }

  private parseWorkflow(text: string): WorkflowSpec | null {
    const trimmed = text.trim();
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

  private async callOpenAi(request: IntelligenceRequest, apiKey: string): Promise<WorkflowSpec | null> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model ?? 'gpt-5.4',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: request.prompt.systemPrompt },
          {
            role: 'user',
            content: `${request.prompt.taskPrompt}\n\n${request.prompt.templatePrompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with HTTP ${response.status}`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return this.parseWorkflow(payload.choices?.[0]?.message?.content ?? '');
  }

  private async callClaude(request: IntelligenceRequest, apiKey: string): Promise<WorkflowSpec | null> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model ?? 'claude-sonnet-4',
        max_tokens: 1600,
        temperature: 0.1,
        system: request.prompt.systemPrompt,
        messages: [
          {
            role: 'user',
            content: `${request.prompt.taskPrompt}\n\n${request.prompt.templatePrompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude request failed with HTTP ${response.status}`);
    }

    const payload = await response.json() as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const text = payload.content?.find((item) => item.type === 'text')?.text ?? '';
    return this.parseWorkflow(text);
  }

  async inferWorkflow(request: IntelligenceRequest): Promise<WorkflowSpec | null> {
    const apiKey = this.resolveApiKey(request);
    if (!apiKey) {
      throw new Error(
        this.id === 'claude'
          ? 'Claude API key is not configured. Use trace config --api-key <key> or set ANTHROPIC_API_KEY.'
          : 'OpenAI API key is not configured. Use trace config --api-key <key> or set OPENAI_API_KEY.'
      );
    }

    if (this.id === 'claude') {
      return this.callClaude(request, apiKey);
    }

    return this.callOpenAi(request, apiKey);
  }
}
