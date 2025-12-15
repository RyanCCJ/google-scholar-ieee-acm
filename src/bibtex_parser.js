/**
 * Lightweight BibTeX Parser
 * Parses standard fields needed for IEEE/ACM citations.
 */
const BibTeXParser = {
  parse: (bibtex) => {
    if (!bibtex) return null;

    const result = {};

    // 1. Identify Entry Type
    const typeMatch = bibtex.match(/^\s*@([a-zA-Z]+)\s*\{/);
    if (!typeMatch) return null;
    result.type = typeMatch[1].toLowerCase();

    // 2. Find body start
    const startBody = bibtex.indexOf('{');
    if (startBody === -1) return null;

    let pos = startBody + 1;
    let len = bibtex.length;

    // Helper: skip whitespace
    const skipWs = () => {
      while (pos < len && /\s/.test(bibtex[pos])) pos++;
    };

    // Helper: parse key
    const parseKey = () => {
      const start = pos;
      while (pos < len && /[a-zA-Z0-9_\-:]/.test(bibtex[pos])) pos++;
      return bibtex.substring(start, pos).toLowerCase();
    };

    // Helper: parse value (handles {}, "", and numbers)
    const parseValue = () => {
      if (pos >= len) return "";
      const char = bibtex[pos];

      if (char === '{') {
        // Nested braces
        let depth = 1;
        pos++;
        const start = pos;
        while (pos < len && depth > 0) {
          if (bibtex[pos] === '{') depth++;
          else if (bibtex[pos] === '}') depth--;
          // Handle escapes? usually not needed for brace counting unless \{
          // but BibTeX is loose.
          if (depth > 0) pos++;
        }
        const val = bibtex.substring(start, pos);
        pos++; // consume closing }
        return val;
      } else if (char === '"') {
        // Quotes
        pos++;
        const start = pos;
        while (pos < len && bibtex[pos] !== '"') {
          if (bibtex[pos] === '\\') pos++; // skip escaped
          pos++;
        }
        const val = bibtex.substring(start, pos);
        pos++; // consume closing "
        return val;
      } else {
        // Numbers or bare strings
        const start = pos;
        while (pos < len && /[^,}\s]/.test(bibtex[pos])) pos++;
        return bibtex.substring(start, pos);
      }
    };

    // 3. Main Loop
    // Skip Citation Key first?
    skipWs();
    // Citation key is unique: it's the first token before comma
    // e.g. @article{key,
    // Scan until comma
    while (pos < len && bibtex[pos] !== ',' && bibtex[pos] !== '}') pos++;
    if (bibtex[pos] === ',') pos++;

    while (pos < len) {
      skipWs();
      if (pos >= len || bibtex[pos] === '}') break; // End of entry

      const key = parseKey();
      skipWs();

      if (bibtex[pos] !== '=') {
        // Malformed or end? skip to next comma
        while (pos < len && bibtex[pos] !== ',' && bibtex[pos] !== '}') pos++;
      } else {
        pos++; // skip =
        skipWs();
        let val = parseValue();

        // Clean value (remove Extra braces or whitespace)
        // Note: Keep inner braces for LaTeX? e.g. {IEEE}
        // Convention: We probably want readable text for the User.
        // "Image-Based ... {IEEE} ..." -> "Image-Based ... IEEE ..."
        // But strict BibTeX keeps them. 
        // Let's strip one level of optional capitalization braces if simplified, 
        // but the CitationFormatter expects plain text mostly.
        // For now, simple cleanup: compact whitespace
        val = val.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
        // Remove lingering braces usually used for case protection? 
        // e.g. "{IEEE}" -> "IEEE". 
        // Valid strategy: remove {} if they surround words?
        // Safer: Just keep them, user might want to see them or formatter handles them?
        // CitationFormatter doesn't stripping. " {IEEE} " looks bad.
        // Let's remove ALL braces? No, math.
        // Let's simple un-escape special chars if needed.
        // For now, raw value is better than partial value.

        result[key] = val;
      }

      skipWs();
      if (bibtex[pos] === ',') pos++;
    }

    // Post-processing
    if (result.author) {
      result.authors = result.author.split(' and ').map(a => {
        // Remove braces around author names if any (e.g. "{Smith}")
        return a.trim().replace(/^\{+|\}+$/g, '');
      });
    }
    // Cleanup title specifically? 
    if (result.title) {
      // Remove braces that are just purely wrappers?
      // e.g. "Title {X}." -> "Title X."
      // Doing this globally might be aggressive but for IEEE/ACM display it's usually preferred.
      // result.title = result.title.replace(/[{}]/g, ''); 
    }

    return result;
  }
};
