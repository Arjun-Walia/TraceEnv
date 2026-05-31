export interface ParsedRange {
  min?: string;
  minInclusive?: boolean;
  max?: string;
  maxInclusive?: boolean;
  raw: string;
}

export function normalizeRange(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d+(\.\d+){0,2}$/.test(trimmed)) {
    const parts = toParts(trimmed);
    const nextMinor = `${parts.major}.${parts.minor + 1}.0`;
    return `>=${parts.major}.${parts.minor}.0,<${nextMinor}`;
  }

  return trimmed.replace(/\s+/g, '');
}

export function parseRange(raw: string): ParsedRange {
  const normalized = normalizeRange(raw);
  const segments = normalized.split(',').map((item) => item.trim()).filter(Boolean);
  const parsed: ParsedRange = { raw: normalized };

  for (const segment of segments) {
    if (segment.startsWith('>=')) {
      parsed.min = normalizeVersion(segment.slice(2));
      parsed.minInclusive = true;
      continue;
    }
    if (segment.startsWith('>')) {
      parsed.min = normalizeVersion(segment.slice(1));
      parsed.minInclusive = false;
      continue;
    }
    if (segment.startsWith('<=')) {
      parsed.max = normalizeVersion(segment.slice(2));
      parsed.maxInclusive = true;
      continue;
    }
    if (segment.startsWith('<')) {
      parsed.max = normalizeVersion(segment.slice(1));
      parsed.maxInclusive = false;
      continue;
    }
    if (segment.startsWith('==')) {
      const exact = normalizeVersion(segment.slice(2).replace(/\.\*$/, '.0'));
      parsed.min = exact;
      parsed.max = exact;
      parsed.minInclusive = true;
      parsed.maxInclusive = true;
      continue;
    }
  }

  return parsed;
}

export function intersectRanges(leftRaw: string, rightRaw: string): string | null {
  const left = parseRange(leftRaw);
  const right = parseRange(rightRaw);

  const min = chooseMin(left, right);
  const max = chooseMax(left, right);

  if (min.value && max.value) {
    const cmp = compareVersions(min.value, max.value);
    if (cmp > 0) {
      return null;
    }
    if (cmp === 0 && (!min.inclusive || !max.inclusive)) {
      return null;
    }
  }

  const parts: string[] = [];
  if (min.value) {
    parts.push(`${min.inclusive ? '>=' : '>'}${min.value}`);
  }
  if (max.value) {
    parts.push(`${max.inclusive ? '<=' : '<'}${max.value}`);
  }

  return parts.join(',') || '*';
}

function chooseMin(left: ParsedRange, right: ParsedRange): { value?: string; inclusive: boolean } {
  if (!left.min && !right.min) {
    return { value: undefined, inclusive: true };
  }
  if (!left.min) {
    return { value: right.min, inclusive: right.minInclusive ?? true };
  }
  if (!right.min) {
    return { value: left.min, inclusive: left.minInclusive ?? true };
  }

  const cmp = compareVersions(left.min, right.min);
  if (cmp > 0) {
    return { value: left.min, inclusive: left.minInclusive ?? true };
  }
  if (cmp < 0) {
    return { value: right.min, inclusive: right.minInclusive ?? true };
  }

  return { value: left.min, inclusive: (left.minInclusive ?? true) && (right.minInclusive ?? true) };
}

function chooseMax(left: ParsedRange, right: ParsedRange): { value?: string; inclusive: boolean } {
  if (!left.max && !right.max) {
    return { value: undefined, inclusive: true };
  }
  if (!left.max) {
    return { value: right.max, inclusive: right.maxInclusive ?? true };
  }
  if (!right.max) {
    return { value: left.max, inclusive: left.maxInclusive ?? true };
  }

  const cmp = compareVersions(left.max, right.max);
  if (cmp < 0) {
    return { value: left.max, inclusive: left.maxInclusive ?? true };
  }
  if (cmp > 0) {
    return { value: right.max, inclusive: right.maxInclusive ?? true };
  }

  return { value: left.max, inclusive: (left.maxInclusive ?? true) && (right.maxInclusive ?? true) };
}

function compareVersions(left: string, right: string): number {
  const a = toParts(left);
  const b = toParts(right);

  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function toParts(version: string): { major: number; minor: number; patch: number } {
  const [major, minor = '0', patch = '0'] = version.split('.');
  return {
    major: parseInt(major, 10) || 0,
    minor: parseInt(minor, 10) || 0,
    patch: parseInt(patch, 10) || 0,
  };
}

function normalizeVersion(version: string): string {
  const parts = toParts(version.trim());
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

export function satisfiesRange(version: string, rangeRaw: string): boolean {
  const range = parseRange(rangeRaw);
  const normalized = normalizeVersion(version);

  if (range.min) {
    const minCmp = compareVersions(normalized, range.min);
    if (minCmp < 0) {
      return false;
    }
    if (minCmp === 0 && range.minInclusive === false) {
      return false;
    }
  }

  if (range.max) {
    const maxCmp = compareVersions(normalized, range.max);
    if (maxCmp > 0) {
      return false;
    }
    if (maxCmp === 0 && range.maxInclusive === false) {
      return false;
    }
  }

  return true;
}