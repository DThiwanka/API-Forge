import { rankCommands, GROUP_SEARCH_ORDER } from './commandRanking.js';

/**
 * Group order priority for Command Center display
 */
export const GROUP_ORDER = [
  'Recent',
  'Recent Commands',
  'Recent Requests',
  'Actions',
  'Requests',
  'Collections',
  'Folders',
  'Environments',
  'History',
  'Navigation',
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
 * Limits results per group to ensure fast rendering.
 *
 * @param {Array} commands - List of command items
 * @param {number} [maxPerGroup=20] - Maximum items to show per group
 * @returns {Array} - Array of { group, items, totalCount }
 */
export function groupCommands(commands, maxPerGroup = 20) {
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
      const allGroupItems = map.get(groupName);
      const items = maxPerGroup > 0 ? allGroupItems.slice(0, maxPerGroup) : allGroupItems;
      result.push({
        group: groupName,
        items,
        totalCount: allGroupItems.length,
      });
      map.delete(groupName);
    }
  }

  // Append any remaining custom groups
  for (const [group, allGroupItems] of map.entries()) {
    const items = maxPerGroup > 0 ? allGroupItems.slice(0, maxPerGroup) : allGroupItems;
    result.push({
      group,
      items,
      totalCount: allGroupItems.length,
    });
  }

  return result;
}

export default {
  GROUP_ORDER,
  GROUP_SEARCH_ORDER,
  searchCommands,
  groupCommands,
};
