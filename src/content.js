/**
 * Content Script for Google Scholar IEEE/ACM Extension
 * FINAL VERSION: Ancestor Traversal + Anti-Duplicate (Idempotent)
 */

// Configuration
const SELECTORS = {
    MODAL_WRAPPER: '#gs_cit',
    TOP_DIV: '#gs_top',
    ANCHOR_TEXT: 'APA'
};

function log(msg) {
    console.log(`[ScholarExt] ${msg}`);
}

const observer = new MutationObserver(handleMutation);
observer.observe(document.body, { childList: true, subtree: true });

function handleMutation(mutations) {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
                if (node.id === 'gs_cit') processModal(node);
                if (node.id === 'gs_top') processTop(node);
            }
        }
    }
}

setInterval(() => {
    const top = document.getElementById('gs_top');
    // FIX: Check if we missed the rows even if processed (content might be wiped)
    if (top && (!top.dataset.processed || !top.querySelector('.gs-ext-row'))) {
        processTop(top);
    }
}, 500);

function processModal(modal) {
    const top = modal.querySelector(SELECTORS.TOP_DIV);
    if (top) processTop(top);
    else {
        const obs = new MutationObserver((muts, o) => {
            const t = modal.querySelector(SELECTORS.TOP_DIV);
            if (t) { o.disconnect(); processTop(t); }
        });
        obs.observe(modal, { childList: true, subtree: true });
    }
}

function processTop(container) {
    // 0. Re-entrancy guard
    if (container.dataset.processing === "true") return;

    // 1. Basic guard: if we marked it processed AND it still has rows, stop.
    if (container.dataset.processed === "true") {
        if (container.querySelector('.gs-ext-row')) return;
        // If processed but no rows, we must proceed (reset happened).
        log("Processed flag true but rows missing. Re-injecting...");
    }

    container.dataset.processing = "true";

    // Wait for text "APA" to be present
    const checkStart = Date.now();
    const check = setInterval(() => {
        // Double check inside interval
        if (container.querySelector('.gs-ext-row')) {
            clearInterval(check);
            container.dataset.processed = "true";
            container.dataset.processing = "false";
            return;
        }

        const apaEl = findElementWithText(container, SELECTORS.ANCHOR_TEXT);

        if (apaEl) {
            clearInterval(check);
            // reset processing flag first or inside inject
            injectCitations(container, apaEl);
            container.dataset.processed = "true";
            container.dataset.processing = "false";
        } else if (Date.now() - checkStart > 3000) {
            clearInterval(check); // Timeout
            container.dataset.processing = "false";
        }
    }, 100);
}

function findElementWithText(container, text) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
        if (node.nodeValue.trim() === text) return node.parentElement;
    }
    return null;
}

function injectCitations(container, anchorElement) {
    // 1. Strict Idempotency Check
    if (container.querySelector('.gs-ext-row')) {
        log("Already injected.");
        return;
    }

    log("Injecting...");

    // Traverse up to find the TR
    let currentRow = anchorElement;
    while (currentRow && currentRow.tagName !== 'TR') {
        currentRow = currentRow.parentElement;
    }

    if (!currentRow) {
        log("Could not find TR ancestor.");
        return;
    }

    const parentContainer = currentRow.parentElement; // This is tbody or table

    // 2. Second Check on the parent itself
    if (parentContainer.querySelector('.gs-ext-row')) {
        log("Parent already has rows.");
        return;
    }

    const ieeeRow = createNativeRow("IEEE", "Loading...");
    const acmRow = createNativeRow("ACM", "Loading...");

    const bibtexEl = findElementWithText(container, "BibTeX");
    let exportRow = null;
    let bibtexUrl = null;

    if (bibtexEl) {
        // Extract URL
        const anchor = bibtexEl.closest('a');
        if (anchor) bibtexUrl = anchor.href;

        let bRow = bibtexEl;
        while (bRow && bRow.tagName !== 'TR') bRow = bRow.parentElement;
        if (bRow && parentContainer.contains(bRow)) exportRow = bRow;
    }

    if (exportRow) {
        parentContainer.insertBefore(ieeeRow, exportRow);
        parentContainer.insertBefore(acmRow, exportRow);
    } else {
        parentContainer.appendChild(ieeeRow);
        parentContainer.appendChild(acmRow);
    }

    // Helper to add copy buttons to all rows
    const applyCopyButtonsToAll = () => {
        const allRows = parentContainer.querySelectorAll('tr');
        allRows.forEach(row => {
            addCopyButtonToRow(row);
        });
    };

    // Main Logic: Use ReferenceParser (Screen Scraping)
    // User requested to remove BibTeX fetch due to 403 reliability issues.
    log("Using direct parsing (no BibTeX fetch).");
    const formats = extractFormats(parentContainer);

    if (typeof ReferenceParser === 'undefined' || typeof CitationFormatter === 'undefined') {
        updateNativeRow(ieeeRow, "Error: Resources missing.");
        updateNativeRow(acmRow, "Error: Resources missing.");
        return;
    }

    const data = ReferenceParser.parseCannot(formats);
    if (!data) {
        updateNativeRow(ieeeRow, "Error: Could not parse citation.");
        updateNativeRow(acmRow, "Error: Could not parse citation.");
        return;
    }

    const ieeeText = CitationFormatter.toIEEE(data);
    const acmText = CitationFormatter.toACM(data);

    updateNativeRow(ieeeRow, ieeeText, true);
    updateNativeRow(acmRow, acmText, true);

    applyCopyButtonsToAll();
    log("Injected successfully.");
}

