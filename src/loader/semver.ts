/**
 * Focused semver subset used for Mini-App bundle compatibility checks.
 *
 * Deliberately dependency-free -- it runs inside the RN bundle and only needs
 * to cover the comparator forms a Mini-App manifest actually uses:
 * `*`, `1.2.3`, `^1.2.3`, `~1.2.3`, and `>=`/`>`/`<=`/`<`/`=` comparators,
 * space-separated as AND and `||`-separated as OR.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(input: string): SemVer | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(input.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** Returns -1, 0 or 1 -- standard comparator ordering. */
export function compareVersions(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

function satisfiesComparator(version: SemVer, comparator: string): boolean {
  const token = comparator.trim();
  if (token === '' || token === '*' || token === 'x') return true;

  const operatorMatch = /^(>=|<=|>|<|=|\^|~)?\s*(.+)$/.exec(token);
  if (!operatorMatch) return false;

  const operator = operatorMatch[1] ?? '=';
  const target = parseVersion(operatorMatch[2] ?? '');
  if (!target) return false;

  const order = compareVersions(version, target);

  switch (operator) {
    case '>=':
      return order >= 0;
    case '<=':
      return order <= 0;
    case '>':
      return order > 0;
    case '<':
      return order < 0;
    case '=':
      return order === 0;
    case '^': {
      // Caret: no change to the leftmost non-zero component.
      if (order < 0) return false;
      if (target.major > 0) return version.major === target.major;
      if (target.minor > 0) {
        return version.major === 0 && version.minor === target.minor;
      }
      return version.major === 0 && version.minor === 0;
    }
    case '~': {
      // Tilde: patch-level changes only.
      if (order < 0) return false;
      return version.major === target.major && version.minor === target.minor;
    }
    default:
      return false;
  }
}

/**
 * `satisfies('1.2.0', '^1.0.0')` -> true.
 * Unparseable input returns false: an unknown range must never silently pass.
 */
export function satisfies(version: string, range: string): boolean {
  const parsed = parseVersion(version);
  if (!parsed) return false;

  return range.split('||').some((clause) =>
    clause
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .every((comparator) => satisfiesComparator(parsed, comparator)),
  );
}
