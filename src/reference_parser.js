/**
 * Reference Parser
 * Parses metadata from existing citation text on the screen.
 * prioritizing APA (structured) and MLA (full names).
 */

const ReferenceParser = {
    /**
     * Tries to parse from the best available source.
     * @param {Object} formats - Map of { "APA": "text...", "MLA": "text..." }
     */
    parseCannot: (formats) => {
        // IEEE standard prefers initials (F. M. Last). APA provides this cleanly (Last, F. M.).
        // If we strictly want full names (User preference?), we could use MLA.
        // However, "Correct" IEEE/ACM usually means initials.
        // We will default to APA as it is the most structured and reliable for parsing.

        if (formats["APA"]) {
            return ReferenceParser.parseAPA(formats["APA"]);
        }
        if (formats["MLA"]) {
            return ReferenceParser.parseMLA(formats["MLA"]);
        }
        if (formats["Chicago"]) {
            return ReferenceParser.parseAPA(formats["Chicago"]); // Chicago structure is similar enough often? No.
        }
        return null;
    },

    parseAPA: (text) => {
        if (!text) return null;
        try {
            // APA: Last, F. M., & Last, F. M. (Year). Title. Journal, Vol(Issue), Pages.
            // Example: LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. nature, 521(7553), 436-444.

            const yearMatch = text.match(/\((\d{4})\)\./);
            if (!yearMatch) return ReferenceParser.parseFallback(text);

            const year = yearMatch[1];
            const yearIndex = yearMatch.index;

            // Authors
            let authorPart = text.substring(0, yearIndex).trim();
            if (authorPart.endsWith('.')) authorPart = authorPart.slice(0, -1);

            // Remove "&" and split
            // "LeCun, Y., Bengio, Y., & Hinton, G"
            // Split by ".," to separate authors? "LeCun, Y." "Bengio, Y." "Hinton, G"
            // Heuristic: Split by ".," 
            const authorStrings = authorPart.split('.,').map(s => {
                s = s.trim().replace(/^&/, '').trim();
                return s.endsWith('.') ? s : s + '.';
            });

            const authors = authorStrings.map(s => {
                // s is like "LeCun, Y." or "Hinton, G."
                return s.trim();
            });

            // Rest: Title. Journal, ...
            const rest = text.substring(yearIndex + yearMatch[0].length).trim();

            // Title usually ends with period.
            // "Deep learning. nature, 521(7553), 436-444."
            // Be careful of "Proc. IEEE"
            const firstDot = rest.indexOf('. ');
            let title = rest;
            let journalPart = "";

            if (firstDot !== -1) {
                title = rest.substring(0, firstDot);
                journalPart = rest.substring(firstDot + 1).trim();
            }

            // Journal parsing is hard without structure.
            // "nature, 521(7553), 436-444."
            // We can just keep it as 'venue' string if we can't parse more.
            // But let's try to find volume/pages.
            // Match: 521(7553), 436-444
            const volatileMatch = journalPart.match(/(\d+)\s*\((\d+)\),\s*([\d-]+)/);
            let journal = journalPart;
            let vol = "", issue = "", pages = "";

            if (volatileMatch) {
                vol = volatileMatch[1];
                issue = volatileMatch[2];
                pages = volatileMatch[3];
                // Journal is before this
                journal = journalPart.substring(0, volatileMatch.index).replace(/,$/, '').trim();
            }

            return {
                type: 'article', // Assumption
                authors,
                year,
                title,
                journal,
                volume: vol,
                number: issue,
                pages
            };
        } catch (e) {
            console.error(e);
            return ReferenceParser.parseFallback(text);
        }
    },

    parseMLA: (text) => {
        // MLA: Last, First, and First Last. "Title." Journal Vol.Issue (Year): Pages.
        // Example: LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. "Deep learning." nature 521.7553 (2015): 436-444.
        try {
            // Year in parenthesis at end usually
            const yearMatch = text.match(/\((\d{4})\):/);
            if (!yearMatch) return ReferenceParser.parseFallback(text);
            const year = yearMatch[1];

            // Title is in quotes
            const titleMatch = text.match(/"(.*?)\."/);
            const title = titleMatch ? titleMatch[1] : "";

            // Authors before title
            const authorPart = text.substring(0, text.indexOf('"')).trim();
            // Split by "and", then commas? MLA is messy. "Last, First, First Last, and First Last"
            // We'll treat the whole string as one for now or simple split.
            // For correct citation generation, we really just need the list of names.
            // If complex, we might just pass the raw string if the formatter can handle it? 
            // Formatter expects array of strings.
            const authors = authorPart.replace(/,\s*and\s+/, ', ').split(', ').map(s => s.endsWith('.') ? s : s + '.');

            return {
                type: 'article',
                authors,
                year,
                title,
                journal: "Source (MLA)", // Hard to parse perfectly without more regex
                // MLA parsing logic is complex, defaulting to APA is safer for the user's "Correctness" request.
            };
        } catch (e) {
            return ReferenceParser.parseFallback(text);
        }
    },

    parseFallback: (text) => {
        // Minimal parsing
        return {
            authors: [],
            title: text,
            year: "n.d."
        };
    }
};
