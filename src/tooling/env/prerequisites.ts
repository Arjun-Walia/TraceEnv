import { EnvironmentSnapshot } from '../../domain/types.js';
import {
  CapabilityResolutionResult,
  detectToolCapabilities,
  parseRequirements,
  resolveRequirements,
  ToolCapability,
} from './capabilities.js';

function capabilitiesFromEnvironment(env: EnvironmentSnapshot): ToolCapability[] {
  const detected = detectToolCapabilities();

  return detected.map((capability) => {
    const value = env.tools[capability.tool];
    if (value === undefined) {
      return capability;
    }

    return {
      ...capability,
      available: value !== null,
      version: value && value !== 'available' ? value : capability.version,
    };
  });
}

export function resolvePrerequisites(
  declared: string[] | undefined,
  env: EnvironmentSnapshot
): CapabilityResolutionResult {
  const requirements = parseRequirements(declared);
  const capabilities = capabilitiesFromEnvironment(env);
  return resolveRequirements(requirements, capabilities);
}

export function checkPrerequisites(
  declared: string[] | undefined,
  env: EnvironmentSnapshot
): { missing: string[]; present: string[] } {
  const result = resolvePrerequisites(declared, env);

  const missing = result.missing.map((resolution) => resolution.requirement.raw);
  const present = result.present.map((resolution) => resolution.requirement.raw);

  return { missing, present };
}
