/**
 * Utility functions for Collection Tree search, hierarchy matching, and active auto-reveal
 */

/**
 * Check if a request matches search query across name, method, or URL
 */
export function doesRequestMatch(request, query) {
  if (!query || !query.trim()) return true;
  if (!request) return false;
  const q = query.trim().toLowerCase();

  const nameMatch = Boolean(request.name && request.name.toLowerCase().includes(q));
  const methodMatch = Boolean(request.method && request.method.toLowerCase().includes(q));
  const urlMatch = Boolean(request.url && request.url.toLowerCase().includes(q));

  return nameMatch || methodMatch || urlMatch;
}

/**
 * Check if a folder or any of its nested children/requests match search query
 */
export function doesFolderMatch(folder, allRequests = [], query) {
  if (!query || !query.trim()) return true;
  if (!folder) return false;
  const q = query.trim().toLowerCase();

  // 1. Direct name match
  if (folder.name && folder.name.toLowerCase().includes(q)) {
    return true;
  }

  // 2. Direct requests in folder
  const directRequests = allRequests.filter((r) => r.folderId === folder.id);
  if (directRequests.some((r) => doesRequestMatch(r, q))) {
    return true;
  }

  // 3. Child folders
  if (Array.isArray(folder.children)) {
    for (const child of folder.children) {
      if (doesFolderMatch(child, allRequests, q)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a collection or any of its folders/requests match search query
 */
export function doesCollectionMatch(collection, folders = [], requests = [], query) {
  if (!query || !query.trim()) return true;
  if (!collection) return false;
  const q = query.trim().toLowerCase();

  // 1. Collection name or description match
  if (collection.name && collection.name.toLowerCase().includes(q)) {
    return true;
  }
  if (collection.description && collection.description.toLowerCase().includes(q)) {
    return true;
  }

  // 2. Any folder matches
  if (folders.some((f) => doesFolderMatch(f, requests, q))) {
    return true;
  }

  // 3. Any request matches
  if (requests.some((r) => doesRequestMatch(r, q))) {
    return true;
  }

  return false;
}

/**
 * Find all ancestor folder IDs for a given folder in a hierarchical folder tree
 */
export function findAncestorFolderIds(folders = [], targetFolderId) {
  if (!targetFolderId) return [];

  function search(currentFolders, path) {
    for (const f of currentFolders) {
      if (f.id === targetFolderId) {
        return path;
      }
      if (Array.isArray(f.children) && f.children.length > 0) {
        const found = search(f.children, [...path, f.id]);
        if (found) return found;
      }
    }
    return null;
  }

  return search(folders, []) || [];
}

/**
 * Recursively collect all folder IDs in a tree
 */
export function getAllFolderIds(folders = []) {
  const ids = [];
  function traverse(list) {
    for (const f of list) {
      ids.push(f.id);
      if (Array.isArray(f.children) && f.children.length > 0) {
        traverse(f.children);
      }
    }
  }
  traverse(folders);
  return ids;
}

/**
 * Check if a request matches both query and HTTP method filter
 */
export function doesRequestMatchFilters(request, query = '', methodFilter = 'ALL') {
  if (!request) return false;
  if (methodFilter && methodFilter !== 'ALL') {
    if ((request.method || '').toUpperCase() !== methodFilter.toUpperCase()) {
      return false;
    }
  }
  return doesRequestMatch(request, query);
}

/**
 * Check if a folder or its descendants match search query and method filter
 */
export function doesFolderMatchFilters(folder, allRequests = [], query = '', methodFilter = 'ALL') {
  if (!folder) return false;
  const hasMethodFilter = methodFilter && methodFilter !== 'ALL';
  const hasQuery = Boolean(query && query.trim());

  if (!hasQuery && !hasMethodFilter) return true;

  // 1. Direct requests match
  const directRequests = allRequests.filter((r) => r.folderId === folder.id);
  if (directRequests.some((r) => doesRequestMatchFilters(r, query, methodFilter))) {
    return true;
  }

  // 2. Nested child folders match
  if (Array.isArray(folder.children)) {
    for (const child of folder.children) {
      if (doesFolderMatchFilters(child, allRequests, query, methodFilter)) {
        return true;
      }
    }
  }

  // 3. Name match if query provided
  if (hasQuery && folder.name && folder.name.toLowerCase().includes(query.trim().toLowerCase())) {
    if (!hasMethodFilter) return true;
    const hasMatchingMethodDescendant = directRequests.some(
      (r) => (r.method || '').toUpperCase() === methodFilter.toUpperCase()
    );
    if (hasMatchingMethodDescendant) return true;
  }

  return false;
}

/**
 * Check if a collection matches search query and method filter
 */
export function doesCollectionMatchFilters(
  collection,
  folders = [],
  requests = [],
  query = '',
  methodFilter = 'ALL'
) {
  if (!collection) return false;
  const hasMethodFilter = methodFilter && methodFilter !== 'ALL';
  const hasQuery = Boolean(query && query.trim());

  if (!hasQuery && !hasMethodFilter) return true;

  // Check folders
  if (folders.some((f) => doesFolderMatchFilters(f, requests, query, methodFilter))) {
    return true;
  }

  // Check requests
  if (requests.some((r) => doesRequestMatchFilters(r, query, methodFilter))) {
    return true;
  }

  // Check collection name / description
  if (hasQuery) {
    const q = query.trim().toLowerCase();
    const nameMatch = Boolean(collection.name && collection.name.toLowerCase().includes(q));
    const descMatch = Boolean(collection.description && collection.description.toLowerCase().includes(q));
    if (nameMatch || descMatch) {
      if (!hasMethodFilter) return true;
      if (requests.some((r) => (r.method || '').toUpperCase() === methodFilter.toUpperCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Recursively count total requests contained in a folder and all its descendants
 */
export function countTotalFolderRequests(folder, allRequests = []) {
  if (!folder) return 0;
  let count = allRequests.filter((r) => r.folderId === folder.id).length;
  if (Array.isArray(folder.children)) {
    for (const child of folder.children) {
      count += countTotalFolderRequests(child, allRequests);
    }
  }
  return count;
}

