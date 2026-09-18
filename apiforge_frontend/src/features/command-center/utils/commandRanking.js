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
  'Environments',
  'History',
  'Navigation',
  'Workspace',
];

/**
 * Normalizes text for comparison by collapsing hyphens, underscores, slashes, and whitespace.
 * e.g. "GET /users/:id" -> "get users id"
 */
export function normalizeSearchText(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[-_/:#?&=.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Strips all non-alphanumeric characters for fuzzy matching tolerance.
 * e.g. "get-users" -> "getusers"
 */
export function stripPunctuation(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

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

  const rawQuery = query.trim().toLowerCase();
  const normalizedQuery = normalizeSearchText(rawQuery);
  const strippedQuery = stripPunctuation(rawQuery);

  // Split query into terms on whitespace or slashes/hyphens
  const queryTerms = rawQuery.split(/\s+/).filter(Boolean);
  const terms = Array.from(
    new Set([
      ...queryTerms,
      ...normalizedQuery.split(/\s+/).filter(Boolean),
    ])
  );

  const title = (cmd.title || '').toLowerCase();
  const normalizedTitle = normalizeSearchText(cmd.title);
  const strippedTitle = stripPunctuation(cmd.title);

  const method = (cmd.method || '').toLowerCase();
  const path = (cmd.path || '').toLowerCase();
  const normalizedPath = normalizeSearchText(cmd.path);
  const strippedPath = stripPunctuation(cmd.path);

  const collectionName = (cmd.collectionName || '').toLowerCase();
  const folderName = (cmd.folderName || '').toLowerCase();
  const description = (cmd.description || '').toLowerCase();
  const keywords = Array.isArray(cmd.keywords) ? cmd.keywords.map((k) => String(k).toLowerCase()) : [];

  // Build combined searchable index
  const searchIndexParts = [
    title,
    normalizedTitle,
    method,
    path,
    normalizedPath,
    collectionName,
    folderName,
    description,
    ...keywords,
  ];
  const combinedText = searchIndexParts.join(' ');
  const strippedCombinedText = stripPunctuation(combinedText);

  // Check if every primary query term is satisfied
  const allTermsMatch = queryTerms.every((term) => {
    if (combinedText.includes(term)) return true;
    const strippedTerm = stripPunctuation(term);
    return strippedTerm.length > 1 && strippedCombinedText.includes(strippedTerm);
  });

  if (!allTermsMatch) {
    return 0;
  }

  let score = 0;

  // 1. Exact title match (Highest Priority)
  if (title === rawQuery || normalizedTitle === normalizedQuery) {
    score += 1500;
  } else if (strippedTitle && strippedTitle === strippedQuery) {
    score += 1350;
  } else if (title.startsWith(rawQuery) || normalizedTitle.startsWith(normalizedQuery)) {
    // 3. Title starts with query
    score += 950;
  } else if (title.includes(rawQuery) || normalizedTitle.includes(normalizedQuery)) {
    // 4. Title contains query
    score += 700;
  }

  // 2. Exact path / method match
  if (path && (path === rawQuery || normalizedPath === normalizedQuery)) {
    score += 1200;
  } else if (method && method === rawQuery) {
    score += 1100;
  }

  // 5. Method match within query terms (e.g. searching "GET /users" or "POST users")
  if (method && (queryTerms.includes(method) || terms.includes(method))) {
    score += 450;
  }

  // 6. Path contains query or path segments
  if (path) {
    if (path.startsWith(rawQuery) || path.includes('/' + rawQuery)) {
      score += 550;
    } else if (path.includes(rawQuery) || normalizedPath.includes(normalizedQuery)) {
      score += 400;
    } else if (strippedPath && strippedQuery.length > 2 && strippedPath.includes(strippedQuery)) {
      score += 300;
    }
  }

  // 7. Request specific group priority
  if (cmd.group === 'Requests' || cmd.group === 'Recent Requests') {
    if (title.includes(rawQuery)) {
      score += 250;
    }
  }

  // 8. Collection / Folder match
  if (collectionName) {
    if (collectionName === rawQuery || collectionName.startsWith(rawQuery)) {
      score += 250;
    } else if (collectionName.includes(rawQuery)) {
      score += 160;
    }
  }
  if (folderName) {
    if (folderName === rawQuery || folderName.startsWith(rawQuery)) {
      score += 220;
    } else if (folderName.includes(rawQuery)) {
      score += 150;
    }
  }

  // 9. Description match
  if (description.includes(rawQuery)) {
    score += 120;
  }

  // 10. Keyword matches
  for (const kw of keywords) {
    if (kw === rawQuery) {
      score += 100;
      break;
    } else if (kw.startsWith(rawQuery)) {
      score += 70;
      break;
    } else if (kw.includes(rawQuery)) {
      score += 50;
      break;
    }
  }

  // Multi-term contribution
  for (const term of queryTerms) {
    if (title.includes(term)) score += 80;
    if (path.includes(term)) score += 60;
    if (collectionName.includes(term)) score += 40;
    if (folderName.includes(term)) score += 30;
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
  normalizeSearchText,
  stripPunctuation,
  scoreCommand,
  rankCommands,
};
