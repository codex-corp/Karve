const ARABIC_BOUNDARY_PUNCTUATION: Record<string, string> = {
  "؟": "?",
  "،": ",",
  "؛": ";",
  "۔": "."
};

/**
 * remotion-captions-kit currently recognizes Latin sentence/clause marks.
 * Normalize Arabic equivalents only for pagination analysis. The renderer
 * restores the original token text before anything is shown on screen.
 */
export function normalizeArabicBoundaryPunctuation(text: string): string {
  return Array.from(text)
    .map((character) => ARABIC_BOUNDARY_PUNCTUATION[character] || character)
    .join("");
}

export function timingKey(startMs: number, endMs: number): string {
  return `${Math.round(startMs * 1000)}:${Math.round(endMs * 1000)}`;
}
