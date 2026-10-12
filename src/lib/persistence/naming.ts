import 'server-only';

export const normalizeOrganizationName = (value: string): string => value.trim().toLowerCase();

/** Preserves a requested base name and deterministically appends a suffix. */
export function nextAvailableName(requestedName: string, existingNormalizedNames: Iterable<string>): string {
  const base = requestedName.trim();
  if (!base) throw new Error('A name is required.');
  const existing = new Set(Array.from(existingNormalizedNames, normalizeOrganizationName));
  if (!existing.has(normalizeOrganizationName(base))) return base;
  let suffix = 1;
  while (existing.has(normalizeOrganizationName(`${base} ${suffix}`))) suffix += 1;
  return `${base} ${suffix}`;
}
