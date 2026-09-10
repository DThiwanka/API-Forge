export const networkService = {
  captureRequest(req) {
    return {
      id: 'net_' + Date.now(),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    };
  },
};

export default networkService;
