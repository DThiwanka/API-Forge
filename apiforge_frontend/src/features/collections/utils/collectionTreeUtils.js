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

