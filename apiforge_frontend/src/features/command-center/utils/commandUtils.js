import { rankCommands, GROUP_SEARCH_ORDER } from './commandRanking.js';

/**
 * Group order priority for Command Center display
 */
export const GROUP_ORDER = [
  'Recent',
  'Recent Commands',
  'Recent Requests',
  'Actions',
  'Navigation',
  'Requests',
  'Collections',
  'Folders',
  'Workspace',
];

export { rankCommands, GROUP_SEARCH_ORDER };

/**
 * Deterministic multi-term search and ranking for commands, requests, and collections.
 * Uses rankCommands to filter by matching terms and sort by relevance score.
 *
 * @param {Array} commands - List of command items
 * @param {string} query - Free-text search string
 * @returns {Array} - Ranked and filtered commands
 */
export function searchCommands(commands, query) {
  return rankCommands(commands, query);
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

