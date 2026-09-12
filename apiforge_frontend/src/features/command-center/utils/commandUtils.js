/**
 * Group order priority for Command Center display
 */
export const GROUP_ORDER = [
  'Recent',
  'Actions',
  'Navigation',
  'Requests',
  'Collections',
  'Folders',
  'Workspace',
];

/**
 * Deterministic multi-term search matching for commands, requests, and collections.
 * Every term in the query must match at least one searchable field of the item.
 *
 * @param {Array} commands - List of command items
 * @param {string} query - Free-text search string
 * @returns {Array} - Filtered commands
 */
export function searchCommands(commands, query) {
  if (!Array.isArray(commands)) return [];
  if (!query || typeof query !== 'string' || !query.trim()) {
    return commands;
  }

  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return commands.filter((cmd) => {
    // Build combined search index text for this item
    const searchParts = [
      cmd.title || '',
      cmd.description || '',
      cmd.group || '',
      cmd.method || '',
      cmd.path || '',
      cmd.collectionName || '',
      cmd.folderName || '',
      ...(Array.isArray(cmd.keywords) ? cmd.keywords : []),
    ];

    const targetString = searchParts.join(' ').toLowerCase();

    // Every search term must be present in the item
    return terms.every((term) => targetString.includes(term));
  });
}

/**
 * Groups a flat array of commands according to standard group ordering.
 *
 * @param {Array} commands - List of command items
 * @returns {Array} - Array of { group, items }
 */
export function groupCommands(commands) {
  if (!Array.isArray(commands)) return [];

  const map = new Map();

  for (const cmd of commands) {
    const group = cmd.group || 'Other';
    if (!map.has(group)) {
      map.set(group, []);
    }
    map.get(group).push(cmd);
  }

  // Sort groups according to predefined GROUP_ORDER
  const result = [];
  for (const groupName of GROUP_ORDER) {
    if (map.has(groupName)) {
      result.push({
        group: groupName,
        items: map.get(groupName),
      });
      map.delete(groupName);
    }
  }

  // Append any remaining custom groups
  for (const [group, items] of map.entries()) {
    result.push({ group, items });
  }

  return result;
}

export default {
  GROUP_ORDER,
  searchCommands,
  groupCommands,
};

