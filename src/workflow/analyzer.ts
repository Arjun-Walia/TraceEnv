import { CommandRecord, getCommandsInCwd } from '../storage/database';
import * as path from 'path';

// Commands that are pure noise — never part of setup
const NOISE_PATTERNS: RegExp[] = [
  /^(ls|ll|la|dir|pwd|clear|cls|history|exit|logout)\b/i,
  /^cd(\s|$)/i,
  /^git\s+(status|log|diff|branch|stash(\s+list)?|remote\s+-v|show|fetch|pull\b)/i,
  /^(cat|less|more|head|tail|bat)\s+/i,
  /^(vim?|nano|emacs|code|subl|atom|open)\s*\S*$/i,
  /^(man|help|which|where|type)\s+/i,
  /^(ping|nslookup|traceroute|dig)\s+/i,
  /^(echo|printf)\s+/i,
  /^(ps|top|htop|jobs)\b/i,
  /^(find|grep|awk|sed|wc|sort|uniq|xargs)\s+/i,
  // curl/wget reads without saving to a file are read-only exploration
  /^curl\s+(?!.*(-o\s|--output|-O\b|>\s))/i,
];

// Commands that ARE relevant for environment setup
export const SETUP_PATTERNS: { pattern: RegExp; tech: string }[] = [
  { pattern: /^npm\s+(install|ci)\b/,              tech: 'Node.js' },
  { pattern: /^yarn(\s+install)?\b/,               tech: 'Node.js' },
  { pattern: /^pnpm\s+(install|i)\b/,              tech: 'Node.js' },
  { pattern: /^npm\s+run\s+\w+/,                   tech: 'Node.js' },
  { pattern: /^pip3?\s+install\b/,                 tech: 'Python' },
  { pattern: /^python3?\s+-m\s+pip\s+install\b/,   tech: 'Python' },
  { pattern: /^bundle(\s+install)?\b/,             tech: 'Ruby' },
  { pattern: /^gem\s+install\b/,                   tech: 'Ruby' },
  { pattern: /^cargo\s+(build|install)\b/,         tech: 'Rust' },
  { pattern: /^go\s+(mod\s+download|get|build)\b/, tech: 'Go' },
  { pattern: /^composer\s+(install|update)\b/,     tech: 'PHP' },
  { pattern: /^docker(\s+compose|\-compose)\b/i,   tech: 'Docker' },
  { pattern: /^docker\s+build\b/i,                 tech: 'Docker' },
  { pattern: /^make\b/,                            tech: 'Make' },
  { pattern: /^cmake\b/,                           tech: 'CMake' },
  { pattern: /^\.\/configure\b/,                   tech: 'Autoconf' },
  { pattern: /^cp\s+.*\.(env|example|sample)/i,    tech: 'Environment' },
  { pattern: /^source\s+/,                         tech: 'Environment' },
  { pattern: /^export\s+\w+=/,                     tech: 'Environment' },
  { pattern: /^migrate|rails\s+db:/i,              tech: 'Database' },
  { pattern: /^python.*manage\.py\s+migrate/,      tech: 'Database' },
];

export function isNoise(command: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(command.trim()));
}

export function isSetupCommand(command: string): boolean {
  return SETUP_PATTERNS.some(({ pattern }) => pattern.test(command.trim()));
}

export function detectTechs(commands: string[]): string[] {
  const found = new Set<string>();
  for (const cmd of commands) {
    for (const { pattern, tech } of SETUP_PATTERNS) {
      if (pattern.test(cmd)) found.add(tech);
    }
  }
  return Array.from(found);
}

export interface AnalyzedWorkflow {
  commands: CommandRecord[];
  detectedTechs: string[];
  cwd: string;
}

export function analyzeWorkflow(cwd: string): AnalyzedWorkflow {
  const records = getCommandsInCwd(cwd);

  // Filter out shell noise
  const meaningful = records.filter((r) => !isNoise(r.command));

  // Deduplicate — keep first occurrence of each normalized command
  const seen = new Set<string>();
  const deduped = meaningful.filter((r) => {
    const key = r.command.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const techs = detectTechs(deduped.map((r) => r.command));

  return { commands: deduped, detectedTechs: techs, cwd };
}
