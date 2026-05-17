/**
 * MarkdownRenderer — Static enhancement pipeline for rendered Markdown.
 * Applies: syntax highlighting (highlight.js), heading anchor links,
 * code block copy buttons, table scroll wrappers, KaTeX math rendering,
 * footnote hover tooltips.
 */

import { escapeHtml } from '../utils.js';

export class MarkdownRenderer {
    static init() {
        window.marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
        if (window.markedFootnote) window.marked.use(window.markedFootnote());
        if (window.markedAlert) window.marked.use(window.markedAlert());
    }

    static render(content, targetElement, title) {
        if (!targetElement) return;

        let work = content;
        if (typeof window.emojify === 'function') work = window.emojify(work);
        if (typeof window.mdPreprocess !== 'undefined') work = window.mdPreprocess.preprocess(work);

        let html = window.marked.parse(work);

        if (typeof window.mdPreprocess !== 'undefined') html = window.mdPreprocess.restoreLatex(html);

        if (title && !/<h1[ >]/.test(html)) {
            html = `<h1>${escapeHtml(title)}</h1>` + html;
        }

        targetElement.innerHTML = html;
        targetElement.classList.add('markdown-body');

        if (typeof window.hljs !== 'undefined') {
            try { window.hljs.highlightAll(); } catch (e) {}
        }

        MarkdownRenderer.enhanceCodeBlocks(targetElement);
        MarkdownRenderer.addHeadingAnchors(targetElement);
        MarkdownRenderer.wrapTables(targetElement);
        MarkdownRenderer.enhanceFootnotes(targetElement);
    }

    static enhanceFootnotes(container) {
        const refs = container.querySelectorAll('sup a[data-footnote-ref]');
        if (!refs.length) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'footnote-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);

        let hideTimeout;

        refs.forEach(function(link) {
            link.addEventListener('mouseenter', function(e) {
                clearTimeout(hideTimeout);
                const id = link.getAttribute('href');
                if (!id) return;
                const footnote = container.querySelector(id);
                if (!footnote) return;
                const content = footnote.cloneNode(true);
                const backrefs = content.querySelectorAll('[data-footnote-backref]');
                backrefs.forEach(function(b) { b.remove(); });
                let text = content.textContent.trim();
                if (text.length > 300) text = text.slice(0, 300) + '…';
                tooltip.textContent = text;
                tooltip.style.display = 'block';
                positionTooltip(tooltip, link);
            });

            link.addEventListener('mouseleave', function() {
                hideTimeout = setTimeout(function() {
                    tooltip.style.display = 'none';
                }, 200);
            });
        });

        tooltip.addEventListener('mouseenter', function() {
            clearTimeout(hideTimeout);
        });
        tooltip.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });

        function positionTooltip(tip, anchor) {
            var rect = anchor.getBoundingClientRect();
            var tipH = tip.offsetHeight || 100;
            var tipW = tip.offsetWidth || 280;
            var left = rect.left + rect.width / 2 - tipW / 2;
            if (left < 12) left = 12;
            if (left + tipW > window.innerWidth - 12) left = window.innerWidth - tipW - 12;
            var top;
            if (rect.top > tipH + 12) {
                top = rect.top - tipH - 12;
            } else {
                top = rect.bottom + 12;
            }
            tip.style.left = left + 'px';
            tip.style.top = top + 'px';
            tip.style.bottom = 'auto';
        }
    }

    static enhanceCodeBlocks(container) {
        const pres = container.querySelectorAll('pre');
        pres.forEach(pre => {
            const code = pre.querySelector('code');
            if (!code) return;

            const lang = MarkdownRenderer.extractLang(code.className);

            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const header = document.createElement('div');
            header.className = 'code-block-header';
            header.innerHTML = `
                <span class="code-language">${lang || 'code'}</span>
                <button class="code-copy-btn" title="复制代码">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>复制</span>
                </button>
            `;

            wrapper.insertBefore(header, pre);

            pre.classList.add('code-block-content');

            const copyBtn = header.querySelector('.code-copy-btn');
            copyBtn.addEventListener('click', async () => {
                const codeText = code.textContent;
                try {
                    await navigator.clipboard.writeText(codeText);
                    copyBtn.classList.add('copied');
                    copyBtn.querySelector('span').textContent = '已复制';
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.querySelector('span').textContent = '复制';
                    }, 2000);
                } catch (e) {
                    console.error('Failed to copy:', e);
                    copyBtn.querySelector('span').textContent = '复制失败';
                    setTimeout(() => {
                        copyBtn.querySelector('span').textContent = '复制';
                    }, 2000);
                }
            });
        });
    }

    static extractLang(className) {
        const match = className.match(/language-(\S+)/);
        return match ? match[1] : '';
    }

    static addHeadingAnchors(container) {
        const headings = container.querySelectorAll('h2, h3, h4');
        headings.forEach((h, i) => {
            if (!h.id) {
                h.id = 'heading-' + i;
            }
            const anchor = document.createElement('a');
            anchor.className = 'heading-anchor';
            anchor.href = '#' + h.id;
            anchor.innerHTML = '\u00A7';
            anchor.setAttribute('aria-label', 'Permalink to ' + h.textContent.trim());
            h.insertBefore(anchor, h.firstChild);
        });
    }

    static wrapTables(container) {
        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    static switchTheme(isDark) {
        const hlDark = document.getElementById('hljs-dark-theme');
        const hlLight = document.getElementById('hljs-light-theme');
        const ghDark = document.getElementById('gh-md-dark-theme');
        const ghLight = document.getElementById('gh-md-light-theme');

        if (hlDark) hlDark.disabled = !isDark;
        if (hlLight) hlLight.disabled = isDark;
        if (ghDark) ghDark.disabled = !isDark;
        if (ghLight) ghLight.disabled = isDark;
    }
}
