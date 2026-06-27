/** Normalize a name for comparison: lowercase, trimmed, collapsed spaces. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Similarity score in [0,1]. 1 = identical. */
export function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length === 0 && nb.length === 0) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

export interface NamedItem {
  id: string;
  name: string;
}

/**
 * Find existing items whose names are similar to the input (likely duplicates).
 * Returns matches sorted by descending similarity, excluding exact-normalized
 * matches only when `excludeExact` is true.
 */
export function findSimilar<T extends NamedItem>(
  input: string,
  items: T[],
  options: { threshold?: number; limit?: number } = {},
): T[] {
  const { threshold = 0.7, limit = 5 } = options;
  const normInput = normalizeName(input);
  if (normInput.length < 2) return [];

  return items
    .map((item) => ({ item, score: similarity(normInput, item.name) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

/** True if an item with the exact (normalized) name already exists. */
export function hasExactMatch(input: string, items: NamedItem[]): boolean {
  const normInput = normalizeName(input);
  return items.some((item) => normalizeName(item.name) === normInput);
}