function extractFormats(container) {
    const formats = {};
    const rows = container.querySelectorAll('tr');
    rows.forEach(tr => {
        const th = tr.querySelector('th, .gs_cith');
        const td = tr.querySelector('td, .gs_citr');
        if (th && td) {
            const key = th.textContent.trim();
            const val = td.textContent.trim();
            formats[key] = val;
        }
    });
    return formats;
}

function createNativeRow(title, content) {
    const tr = document.createElement('tr');
    tr.className = "gs-ext-row";

    const th = document.createElement('th');
    th.className = "gs_cith";
    th.scope = "row";
    th.style.textAlign = "right";
    th.style.verticalAlign = "top";
    th.style.padding = "8px 16px 8px 0";
    th.style.whiteSpace = "nowrap";
    th.textContent = title;

    const td = document.createElement('td');
    td.style.padding = "8px 0";
    td.style.verticalAlign = "top";

    const div = document.createElement('div');
    div.className = "gs_citr";
    div.textContent = content;

    td.appendChild(div);
    tr.appendChild(th);
    tr.appendChild(td);

    return tr;
}

function updateNativeRow(tr, text, enableCopy = false) {
    const div = tr.querySelector('.gs_citr');
    if (!div) return;
    // Only update text if provided
    if (text !== null) {
        div.textContent = text;
    }

    if (enableCopy) {
        addCopyButtonToRow(tr);
    }
}

function addCopyButtonToRow(tr) {
    const div = tr.querySelector('.gs_citr');
    if (!div) return;

    // Check if button already exists
    if (div.querySelector('.gs-ext-copy-btn')) return;

    // The text to copy should be the content of the div *before* adding the button.
    // We need to clone the div and remove the button if it exists, or get the text content
    // of the first child node if it's just text.
    // A more robust way is to clone the div, remove any existing copy button, then get textContent.
    const clone = div.cloneNode(true);
    const existingBtn = clone.querySelector('.gs-ext-copy-btn');
    if (existingBtn) existingBtn.remove();
    const textToCopy = clone.textContent.trim();

    const copyBtn = document.createElement('a');
    copyBtn.href = "javascript:void(0)";
    copyBtn.className = "gs-ext-copy-btn"; // Marker class
    copyBtn.textContent = "[Copy]";
    copyBtn.style.marginLeft = "8px";
    copyBtn.style.fontSize = "11px";
    copyBtn.style.textDecoration = "none";
    copyBtn.style.color = "#1a0dab";

    copyBtn.onclick = (e) => {
        e.preventDefault();
        // Get text excluding the button itself?
        // Cloning the node and removing children?
        // Or simply:
        let cleanText = div.childNodes[0].nodeValue;
        // Usually text is the first child node if simple.
        // But what if there are italics (<i>)? APA often has italics.
        // textContent returns all text.
        // clone and remove specific class?
        const clone = div.cloneNode(true);
        const btn = clone.querySelector('.gs-ext-copy-btn');
        if (btn) btn.remove();
        cleanText = clone.textContent.trim();

        navigator.clipboard.writeText(cleanText).then(() => {
            copyBtn.textContent = "[Copied!]";
            setTimeout(() => { copyBtn.textContent = "[Copy]"; }, 2000);
        });
    };
    div.appendChild(copyBtn);
}
