export const variableService = {
  resolveVariables(text, variables = {}) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return variables[key] !== undefined ? variables[key] : `{{${key}}}`;
    });
  },
};

export default variableService;
