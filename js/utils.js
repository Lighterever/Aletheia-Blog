/**
 * Shared utility functions.
 * escapeHtml, formatDate, getAllTags — used across the app for
 * DOM-safe string insertion and date/tag normalization.
 */

export function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

export function formatDate(s) {
    if (!s) return '';
    const d = new Date(s);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function getAllTags() {
    const tagSet = new Set();
    if (typeof window.articles !== 'undefined') {
        window.articles.forEach(a => (a.tags || []).forEach(t => tagSet.add(t)));
    }
    return [...tagSet].sort();
}

export function decodeContent(str) {
    if (!str) return '';
    try {
        const binary = atob(str);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch {
        return str;
    }
}
