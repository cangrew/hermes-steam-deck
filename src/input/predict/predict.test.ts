import { describe, expect, it } from "vitest";
import { acceptSuggestion, extractCurrentWord, suggest } from "./predict";

const WORDS = ["the", "there", "they", "their", "them", "then", "cat", "cats"];

describe("extractCurrentWord", () => {
  it("returns the trailing word", () => {
    expect(extractCurrentWord("hello wor")).toBe("wor");
    expect(extractCurrentWord("it's")).toBe("it's");
  });

  it("returns empty after a space or punctuation boundary", () => {
    expect(extractCurrentWord("hello ")).toBe("");
    expect(extractCurrentWord("done.")).toBe("");
    expect(extractCurrentWord("")).toBe("");
  });
});

describe("suggest", () => {
  it("returns frequency-ordered prefix matches", () => {
    expect(suggest(WORDS, "the")).toEqual(["there", "they", "their", "them"]);
  });

  it("respects the limit", () => {
    expect(suggest(WORDS, "the", 2)).toEqual(["there", "they"]);
  });

  it("skips an exact match (nothing to complete)", () => {
    expect(suggest(["cat", "cats"], "cat")).toEqual(["cats"]);
  });

  it("returns nothing for an empty prefix", () => {
    expect(suggest(WORDS, "")).toEqual([]);
  });

  it("recases to match a capitalized or all-caps prefix", () => {
    expect(suggest(WORDS, "The", 1)).toEqual(["There"]);
    expect(suggest(WORDS, "CA", 2)).toEqual(["CAT", "CATS"]);
  });
});

describe("acceptSuggestion", () => {
  it("replaces the trailing word and appends a space", () => {
    expect(acceptSuggestion("hello wor", "world")).toBe("hello world ");
  });

  it("appends when there is no trailing word", () => {
    expect(acceptSuggestion("hello ", "world")).toBe("hello world ");
  });

  it("preserves earlier text and newlines", () => {
    expect(acceptSuggestion("a\nb th", "the")).toBe("a\nb the ");
  });
});
