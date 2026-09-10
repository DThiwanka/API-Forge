export const curlImportService = {
  async importCurl(curlCommand) {
    const methodMatch = curlCommand.match(/-X\s+([A-Z]+)/i);
    const urlMatch = curlCommand.match(/(https?:\/\/[^\s"']+)/);

    return {
      name: 'Imported Request',
      method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
      url: urlMatch ? urlMatch[1] : '',
      headers: {},
      body: null,
    };
  },
};

export default curlImportService;
