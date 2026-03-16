import * as path from 'path';
import * as fs from 'fs';
import { MODELS_DIR } from '../config';
import { CommandRecord } from '../storage/database';
import { isSetupCommand } from '../workflow/analyzer';

export interface SynthesisResult {
  setupCommands: string[];
  prerequisites: string[];
  description: string;
}

/** Returns the first .gguf model found in the models directory, or null. */
function findModel(): string | null {
  if (!fs.existsSync(MODELS_DIR)) return null;
  const file = fs.readdirSync(MODELS_DIR).find((f: string) => f.endsWith('.gguf'));
  return file ? path.join(MODELS_DIR, file) : null;
}

/** Rule-based fallback that requires no LLM. */
function ruleBased(commands: CommandRecord[], cwd: string): SynthesisResult {
  const setupCmds = commands
    .filter((c) => isSetupCommand(c.command))
    .map((c) => c.command);

  const joined = setupCmds.join(' ').toLowerCase();
  const prerequisites: string[] = [];
  if (/npm|yarn|pnpm|node/.test(joined))  prerequisites.push('Node.js v18+');
  if (/docker/.test(joined))              prerequisites.push('Docker');
  if (/python|pip/.test(joined))          prerequisites.push('Python 3.8+');
  if (/ruby|bundle|gem/.test(joined))     prerequisites.push('Ruby 3.0+');
  if (/cargo|rust/.test(joined))          prerequisites.push('Rust (stable)');
  if (/\bgo\b/.test(joined))              prerequisites.push('Go 1.21+');
  if (/composer/.test(joined))            prerequisites.push('PHP + Composer');

  return {
    setupCommands:
      setupCmds.length > 0
        ? setupCmds
        : ['# No setup commands detected in this directory.'],
    prerequisites,
    description: `Development environment setup for ${path.basename(cwd)}`,
  };
}

/** LLM-powered synthesis using node-llama-cpp. */
async function synthesizeWithLLM(
  modelPath: string,
  commands: CommandRecord[],
  cwd: string
): Promise<SynthesisResult> {
  // Dynamic import so a missing optional dep doesn't crash at startup
  const { getLlama, LlamaChatSession } = await import('node-llama-cpp');

  const llama = await getLlama();
  const model = await llama.loadModel({ modelPath });
  const context = await model.createContext({ contextSize: 2048 });
  const session = new LlamaChatSession({
    contextSequence: context.getSequence(),
  });

  const commandList = commands.map((c) => `$ ${c.command}`).join('\n');

  const prompt = `You are a developer tool that analyses shell command history and extracts the minimal setup sequence needed to reproduce a development environment.

Project directory: "${cwd}"

Command history:
${commandList}

Extract ONLY the commands needed to set up this project from scratch (dependencies, environment, build steps, service startup). Exclude navigation, file viewing, and exploration commands.

Respond in this exact JSON format with no extra text:
{
  "setupCommands": ["command1", "command2"],
  "prerequisites": ["Node.js v18+", "Docker"],
  "description": "Brief one-sentence description of the project environment"
}`;

  const response = await session.prompt(prompt, { maxTokens: 512 });
  await context.dispose();
  await llama.dispose();

  const match = response.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as SynthesisResult;
    } catch {
      /* fall through */
    }
  }

  return ruleBased(commands, cwd);
}

/** Synthesize setup documentation from observed commands. */
export async function synthesize(
  commands: CommandRecord[],
  cwd: string
): Promise<SynthesisResult> {
  const modelPath = findModel();

  if (modelPath) {
    console.log(`[traceenv] Using model: ${path.basename(modelPath)}`);
    try {
      return await synthesizeWithLLM(modelPath, commands, cwd);
    } catch (err) {
      console.warn(
        '[traceenv] LLM synthesis failed, falling back to rule-based analysis:',
        (err as Error).message
      );
    }
  } else {
    console.log(
      '[traceenv] No GGUF model found — using rule-based analysis.\n' +
        `         To enable AI synthesis, place a Qwen2.5-Coder GGUF file in:\n` +
        `         ${MODELS_DIR}`
    );
  }

  return ruleBased(commands, cwd);
}
