export interface StoredLeadList {
  id?: string;
  name?: string;
  ownerEmail?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  status?: string;
}

export const normalizeLeadListName = (name: unknown): string =>
  String(name ?? '').trim().toLowerCase();

export const isDeletedLeadList = (list: StoredLeadList): boolean =>
  list.isDeleted === true ||
  list.deletedAt != null ||
  String(list.status ?? '').trim().toUpperCase() === 'DELETED';

/**
 * Only active lists owned by the current account participate in duplicate
 * checks. Legacy records without an owner are treated as belonging to the
 * current local account, preserving validation for data created before owner
 * metadata was added.
 */
export const findActiveLeadListNameConflict = (
  lists: StoredLeadList[],
  candidateName: unknown,
  currentUserEmail: unknown,
): StoredLeadList | undefined => {
  const normalizedCandidate = normalizeLeadListName(candidateName);
  if (!normalizedCandidate) return undefined;

  const normalizedUser = String(currentUserEmail ?? '').trim().toLowerCase();
  return lists.find((list) => {
    if (!list || isDeletedLeadList(list)) return false;

    const owner = String(list.ownerEmail ?? '').trim().toLowerCase();
    const belongsToCurrentUser = normalizedUser ? !owner || owner === normalizedUser : !owner;
    return belongsToCurrentUser && normalizeLeadListName(list.name) === normalizedCandidate;
  });
};

/**
 * Automatically generates the first available unique list name using numeric suffixes (-1, -2, -3...)
 * if the candidate base name conflicts with an active list owned by the user.
 */
export const generateUniqueLeadListName = (
  lists: StoredLeadList[],
  baseName: unknown,
  currentUserEmail: unknown,
): string => {
  const rawStr = String(baseName ?? '').trim();
  if (!rawStr) return 'Lead List';

  let candidate = rawStr;
  let counter = 1;

  while (findActiveLeadListNameConflict(lists, candidate, currentUserEmail)) {
    candidate = `${rawStr}-${counter}`;
    counter++;
  }

  return candidate;
};

