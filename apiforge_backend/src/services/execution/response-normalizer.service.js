export const responseNormalizerService = {
  normalize(rawResponse, durationMs) {
    return {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: rawResponse.headers,
      data: rawResponse.data,
      size: rawResponse.size,
      time: durationMs,
    };
  },
};

export default responseNormalizerService;
