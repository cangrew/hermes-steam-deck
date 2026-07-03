/**
 * Prefix word prediction over a bundled frequency-ordered English list.
 * The list is loaded lazily (dynamic import → Vite code-splits it) and cached.
 */

let cache: string[] | null = null;
let pending: Promise<string[]> | null = null;

export async function loadWords(): Promise<string[]> {
  if (cache) return cache;
  if (!pending) {
    pending = import("./words-en").then((m) => {
      cache = m.default.split("\n");
      return cache;
    });
  }
  return pending;
}

/** Synchronously get the word list if it has already loaded, else null. */
export function loadedWords(): string[] | null {
  return cache;
}

/** The in-progress word at the end of `value` (letters and apostrophes). */
export function extractCurrentWord(value: string): string {
  const m = /[a-zA-Z']+$/.exec(value);
  return m ? m[0] : "";
}

/** Match the casing of `word` (Capitalized / ALLCAPS) onto a lowercase suggestion. */
function recase(word: string, suggestion: string): string {
  if (word.length >= 2 && word === word.toUpperCase()) return suggestion.toUpperCase();
  if (word[0] && word[0] === word[0].toUpperCase()) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

/**
 * Up to `limit` completions of `word`, most frequent first. The list is
 * frequency-ordered so a linear scan taking the first matches is both correct
 * and fast (≪1ms at 10k). An exact match of `word` is skipped — there is
 * nothing to complete. Suggestions are recased to match the typed prefix.
 */
export function suggest(words: string[], word: string, limit = 4): string[] {
  const w = word.toLowerCase();
  if (!w) return [];
  const out: string[] = [];
  for (const entry of words) {
    if (entry.length > w.length && entry.startsWith(w)) {
      out.push(recase(word, entry));
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Replace the in-progress word at the end of `value` with `suggestion` + a space. */
export function acceptSuggestion(value: string, suggestion: string): string {
  const word = extractCurrentWord(value);
  const base = word ? value.slice(0, value.length - word.length) : value;
  return base + suggestion + " ";
}
