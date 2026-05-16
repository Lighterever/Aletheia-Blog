/**
 * 文章阅读器
 */

import { MarkdownRenderer } from '../core/markdown-renderer.js';
import { escapeHtml, formatDate } from '../utils.js';

export class ArticleReader {
    constructor() {
        this.reader = document.getElementById('articleReader');
        this.content = document.getElementById('articleContent');
        this.tocPanel = document.getElementById('tocPanel');
        this.tocList = document.getElementById('tocList');
        this.tocFab = null;
        this.backFab = null;
        this.tocOverlay = null;
        this.onBackClick = null;
    }

    render(article) {
        if (!this.content) return;

        const dateStr = formatDate(article.date).replace(/-/g, '.');
        const tagsHtml = (article.tags || []).map(t =>
            `<span class="article-category">#${t}</span>`
        ).join('');

        const stats = ArticleReader.countWords(article.content);
        const totalCount = stats.cn + stats.en;
        const readingTime = Math.max(1, Math.ceil(stats.cn / 400 + stats.en / 250));
        const countLabel = (stats.cn && stats.en)
            ? `${stats.cn.toLocaleString()}字 + ${stats.en.toLocaleString()}词`
            : stats.cn ? `${stats.cn.toLocaleString()}字` : `${stats.en.toLocaleString()}词`;
        const displayCount = stats.cn && stats.en ? `${totalCount.toLocaleString()}字词` : countLabel;

        const metaEl = document.getElementById('articleMeta');
        if (metaEl) {
            metaEl.innerHTML = `
                <span class="article-meta-date">${dateStr}</span>
                ${tagsHtml}
                <span class="article-meta-stats">
                    <span class="word-count">${displayCount}</span>
                    <span class="reading-time">约${readingTime}分钟</span>
                </span>
            `;
        }

        MarkdownRenderer.render(article.content, this.content, article.title);

        this.setupArticle(article);

        if (typeof window.renderMathInElement !== 'undefined') {
            try {
                window.renderMathInElement(this.content, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ],
                    throwOnError: false
                });
            } catch (e) {
                console.error('KaTeX render error:', e);
            }
        }
    }

    setupArticle(article) {
        this.addHeadingIds();
        this.generateToc();
        this.createLightbox();
        this.createProgressBar();
        this.createFabs();
        if (article && typeof window.articles !== 'undefined') {
            this.createPostNavigation(article, window.articles);
        }
        window.scrollTo(0, 0);
        document.documentElement.style.setProperty('--reading-progress', '0%');
    }

    createProgressBar() {
        if (document.querySelector('.reading-progress')) return;
        const bar = document.createElement('div');
        bar.className = 'reading-progress';
        document.body.appendChild(bar);
    }

    createPostNavigation(currentArticle, articles) {
        const currentIndex = articles.findIndex(a => a.id === currentArticle.id);
        if (currentIndex === -1) return;

        const prev = currentIndex > 0 ? articles[currentIndex - 1] : null;
        const next = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

        if (!prev && !next) return;

        const nav = document.createElement('nav');
        nav.className = 'post-navigation';
        nav.innerHTML = `
            <div class="post-nav-item ${prev ? '' : 'empty'}">
                ${prev ? `
                    <span class="post-nav-label">← 上一篇</span>
                    <a href="#" class="post-nav-title" data-article-id="${prev.id}">${prev.title}</a>
                ` : '<span class="post-nav-placeholder"></span>'}
            </div>
            <div class="post-nav-item ${next ? '' : 'empty'}">
                ${next ? `
                    <span class="post-nav-label">下一篇 →</span>
                    <a href="#" class="post-nav-title" data-article-id="${next.id}">${next.title}</a>
                ` : '<span class="post-nav-placeholder"></span>'}
            </div>
        `;

        nav.querySelectorAll('.post-nav-title').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = link.dataset.articleId;
                const article = articles.find(a => a.id === id);
                if (article) {
                    this.render(article);
                }
            });
        });

        this.content?.appendChild(nav);
    }

    createLightbox() {
        let overlay = document.querySelector('.lightbox-overlay');
        if (overlay) {
            overlay.querySelector('img').src = '';
        } else {
            overlay = document.createElement('div');
            overlay.className = 'lightbox-overlay';
            overlay.innerHTML = `
                <button class="lightbox-close" aria-label="关闭">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <img src="" alt="">
            `;
            document.body.appendChild(overlay);

            const close = () => {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            };

            const closeBtn = overlay.querySelector('.lightbox-close');
            closeBtn?.addEventListener('click', close);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('active')) close();
            });
        }

        const img = overlay.querySelector('img');
        this.content?.querySelectorAll('img').forEach(imgEl => {
            imgEl.addEventListener('click', () => {
                img.src = imgEl.src;
                img.alt = imgEl.alt;
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });
    }

    addHeadingIds() {
        this.content?.querySelectorAll('h1, h2, h3, h4').forEach((h, i) => h.id = 'heading-' + i);
    }

    generateToc() {
        const headings = this.content?.querySelectorAll('h2, h3, h4');
        if (!headings || headings.length === 0) { if (this.tocFab) this.tocFab.style.display = 'none'; return; }
        if (this.tocFab) this.tocFab.style.display = '';
        const allHeadings = this.content.querySelectorAll('h1, h2, h3, h4');
        let html = '';
        headings.forEach(heading => {
            let idx = 0;
            for (let i = 0; i < allHeadings.length; i++) { if (allHeadings[i] === heading) { idx = i; break; } }
            const clone = heading.cloneNode(true);
            clone.querySelector('.heading-anchor')?.remove();
            html += `<div class="toc-item toc-${heading.tagName.toLowerCase()}" data-target="heading-${idx}" role="button" tabindex="0">${escapeHtml(clone.textContent)}</div>`;
        });
        if (this.tocList) this.tocList.innerHTML = html;

        if (this.tocList) {
            this.tocList.onclick = (e) => {
                const item = e.target.closest('.toc-item');
                if (!item) return;

                const targetId = item.dataset.target;
                this.closeToc();

                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
        }
    }

    createFabs() {
        this.removeFabs();
        const tocBtn = document.createElement('button');
        tocBtn.className = 'toc-fab'; tocBtn.id = 'tocFab'; tocBtn.title = '目录';
        tocBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>';
        tocBtn.addEventListener('click', () => this.toggleToc());
        document.body.appendChild(tocBtn); this.tocFab = tocBtn;

        const backBtn = document.createElement('button');
        backBtn.className = 'back-fab'; backBtn.id = 'backFab'; backBtn.title = '返回';
        backBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
        backBtn.addEventListener('click', () => this.onBackClick?.());
        document.body.appendChild(backBtn); this.backFab = backBtn;

        const themeFab = document.createElement('button');
        themeFab.className = 'theme-fab'; themeFab.id = 'themeFab'; themeFab.title = '切换主题';
        themeFab.innerHTML = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
        themeFab.addEventListener('click', () => {
            window.__theme?.toggle();
        });
        document.body.appendChild(themeFab); this.themeFab = themeFab;
    }

    removeFabs() {
        if (this.tocFab) { this.tocFab.remove(); this.tocFab = null; }
        if (this.backFab) { this.backFab.remove(); this.backFab = null; }
        if (this.themeFab) { this.themeFab.remove(); this.themeFab = null; }
    }

    toggleToc() { this.tocPanel?.classList.contains('active') ? this.closeToc() : this.openToc(); }
    openToc() {
        this.tocPanel?.classList.add('active');
        if (!this.tocOverlay) { this.tocOverlay = document.createElement('div'); this.tocOverlay.className = 'toc-overlay'; this.tocOverlay.addEventListener('click', () => this.closeToc()); document.body.appendChild(this.tocOverlay); }
        this.tocOverlay.classList.remove('hidden');
    }
    closeToc() { this.tocPanel?.classList.remove('active'); if (this.tocOverlay) this.tocOverlay.classList.add('hidden'); }

    show() { this.reader?.classList.remove('hidden'); }
    hide() {
        this.closeToc();
        this.removeFabs();
        this.reader?.classList.add('hidden');
        const progressBar = document.querySelector('.reading-progress');
        if (progressBar) progressBar.remove();
    }

    static countWords(text) {
        let cn = 0;
        let en = 0;

        const stripMd = text.replace(/^#{1,6}\s+/gm, '')
            .replace(/[*_~`>|\[\]()#!-]/g, ' ')
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`[^`]*`/g, '');

        const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/g;
        const cnMatches = stripMd.match(CJK_RE);
        cn = cnMatches ? cnMatches.length : 0;

        const noCJK = stripMd.replace(CJK_RE, ' ');
        const enMatches = noCJK.match(/[a-zA-Z]+/g);
        en = enMatches ? enMatches.length : 0;

        return { cn, en };
    }
}
