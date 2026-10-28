'use strict';

/**
 * Token counter utility for RepoSketch.
 *
 * Uses a word-based approximation with code-aware splitting.
 * Approximation: ~1.3 tokens per word in code (code is denser than prose).
 *
 * For a more accurate count you'd use tiktoken, but this avoids a
 * heavy native dependency in the hackathon context.
 */

const CODE_TOKEN_MULTIPLIER = 1.3;

/**
 * Split text into word-like tokens (code-aware).
 * Splits on whitespace, punctuation, and camelCase boundaries.
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  // Split on whitespace and common code delimiters
  const parts = text.split(/[\s,;(){}[\]<>=!&|+\-*/\\'"`.?:@#~^%]+/);
  // Further split camelCase / PascalCase
  const tokens = [];
  for (const part of parts) {
    if (!part) continue;
    // Split camelCase: fooBarBaz → foo, Bar, Baz
    const subParts = part.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    tokens.push(...subParts.filter(Boolean));
  }
  return tokens;
}

/**
 * Count approximate tokens in a string.
 * @param {string} content
 * @returns {number}
 */
function countTokens(content) {
  if (!content) return 0;
  const words = tokenize(content);
  return Math.ceil(words.length * CODE_TOKEN_MULTIPLIER);
}

/**
 * Count tokens in multiple files and return a summary.
 * @param {Array<{path: string, content: string}>} files
 * @returns {{ total: number, perFile: Array<{path, tokens}> }}
 */
function countTokensForFiles(files) {
  if (!Array.isArray(files)) return { total: 0, perFile: [] };

  const perFile = files.map((f) => ({
    path: f.path,
    tokens: countTokens(f.content),
  }));

  const total = perFile.reduce((s, f) => s + f.tokens, 0);

  return { total, perFile };
}

module.exports = { countTokens, countTokensForFiles, tokenize };
