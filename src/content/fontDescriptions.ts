export const fontDescriptions: Record<string, string> = {
  "Inter": "A variable font family carefully crafted & designed for computer screens. Features a tall x-height to aid in readability of mixed-case and lower-case text.",
  "Space Grotesk": "A proportional sans-serif typeface based on Colophon Foundry's Space Mono. It retains the monospace's idiosyncratic details while optimized for readability at any size.",
  "Roboto": "Google’s signature sans-serif typeface. It features a dual nature: mechanical skeleton and forms largely geometric, alongside open curves.",
  "Open Sans": "A humanist sans-serif typeface designed by Steve Matteson, commissioned by Google. It was designed with an upright stress, open forms and a neutral, yet friendly appearance.",
  "Lato": "A sans-serif typeface family designed in the summer of 2010 by Warsaw-based designer Łukasz Dziedzic. 'Lato' means 'Summer' in Polish.",
  "Montserrat": "A geometric sans-serif typeface designed by Julieta Ulanovsky. Inspired by posters, signs and painted windows of the historical Montserrat neighborhood of Buenos Aires.",
  "Arial": "A neo-grotesque sans-serif typeface and computer font. One of the most widely used designs of the last 30 years.",
  "Helvetica": "A widely used sans-serif typeface developed in 1957. It is a neo-grotesque or realist design, one of the most popular typefaces of the 20th century.",
  "Times New Roman": "A serif typeface commissioned by the British newspaper The Times in 1931. One of the most famous and widely used typefaces in history.",
  "Georgia": "A transitional serif typeface designed in 1993 by Matthew Carter for Microsoft. It is designed for legibility on small screens.",
  "Courier New": "A monospaced slab serif typeface designed to resemble the output from a strike-on typewriter.",
  "Verdana": "A humanist sans-serif typeface designed by Matthew Carter for Microsoft. It is hand-hinted for screen use.",
  "system-ui": "The default system font of the operating system. Varies by platform (San Francisco on macOS, Segoe UI on Windows, Roboto on Android).",
  "-apple-system": "Targeting the San Francisco font on Apple devices.",
  "sans-serif": "The default sans-serif font family. Clean, modern, and without decorative strokes at the ends of characters.",
  "serif": "The default serif font family. Characterized by decorative lines or tapers at the ends of a character's strokes.",
  "monospace": "The default monospaced font family. All characters have the same width, often used for code."
};

export function getFontDescription(fontName: string): string {
  // Try exact match
  if (fontDescriptions[fontName]) return fontDescriptions[fontName];
  
  // Try case-insensitive match
  const lowerName = fontName.toLowerCase();
  const key = Object.keys(fontDescriptions).find(k => k.toLowerCase() === lowerName);
  if (key) return fontDescriptions[key];

  // Partial match for common terms
  if (lowerName.includes("arial")) return fontDescriptions["Arial"];
  if (lowerName.includes("helvetica")) return fontDescriptions["Helvetica"];
  if (lowerName.includes("clean")) return "Adobe Clean is a proprietary sans-serif typeface used by Adobe in its software user interfaces.";
  if (lowerName.includes("segoe")) return "Segoe UI is the typeface used by Microsoft in its products. It has a humanities-inspired design.";

  return "No description available for this font.";
}
