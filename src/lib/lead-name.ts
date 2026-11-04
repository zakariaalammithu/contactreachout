/**
 * Split a display name (e.g. a lead's "Contact Person") into first and
 * last name parts for form mapping.
 *
 * The campaign runner sends first_name/last_name to the process route,
 * but editor leads only carry a single "Contact Person" string — so
 * without this split, a lead like "Bruno Reznikiewicz" reached mapping
 * with no usable name at all, and required First/Last fields stayed
 * unmapped even though the name was right there in the list.
 */
export function splitPersonName(fullName?: string | null): { firstName: string; lastName: string } {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}
