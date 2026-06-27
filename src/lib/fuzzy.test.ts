import { describe, it, expect } from "vitest";
import {
  normalizeName,
  levenshtein,
  similarity,
  findSimilar,
  hasExactMatch,
} from "./fuzzy";

describe("normalizeName", () => {
  it("lowercases, trims, collapses spaces", () => {
    expect(normalizeName("  Prathic   Kumar ")).toBe("prathic kumar");
  });
});

describe("levenshtein", () => {
  it("is zero for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });
  it("counts single edits", () => {
    expect(levenshtein("prathic", "prathick")).toBe(1);
    expect(levenshtein("blue", "blu")).toBe(1);
  });
});

describe("similarity", () => {
  it("is 1 for normalized-equal names", () => {
    expect(similarity("Prathic", "  prathic ")).toBe(1);
  });
  it("is high for near-duplicates", () => {
    expect(similarity("Prathic", "Prathick")).toBeGreaterThan(0.8);
  });
  it("is low for unrelated names", () => {
    expect(similarity("Prathic", "Mahesh")).toBeLessThan(0.5);
  });
});

describe("findSimilar", () => {
  const suppliers = [
    { id: "1", name: "Prathic" },
    { id: "2", name: "B Gou" },
    { id: "3", name: "Mahesh Traders" },
  ];

  it("suggests a likely misspelling", () => {
    const result = findSimilar("Prathick", suppliers);
    expect(result[0].id).toBe("1");
  });

  it("returns nothing for very short input", () => {
    expect(findSimilar("P", suppliers)).toEqual([]);
  });

  it("returns nothing when no name is close", () => {
    expect(findSimilar("Zenith Steel", suppliers)).toEqual([]);
  });
});

describe("hasExactMatch", () => {
  const suppliers = [{ id: "1", name: "Prathic" }];
  it("detects case/space-insensitive exact match", () => {
    expect(hasExactMatch(" prathic ", suppliers)).toBe(true);
  });
  it("is false for a different name", () => {
    expect(hasExactMatch("Prathick", suppliers)).toBe(false);
  });
});
