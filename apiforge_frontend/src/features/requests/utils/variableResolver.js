export function resolveVariables(template, variables = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return variables[key] !== undefined ? variables[key] : `{{${key}}}`;
  });
}

export default { resolveVariables };
