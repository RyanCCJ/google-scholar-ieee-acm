/**
 * Lightweight BibTeX Parser
 * Parses standard fields needed for IEEE/ACM citations.
 */
const BibTeXParser = {
  /**
   * Parses a BibTeX string into a JSON object.
   * @param {string} bibtex - The raw BibTeX string.
   * @returns {Object|null} Parsed object or null on failure.
   */
  parse: (bibtex) => {
    if (!bibtex) return null;

    const result = {};
    
    // 1. Identify Entry Type (e.g., @article, @inproceedings)
    const typeMatch = bibtex.match(/^\s*@([a-zA-Z]+)\s*{/);
    if (!typeMatch) return null;
    result.type = typeMatch[1].toLowerCase();

    // 2. Remove entry type wrapper to process fields
    // Simple heuristic: content is between the first { and the last }
    const firstBrace = bibtex.indexOf('{');
    const lastBrace = bibtex.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return null;

    const content = bibtex.substring(firstBrace + 1, lastBrace);

    // 3. Extract Fields
    // Regex matches: key = {value} or key = "value" or key = value
    // This is simple and might fail on nested braces, but Scholar BibTeX is usually flat.
    const fieldRegex = /([a-zA-Z0-9_\-]+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|([0-9]+))/g;
    
    let match;
    while ((match = fieldRegex.exec(content)) !== null) {
      const key = match[1].toLowerCase();
      // Value can be in group 2 ({...}), 3 ("..."), or 4 (digits)
      let value = match[2] || match[3] || match[4] || "";
      
      // Cleanup value: remove newlines, multiple spaces, and LaTeX commands if necessary
      value = value.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
      
      result[key] = value;
    }

    // Special handling for authors: extract list
    if (result.author) {
      result.authors = result.author.split(' and ').map(a => a.trim());
    }

    return result;
  }
};
