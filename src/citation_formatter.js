/**
 * Citation Formatter
 * Converts parsed BibTeX objects into IEEE and ACM citation strings.
 */
const CitationFormatter = {
    /**
     * Formats author names for IEEE (J. K. Author).
     * @param {string} authorName - "Last, First" or "First Last"
     * @returns {string} Formatted name.
     */
    formatIEEEAuthor: (authorName) => {
        // Basic heuristic for typical BibTeX names
        // 1. "Last, First Middle" -> "F. M. Last"
        // 2. "First Middle Last" -> "F. M. Last"

        if (authorName === "et al.") return "et al.";

        let parts = authorName.split(',');
        let first = "";
        let last = "";

        if (parts.length === 2) {
            last = parts[0].trim();
            first = parts[1].trim();
        } else {
            const tokens = authorName.split(' ');
            last = tokens.pop();
            first = tokens.join(' ');
        }

        // Initials for first name
        const initials = first.split(' ')
            .filter(p => p.length > 0)
            .map(p => p[0].toUpperCase() + ".")
            .join(" ");

        return `${initials} ${last}`;
    },

    /**
     * Formats author names for ACM (First Last).
     */
    formatACMAuthor: (authorName) => {
        if (authorName === "et al.") return "et al.";
        let parts = authorName.split(',');
        if (parts.length === 2) {
            return `${parts[1].trim()} ${parts[0].trim()}`;
        }
        return authorName;
    },

    /**
     * Formats a list of authors strings.
     * IEEE: "A. Author, B. Buthor, and C. Cuthor"
     * ACM: "A. Author, B. Buthor, and C. Cuthor" (similar, but full names often used)
     */
    formatAuthorList: (authors, formatter) => {
        if (!authors || authors.length === 0) return "";
        const formatted = authors.map(formatter);

        // Check for et al.
        const hasEtAl = formatted[formatted.length - 1] === "et al.";
        if (hasEtAl) {
            if (formatted.length === 1) return "et al."; // Should not happen usually
            // "A, B, et al." not "A, B, and et al."
            return `${formatted.slice(0, -1).join(", ")}, et al.`;
        }

        if (formatted.length === 1) return formatted[0];
        if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
        return `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
    },

    toIEEE: (data) => {
        if (!data) return "";
        // Template:
        // [Authors], "Title," in [Venue], [Year], pp. [Pages].

        const authors = CitationFormatter.formatAuthorList(data.authors, CitationFormatter.formatIEEEAuthor);
        const title = data.title ? `"${data.title},"` : "";
        let venue = "";
        if (data.journal) venue = `in ${data.journal}`;
        else if (data.booktitle) venue = `in ${data.booktitle}`; // Conference

        // IEEE standard abbreviations often used, but we use what we have.
        // If venue exists, add comma
        if (venue) venue += ",";

        const year = data.year ? `${data.year}` : "";

        let pages = "";
        if (data.pages) {
            pages = `pp. ${data.pages}.`.replace("--", "–"); // En-dash
        }

        // Assemble parts filtering empty ones
        // Note: Punctuation is tricky.
        // IEEE: A. B. Author, "Title," in Venue, Year, pp. 1-10.

        let parts = [authors, title, venue, year, pages];
        return parts.filter(p => p).join(" ");
    },

    toACM: (data) => {
        if (!data) return "";
        // Template:
        // [Authors]. [Year]. [Title]. In [Venue]. [Publisher?], [Pages]. [DOI?]

        const authors = CitationFormatter.formatAuthorList(data.authors, CitationFormatter.formatACMAuthor);
        const year = data.year ? `${data.year}.` : "";
        const title = data.title ? `${data.title}.` : "";

        let venue = "";
        if (data.journal) venue = `In ${data.journal}`;
        else if (data.booktitle) venue = `In ${data.booktitle}`;

        let pages = "";
        if (data.pages) {
            pages = `${data.pages}`;
        }

        // Combine venue and pages if feasible
        let container = venue;
        if (pages && container) container += `, ${pages}`;
        if (container) container += ".";

        return [authors, year, title, container].filter(x => x).join(" ");
    }
};
