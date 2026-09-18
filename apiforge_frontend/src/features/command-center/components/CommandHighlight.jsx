import React from 'react';

/**
 * Escapes regex special characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * CommandHighlight
 *
 * Renders text with matching query terms highlighted safely using React elements
 * without injecting raw HTML.
 *
 * @param {object} props
 * @param {string} props.text - The text to display and highlight
 * @param {string} [props.query] - The search query
 * @param {string} [props.className] - Additional wrapper className
 */
export default function CommandHighlight({ text, query, className = '' }) {
  if (!text || typeof text !== 'string') return null;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return <span className={className}>{text}</span>;
  }

  // Tokenize query into unique terms (min 1 char, trimmed, lowercase)
  const terms = Array.from(
    new Set(
      query
        .trim()
        .toLowerCase()
        .split(/[\s/_-]+/)
        .filter((t) => t.length > 0)
    )
  );

  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build regex pattern matching any term
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = terms.some((term) => term.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark
              key={index}
              className="bg-sky-500/30 text-sky-200 font-semibold rounded-xs px-0.5"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}

