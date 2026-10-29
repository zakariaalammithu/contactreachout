/**
 * Normalizes a user-supplied hex color for the message editor's text color
 * picker. Accepts #RRGGBB, RRGGBB, #RGB and RGB (with surrounding whitespace
 * ignored) and returns a lowercase #rrggbb string, or null when the value
 * is not a valid hex color. Named colors (e.g. "red") are rejected on
 * purpose so only explicit hex values reach the editor.
 */
export function normalizeHexColor(value: string): string | null {
  if (!value) return null;
  const hex = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toLowerCase()}`;
  }
  return null;
}
