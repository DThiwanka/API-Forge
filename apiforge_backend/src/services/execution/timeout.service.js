export const timeoutService = {
  createTimeout(ms = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return {
      signal: controller.signal,
      clear: () => clearTimeout(timer),
    };
  },
};

export default timeoutService;
