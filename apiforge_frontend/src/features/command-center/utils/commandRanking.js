/**
 * commandRanking.js
 *
 * Deterministic multi-tier ranking and scoring for Command Center items.
 * Ranks items by exact match, prefix match, substring match, and metadata relevance.
 */

export const GROUP_SEARCH_ORDER = [
  'Actions',
  'Requests',
  'Collections',
  'Folders',
  'Navigation',
  'Workspace',
];

/**
 * Calculates a match score for a command given a query.
 * Returns 0 if the query is not satisfied by the command.
 *
 * @param {Object} cmd - The command item
 * @param {string} query - Free-text search string
 * @returns {number} - Non-negative relevance score
 */
export function scoreCommand(cmd, query) {
  if (!cmd) return 0;
  if (!query || typeof query !== 'string' || !query.trim()) return 100;

  const trimmedQuery = query.trim().toLowerCase();
  const terms = trimmedQuery.split(/\s+/).filter(Boolean);

  const title = (cmd.title || '').toLowerCase();
  const method = (cmd.method || '').toLowerCase();
  const path = (cmd.path || '').toLowerCase();
  const collectionName = (cmd.collectionName || '').toLowerCase();
  const folderName = (cmd.folderName || '').toLowerCase();
  const description = (cmd.description || '').toLowerCase();
  const keywords = Array.isArray(cmd.keywords) ? cmd.keywords.map((k) => String(k).toLowerCase()) : [];

  // Build combined searchable index
  const searchIndexParts = [
    title,
    method,
    path,
    collectionName,
    folderName,
    description,
    ...keywords,
  ];
  const combinedText = searchIndexParts.join(' ');

  // Every term in multi-term query must be present somewhere in the item
  const allTermsMatch = terms.every((t) => combinedText.includes(t));
  if (!allTermsMatch) {
    return 0;
  }

  let score = 0;

  // 1. Exact title match (Highest Priority)
  if (title === trimmedQuery) {
    score += 1200;
  } else if (title.startsWith(trimmedQuery)) {
    // 2. Title starts with query
    score += 800;
  } else if (title.includes(trimmedQuery)) {
    // 3. Title contains query
    score += 600;
  }

  // 4. Request name matching (for request commands)
  if (cmd.group === 'Requests' || cmd.group === 'Recent Requests') {
    if (title === trimmedQuery) {
      score += 400;
    } else if (title.startsWith(trimmedQuery)) {
      score += 250;
    }
  }

  // 5. Method match (e.g. searching "POST" or "GET")
  if (method && (method === trimmedQuery || terms.includes(method))) {
    score += 450;
  }

  // 6. URL/path match
  if (path) {
    if (path.startsWith(trimmedQuery) || path.includes('/' + trimmedQuery)) {
      score += 350;
    } else if (path.includes(trimmedQuery)) {
      score += 250;
    }
  }

  // 7. Collection / Folder match
  if (collectionName) {
    if (collectionName === trimmedQuery || collectionName.startsWith(trimmedQuery)) {
      score += 220;
    } else if (collectionName.includes(trimmedQuery)) {
      score += 150;
    }
  }
  if (folderName) {
    if (folderName === trimmedQuery || folderName.startsWith(trimmedQuery)) {
      score += 200;
    } else if (folderName.includes(trimmedQuery)) {
      score += 140;
    }
  }

  // 8. Description match
  if (description.includes(trimmedQuery)) {
    score += 150;
  }

  // 9. Keyword matches (lowest priority ranking)
  for (const kw of keywords) {
    if (kw === trimmedQuery) {
      score += 80;
      break;
    } else if (kw.startsWith(trimmedQuery)) {
      score += 60;
      break;
    } else if (kw.includes(trimmedQuery)) {
      score += 40;
      break;
    }
  }

  // Base score for meeting all terms criteria
  score += 50;

  return score;
}

/**
 * Filter, score, and rank commands.
 * High scores appear first; ties are broken cleanly by group priority and title length.
 *
 * @param {Array} commands - Candidate command items
 * @param {string} query - Free-text search string
 * @returns {Array} - Ranked list of commands
 */
export function rankCommands(commands, query) {
  if (!Array.isArray(commands)) return [];

  const trimmedQuery = query && typeof query === 'string' ? query.trim() : '';

  // If query is empty, return commands in original order
  if (!trimmedQuery) {
    return commands;
  }

  const scoredList = [];
  for (const cmd of commands) {
    const score = scoreCommand(cmd, trimmedQuery);
    if (score > 0) {
      scoredList.push({ cmd, score });
    }
  }

  // Sort descending by score
  scoredList.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // Secondary sort: group order priority if scores match
    const groupAIndex = GROUP_SEARCH_ORDER.indexOf(a.cmd.group);
    const groupBIndex = GROUP_SEARCH_ORDER.indexOf(b.cmd.group);
    const orderA = groupAIndex === -1 ? 999 : groupAIndex;
    const orderB = groupBIndex === -1 ? 999 : groupBIndex;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Tertiary sort: shorter title first
    const titleA = a.cmd.title || '';
    const titleB = b.cmd.title || '';
    return titleA.length - titleB.length;
  });

  return scoredList.map((entry) => entry.cmd);
}

export default {
  GROUP_SEARCH_ORDER,
  scoreCommand,
  rankCommands,
};
