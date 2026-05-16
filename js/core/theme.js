/**
 * Theme — Dark/light dual-theme switching.
 * Persists selection in localStorage, toggles [data-theme] on <html>,
 * swaps highlight.js and github-markdown-css theme stylesheets.
 */

import { MarkdownRenderer } from './markdown-renderer.js';

export class Theme {
    constructor(app) {
        this.app = app;
        this.toggleBtn = document.getElementById('themeToggle');
        this.mobileToggleBtn = document.getElementById('mobileThemeToggle');
        this.current = localStorage.getItem('theme') || 'dark';
        this.apply();
        this.toggleBtn?.addEventListener('click', () => this.toggle());
        this.mobileToggleBtn?.addEventListener('click', () => this.toggle());
        window.__theme = this;
    }

    toggle() {
        this.current = this.current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', this.current);
        this.apply();
        this.app?.onThemeChanged();
    }

    apply() {
        document.documentElement.setAttribute('data-theme', this.current);
        MarkdownRenderer.switchTheme(this.current === 'dark');
    }
}
