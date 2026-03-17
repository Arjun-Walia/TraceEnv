import { accent, muted, secondary, white } from './theme.js';

export function renderCommandLogo(): void {
  const top = `${accent('╭')} ${accent('TraceEnv')} ${secondary('──────────────────────────────────────────')} ${accent('╮')}`;
  const middle = `${accent('│')} ${white('Workspace Orchestrator')} ${muted('local-first • safe • reproducible')} ${accent('│')}`;
  const bottom = `${accent('╰')}${secondary('────────────────────────────────────────────────────────────────')}${accent('╯')}`;

  console.log(`\n${top}`);
  console.log(middle);
  console.log(bottom);
}
