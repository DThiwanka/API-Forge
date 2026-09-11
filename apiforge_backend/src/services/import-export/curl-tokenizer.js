/**
 * Shell command tokenizer for cURL command strings
 * Handles single quotes, double quotes, escape sequences, and line continuations.
 * 
 * @param {string} commandStr - Raw cURL command
 * @returns {Array<string>} Array of parsed argument tokens
 */
export function tokenizeCurlCommand(commandStr) {
  if (!commandStr || typeof commandStr !== 'string') {
    return [];
  }

  // Normalize line continuations: backslash followed by optional \r and \n
  const normalized = commandStr.replace(/\\\r?\n/g, ' ');

  const tokens = [];
  let currentToken = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let tokenHasChars = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (inSingleQuote) {
      if (char === "'") {
        inSingleQuote = false;
      } else {
        currentToken += char;
      }
      tokenHasChars = true;
    } else if (inDoubleQuote) {
      if (char === '"') {
        inDoubleQuote = false;
      } else if (char === '\\') {
        i++;
        if (i < normalized.length) {
          const nextChar = normalized[i];
          if (nextChar === 'n') currentToken += '\n';
          else if (nextChar === 'r') currentToken += '\r';
          else if (nextChar === 't') currentToken += '\t';
          else currentToken += nextChar; // e.g. \" -> ", \\ -> \, \$ -> $
        }
      } else {
        currentToken += char;
      }
      tokenHasChars = true;
    } else {
      // Outside any quotes
      if (char === "'") {
        inSingleQuote = true;
        tokenHasChars = true;
      } else if (char === '"') {
        inDoubleQuote = true;
        tokenHasChars = true;
      } else if (char === '\\') {
        i++;
        if (i < normalized.length) {
          currentToken += normalized[i];
          tokenHasChars = true;
        }
      } else if (/\s/.test(char)) {
        if (tokenHasChars) {
          tokens.push(currentToken);
          currentToken = '';
          tokenHasChars = false;
        }
      } else {
        currentToken += char;
        tokenHasChars = true;
      }
    }
  }

  if (tokenHasChars) {
    tokens.push(currentToken);
  }

  // If first token is curl or ends with /curl or curl.exe, remove it
  if (tokens.length > 0 && /^(?:.*[/\\])?curl(?:\.exe)?$/i.test(tokens[0])) {
    tokens.shift();
  }

  return tokens;
}

export default {
  tokenizeCurlCommand,
};

