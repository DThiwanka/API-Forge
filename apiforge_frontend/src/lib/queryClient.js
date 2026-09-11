// Lightweight query client wrapper
export const queryClient = {
  cache: new Map(),
  async fetchQuery(key, fetcher) {
    if (this.cache.has(key)) return this.cache.get(key);
    const data = await fetcher();
    this.cache.set(key, data);
    return data;
  },
  invalidateQueries(key) {
    this.cache.delete(key);
  },
};

export default queryClient;
