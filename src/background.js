/**
 * Background Service Worker
 * Handles data fetching to bypass CORS restrictions in content scripts.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FETCH_BIBTEX') {
        fetchBibtex(request.url).then(sendResponse);
        return true; // Keep the channel open for async response
    }
});

async function fetchBibtex(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }
        const text = await response.text();
        return { success: true, data: text };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
