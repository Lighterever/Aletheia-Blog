/**
 * LettersPage — Incoming letters/chronicles display (/letters).
 * Date-range header, sorted letter list with metadata.
 */

import { escapeHtml } from '../utils.js';

export class LettersPage {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('lettersPage');
        this.grid = document.getElementById('lettersGrid');
        this.emptyState = document.getElementById('lettersEmpty');
        this.expandSection = document.getElementById('lettersExpand');
        this.expandBtn = document.getElementById('expandDaysBtn');
        this.expandRange = document.getElementById('expandRange');
        this.dateRangeEl = document.getElementById('lettersDateRange');
        this.loadingEl = document.getElementById('lettersLoading');

        this.currentDays = 7;
        this.maxDays = 28;
        this.expandedIds = new Set();

        this.inspirationTags = ['灵感', '想法', 'idea', 'thoughts', '深夜', '随笔'];

        this.bindEvents();
    }

    bindEvents() {
        this.expandBtn?.addEventListener('click', () => this.expandRange());
    }

    render() {
        const articles = this.getRecentArticles();

        if (articles.length === 0) {
            this.showEmptyState();
        } else {
            this.showEnvelopes(articles);
        }

        this.updateDateRange();
    }

    getRecentArticles() {
        const now = new Date();
        const cutoff = new Date(now.getTime() - this.currentDays * 24 * 60 * 60 * 1000);

        return (typeof window.articles !== 'undefined' ? window.articles : [])
            .filter(article => {
                const articleDate = new Date(article.date);
                return articleDate >= cutoff;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    showEnvelopes(articles) {
        this.grid.innerHTML = articles.map(article =>
            this.createEnvelopeHTML(article)
        ).join('');

        this.grid.classList.remove('hidden');
        this.emptyState.classList.add('hidden');

        if (this.currentDays < this.maxDays) {
            this.expandSection.classList.remove('hidden');
            this.expandRange.textContent = `${this.currentDays + 7}天内`;
        } else {
            this.expandSection.classList.add('hidden');
        }

        this.bindEnvelopeEvents();
    }

    createEnvelopeHTML(article) {
        const date = new Date(article.date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dateDisplay = `${month}.${day}`;
        const fullDate = `${date.getFullYear()}.${month}.${day}`;

        const tagsHtml = (article.tags || [])
            .map(t => `<span class="envelope-tag">#${escapeHtml(t)}</span>`)
            .join('');

        const hasInspiration = (article.tags || []).some(
            t => this.inspirationTags.includes(t)
        );

        const excerpt = this.extractExcerpt(article.content, 3);

        const isExpanded = this.expandedIds.has(article.id);

        return `
            <div class="envelope-card${isExpanded ? ' expanded' : ''}"
                 data-article-id="${escapeHtml(article.id)}">
                <div class="envelope-flap">
                    <svg class="flap-triangle" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <polygon points="0,0 50,40 100,0" />
                    </svg>
                </div>
                <div class="letter-paper">
                    ${isExpanded ? this.createExpandedContent(article, fullDate, tagsHtml, excerpt) : ''}
                </div>
                <div class="envelope-body">
                    <div class="envelope-lip"></div>
                    <div class="envelope-postmark">
                        <span class="postmark-date">${dateDisplay}</span>
                    </div>
                    <h3 class="envelope-title">${escapeHtml(article.title)}</h3>
                    <div class="envelope-tags">${tagsHtml}</div>
                    <div class="envelope-seal" data-has-inspiration="${hasInspiration}">
                        <div class="seal-icon">
                            <svg viewBox="0 0 32 32" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="6" width="26" height="20" rx="2" stroke-width="1.2" />
                                <path d="M3 12 L16 20 L29 12" stroke-width="1" />
                                <line x1="11" y1="16" x2="16" y2="19.5" stroke-width="1.2" />
                                <line x1="16" y1="19.5" x2="22" y2="15" stroke-width="1.2" />
                            </svg>
                        </div>
                        <div class="seal-glow"></div>
                    </div>
                </div>
                <div class="envelope-bottom">
                    <div class="envelope-texture"></div>
                </div>
            </div>
        `;
    }

    createExpandedContent(article, fullDate, tagsHtml, excerpt) {
        return `
            <div class="letter-content">
                <div class="letter-header">
                    <button class="letter-close">×</button>
                </div>
                <div class="letter-excerpt">
                    ${excerpt}
                </div>
                <a class="letter-read-more" href="/article/${escapeHtml(article.id)}" data-article-id="${escapeHtml(article.id)}">
                    <span>阅读全文</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </a>
            </div>
        `;
    }

    extractExcerpt(content, maxParagraphs = 3) {
        if (!content) return '<p>暂无内容</p>';

        const text = content
            .replace(/^#+\s+/gm, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`(.+?)`/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1');

        const paragraphs = text
            .split(/\n\n+/)
            .filter(p => p.trim())
            .slice(0, maxParagraphs);

        return paragraphs
            .map(p => `<p>${escapeHtml(p.trim())}</p>`)
            .join('');
    }

    bindEnvelopeEvents() {
        this.grid.querySelectorAll('.envelope-card').forEach(card => {
            const articleId = card.dataset.articleId;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.letter-close') || e.target.closest('.letter-read-more')) {
                    return;
                }
                this.toggleEnvelope(articleId, card);
            });

            card.querySelector('.letter-close')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.collapseEnvelope(articleId, card);
            });

            card.querySelector('.letter-read-more')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetId = e.currentTarget.dataset.articleId;
                this.app.navigate(`article/${targetId}`);
            });
        });
    }

    toggleEnvelope(articleId, card) {
        if (this.expandedIds.has(articleId)) {
            this.collapseEnvelope(articleId, card);
        } else {
            this.expandEnvelope(articleId, card);
        }
    }

    expandEnvelope(articleId, card) {
        const article = window.articles.find(a => a.id === articleId);
        if (!article) return;

        this.expandedIds.add(articleId);

        const date = new Date(article.date);
        const fullDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        const tagsHtml = (article.tags || [])
            .map(t => `<span class="envelope-tag">#${escapeHtml(t)}</span>`)
            .join('');
        const excerpt = this.extractExcerpt(article.content, 3);

        const paper = card.querySelector('.letter-paper');
        paper.innerHTML = this.createExpandedContent(article, fullDate, tagsHtml, excerpt);

        card.getBoundingClientRect();
        card.classList.add('expanded');

        paper.querySelector('.letter-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.collapseEnvelope(articleId, card);
        });
        paper.querySelector('.letter-read-more')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.app.navigate(`article/${articleId}`);
        });
    }

    collapseEnvelope(articleId, card) {
        this.expandedIds.delete(articleId);
        card.classList.remove('expanded');
        const paper = card.querySelector('.letter-paper');
        if (paper) {
            const onTransitionEnd = () => {
                paper.innerHTML = '';
                paper.removeEventListener('transitionend', onTransitionEnd);
            };
            paper.addEventListener('transitionend', onTransitionEnd);
        }
    }

    showEmptyState() {
        this.grid.classList.add('hidden');
        this.emptyState.classList.remove('hidden');
    }

    expandRange() {
        if (this.currentDays >= this.maxDays) return;

        this.currentDays = Math.min(this.currentDays + 7, this.maxDays);

        this.loadingEl.classList.remove('hidden');

        setTimeout(() => {
            const articles = this.getRecentArticles();

            if (articles.length === 0) {
                this.showEmptyState();
            } else {
                this.showEnvelopes(articles);
            }

            this.loadingEl.classList.add('hidden');
        }, 400);
    }

    updateDateRange() {
        const now = new Date();
        const startDate = new Date(now.getTime() - this.currentDays * 24 * 60 * 60 * 1000);

        const formatDate = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

        if (this.dateRangeEl) {
            this.dateRangeEl.textContent = `${formatDate(startDate)} - ${formatDate(now)}`;
        }
    }

    show() {
        this.container?.classList.remove('hidden');
        this.render();
    }

    hide() {
        this.container?.classList.add('hidden');
        this.expandedIds.clear();
    }
}
