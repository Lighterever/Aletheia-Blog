/**
 * App — Main controller & entry point for ℵ · aletheia.
 * History API SPA router, page orchestration, vault gate protection,
 * navigation event handling, keyboard shortcuts, article search & sort,
 * timeline/letters page initialization.
 */

import { escapeHtml, formatDate, getAllTags, decodeContent } from './utils.js';
import { Theme } from './core/theme.js';
import { Navbar } from './core/navbar.js';
import { Typewriter } from './core/typewriter.js';
import { MarkdownRenderer } from './core/markdown-renderer.js';
import { MatrixRain } from './core/matrix-rain.js';
import { ArticleReader } from './pages/article-reader.js';
import { Vault } from './pages/vault.js';
import { TimelineCanvas } from './pages/timeline-canvas.js';
import { LettersPage } from './pages/letters-page.js';

const CONFIG = { transitionDelay: 800, typewriterSpeed: 50, typewriterPause: 300 };

class Crypto {
    static decryptAES(encryptedData, password) {
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) throw new Error('Invalid format');
            const salt = window.CryptoJS.enc.Hex.parse(parts[0]);
            const iv = window.CryptoJS.enc.Hex.parse(parts[1]);
            const ciphertext = window.CryptoJS.enc.Hex.parse(parts[2]);
            const key = window.CryptoJS.PBKDF2(password, salt, { keySize: 256/32, iterations: 100000, hasher: window.CryptoJS.algo.SHA256 });
            const cipherParams = window.CryptoJS.lib.CipherParams.create({ ciphertext });
            const decrypted = window.CryptoJS.AES.decrypt(cipherParams, key, { iv, mode: window.CryptoJS.mode.CBC, padding: window.CryptoJS.pad.Pkcs7 });
            return decrypted.toString(window.CryptoJS.enc.Utf8);
        } catch (e) { return null; }
    }
}

class App {
    constructor() {
        this.pages = {
            home: document.getElementById('homePage'),
            articles: document.getElementById('articles'),
            vault: document.getElementById('vaultPage'),
            encrypted_list: document.getElementById('articlesContainer'),
            article_reader: document.getElementById('articleReader'),
            timeline: document.getElementById('timelinePage'),
            letters: document.getElementById('lettersPage')
        };
        this.mainContainer = document.getElementById('mainContainer');
        this.el = {
            categoryTitle: document.getElementById('categoryTitle'),
            articleCount: document.getElementById('articleCount'),
            articlesList: document.getElementById('articlesList'),
            backBtn: document.getElementById('backBtn'),
            binaryBg: document.getElementById('binaryBg'),
            matrixRainEl: document.getElementById('matrixRain')
        };

        this.currentPage = null;
        this.previousPage = null;
        this.currentTags = new Set();
        this.currentFilterMode = 'or';
        this.currentSortField = 'date';
        this.currentSortDir = 'desc';
        this.readerReturnPage = 'home';
        this._lastScrollY = 0;

        this.theme = new Theme(this);
        this.navbar = new Navbar(this);
        this.typewriter = new Typewriter(CONFIG.typewriterSpeed, CONFIG.typewriterPause);
        this.articleReader = new ArticleReader();
        this.vault = new Vault(this);
        this.matrixRain = new MatrixRain(this.el.matrixRainEl);
        this.lettersPage = new LettersPage(this);

        this.articleReader.onBackClick = () => this.goBackFromReader();
    }

    init() {
        this.generateBinaryBackground();
        this.initCaesarWheels();
        this.bindEvents();
        MarkdownRenderer.init();

        const path = this.getPathFromUrl();
        this.navigateToPath(path);
        this.initialized = true;
        document.documentElement.style.visibility = 'visible';

        window.addEventListener('popstate', () => {
            if (this.currentPage === 'article_reader') return;
            this.handleRouteChange();
        });
        window.addEventListener('scroll', () => {
            this.updateReadingProgress();
            const nav = document.getElementById('globalNav');
            if (!nav) return;

            const scrollY = window.scrollY;
            const delta = scrollY - this._lastScrollY;
            this._lastScrollY = scrollY;

            if (scrollY > 10) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            if (scrollY > 80 && delta > 0) {
                nav.classList.add('slide-up');
            }
            if (delta < -5 || scrollY < 40) {
                nav.classList.remove('slide-up');
            }
        }, { passive: true });
        window.addEventListener('resize', () => this.generateBinaryBackground());
    }

    onThemeChanged() {
        this.matrixRain?.updateColors();
        this.generateBinaryBackground();
        this.initCaesarWheels();
    }

    getPathFromUrl() {
        if (window.location.protocol === 'file:') return 'home';
        const path = window.location.pathname;
        if (!path || path === '/') return 'home';
        return path.replace(/^\//, '').replace(/\/$/, '') || 'home';
    }

    updateBrowserUrl(page) {
        const urlMap = {
            'home': '/',
            'vault': '/vault',
            'articles': '/articles',
            'encrypted_list': '/articles',
            'article_reader': window.location.pathname,
            'timeline': '/timeline',
            'letters': '/letters'
        };
        const url = urlMap[page] || '/';
        if (window.location.pathname !== url) {
            history.replaceState(null, '', url);
        }
    }

    navigateToPath(path) {
        if (path === 'readme') {
            this.navigate('readme');
            return;
        }
        if (path === 'timeline') {
            this.navigate('timeline');
            return;
        }
        if (path === 'letters') {
            this.navigate('letters');
            return;
        }
        if (path.startsWith('article/')) {
            const id = path.replace('article/', '');
            if (id === 'readme') {
                this.navigate('readme');
                return;
            }
            if (!sessionStorage.getItem('vaultUnlocked')) {
                history.pushState(null, '', '/vault');
                this.navigate('vault');
                return;
            }
            const article = typeof window.articles !== 'undefined' ? window.articles.find(a => a.id === id) : null;
            if (article) {
                this.openBlogArticle(article);
                return;
            }
        }
        const protectedPages = ['articles', 'encrypted_list'];
        if (protectedPages.includes(path) && !sessionStorage.getItem('vaultUnlocked')) {
            history.pushState(null, '', '/vault');
            this.navigate('vault');
            return;
        }
        this.navigate(path);
    }

    handleRouteChange() {
        const path = this.getPathFromUrl();
        if (path === 'home') {
            this.navigate('home');
        } else if (path === 'vault') {
            this.navigate('vault');
        } else if (path === 'letters') {
            this.navigate('letters');
        } else if (path === 'articles' || path === '') {
            if (sessionStorage.getItem('vaultUnlocked')) {
                this.navigate('articles');
            } else {
                this.navigate('vault');
            }
        } else if (path.startsWith('article/')) {
            const id = path.replace('article/', '');
            if (id === 'readme') {
                this.openReadme();
            } else {
                const article = typeof window.articles !== 'undefined' ? window.articles.find(a => a.id === id) : null;
                if (article) {
                    if (sessionStorage.getItem('vaultUnlocked')) {
                        this.openBlogArticle(article);
                    } else {
                        this.navigate('vault');
                    }
                }
            }
        } else if (path === 'readme') {
            this.openReadme();
        } else {
            this.navigate('home');
        }
    }

    navigate(page) {
        if (page === 'readme') {
            this.openReadme();
            return;
        }
        if (page.startsWith('article/')) {
            if (!sessionStorage.getItem('vaultUnlocked')) {
                history.pushState(null, '', '/vault');
                this.navigate('vault');
                return;
            }
            const id = page.replace('article/', '');
            const article = typeof window.articles !== 'undefined' ? window.articles.find(a => a.id === id) : null;
            if (article) {
                this.openBlogArticle(article);
                return;
            }
        }

        const protectedPages = ['articles', 'encrypted_list'];
        if (protectedPages.includes(page) && !sessionStorage.getItem('vaultUnlocked')) {
            history.pushState(null, '', '/vault');
            this.navigate('vault');
            return;
        }

        this.hideAllPages();
        this.previousPage = this.currentPage;
        this.currentPage = page;

        this.updateBrowserUrl(page);

        switch (page) {
            case 'home':
                this.pages.home?.classList.remove('hidden');
                this.navbar.show();
                this.navbar.updateActive('home');
                break;
            case 'articles':
                this.pages.articles?.classList.remove('hidden');
                this.navbar.show();
                this.navbar.updateActive('vault');
                this.renderArticleRetrieval();
                break;
            case 'vault':
                this.pages.vault?.classList.remove('hidden');
                this.mainContainer?.classList.remove('hidden');
                this.navbar.show();
                this.navbar.updateActive('vault');
                this.matrixRain.start();
                setTimeout(() => this.vault.keyInput?.focus(), 100);
                break;
            case 'encrypted_list':
                this.pages.encrypted_list?.classList.remove('hidden');
                this.navbar.hide();
                break;
            case 'article_reader':
                this.pages.article_reader?.classList.remove('hidden');
                this.navbar.hide();
                break;
            case 'timeline':
                this.hideAllPages();
                this.pages.timeline?.classList.remove('hidden');
                this.navbar.hide();
                document.body.classList.add('nav-hidden');
                this.navbar.updateActive('timeline');
                if (this.timelineCanvas) {
                    this.timelineCanvas.destroy();
                    this.timelineCanvas = null;
                }
                this.timelineCanvas = new TimelineCanvas();
                history.pushState({ page: 'timeline' }, '', '/timeline');
                break;
            case 'letters':
                this.pages.letters?.classList.remove('hidden');
                this.navbar.show();
                this.navbar.updateActive('letters');
                this.lettersPage.show();
                break;
        }
    }

    hideAllPages() {
        Object.values(this.pages).forEach(p => p?.classList.add('hidden'));
        this.mainContainer?.classList.add('hidden');
        this.articleReader.hide();
        this.typewriter.hide();
        this.matrixRain.stop();
        this.vault.successAnim?.classList.remove('show');
        this.vault.errorMsg?.classList.remove('show');
        document.body.classList.remove('nav-hidden');
        if (this.currentPage === 'timeline' && this.timelineCanvas) {
            this.timelineCanvas.destroy();
            this.timelineCanvas = null;
        }
    }

    renderArticleRetrieval() {
        this.currentTags.clear();
        this.currentFilterMode = 'or';
        this.renderTagPopupList();
        this.updateTagFilterBadge();
        this.renderFilteredArticles();
    }

    sortArticles(arr, field, dir) {
        return [...arr].sort((a, b) => {
            let cmp = 0;
            if (field === 'date') {
                cmp = new Date(a.date) - new Date(b.date);
            } else if (field === 'title') {
                cmp = (a.title || '').localeCompare(b.title || '', 'zh-CN');
            } else if (field === 'tags') {
                const aTags = (a.tags || []).join(',').toLowerCase();
                const bTags = (b.tags || []).join(',').toLowerCase();
                cmp = aTags.localeCompare(bTags);
            }
            return dir === 'asc' ? cmp : -cmp;
        });
    }

    applySortIndicator() {
        const header = document.querySelector('.table-header');
        if (!header) return;
        header.querySelectorAll('.sort-col').forEach(col => {
            col.classList.toggle('active', col.dataset.sort === this.currentSortField);
            const arrow = col.querySelector('.sort-arrow');
            if (arrow) {
                arrow.textContent = col.dataset.sort === this.currentSortField
                    ? (this.currentSortDir === 'asc' ? '↑' : '↓') : '';
            }
        });
    }

    renderFilteredArticles(searchQuery = '', activeTags = null) {
        const list = document.getElementById('articlesList');
        if (!list) return;

        let filtered = typeof window.articles !== 'undefined' ? [...window.articles] : [];

        const tags = activeTags !== null ? activeTags : this.currentTags;
        if (tags.size > 0) {
            filtered = filtered.filter(a =>
                this.currentFilterMode === 'or'
                    ? (a.tags || []).some(t => tags.has(t))
                    : tags.size <= (a.tags || []).length && [...tags].every(t => (a.tags || []).includes(t))
            );
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(a => {
                const titleMatch = (a.title || '').toLowerCase().includes(q);
                const tagMatch = (a.tags || []).some(t => t.toLowerCase().includes(q));
                const contentMatch = decodeContent(a.content || '').toLowerCase().includes(q);
                return titleMatch || tagMatch || contentMatch;
            });
        }

        filtered = this.sortArticles(filtered, this.currentSortField, this.currentSortDir);
        this.applySortIndicator();

        const emptyEl = document.getElementById('articlesEmpty');
        const matchCountEl = document.getElementById('articlesMatchCount');

        if (filtered.length === 0) {
            if (emptyEl) emptyEl.innerHTML = '<div class="no-results">grep: 无匹配</div>';
            list.innerHTML = '';
            if (matchCountEl) matchCountEl.style.display = 'none';
            return;
        }

        if (emptyEl) emptyEl.innerHTML = '';
        const total = typeof window.articles !== 'undefined' ? window.articles.length : 0;
        if (matchCountEl) {
            matchCountEl.style.display = 'block';
            matchCountEl.textContent = `→ 已匹配 ${filtered.length} / ${total} 篇文章`;
        }
        list.innerHTML = filtered.map((a) => {
            const dateStr = formatDate(a.date).replace(/-/g, '.');
            const tagsHtml = (a.tags || []).map(t =>
                `<span class="article-tag" data-tag="${t}">#${t}</span>`
            ).join('');
            return `
                <div class="article-row" data-id="${escapeHtml(a.id)}">
                    <span class="article-date">${dateStr}</span>
                    <span class="article-separator">──</span>
                    <span class="article-title">${escapeHtml(a.title)}</span>
                    <div class="article-tags">${tagsHtml}</div>
                </div>
            `;
        }).join('');
    }

    renderTagPopupList(filterText = '') {
        const list = document.getElementById('tagPopupList');
        if (!list) return;
        const allTags = getAllTags();
        const q = filterText.toLowerCase().trim();

        const filteredTags = q ? allTags.filter(t => t.toLowerCase().includes(q)) : allTags;

        if (filteredTags.length === 0) {
            list.innerHTML = '<div class="tag-popup-no-results">无匹配标签</div>';
            return;
        }

        list.innerHTML = filteredTags.map(tag => {
            const isSelected = this.currentTags.has(tag);
            return `<button class="tag-btn${isSelected ? ' selected' : ''}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`;
        }).join('');
    }

    updateTagFilterBadge() {
        const btn = document.getElementById('tagFilterBtn');
        const count = document.getElementById('tagFilterBtn')?.querySelector('.tag-filter-count');
        if (!btn || !count) return;
        const n = this.currentTags.size;
        if (n > 0) {
            btn.classList.add('has-selection');
            count.style.display = 'flex';
            count.textContent = n;
        } else {
            btn.classList.remove('has-selection');
            count.style.display = 'none';
            count.textContent = '';
        }
    }

    openTagPopup() {
        const popup = document.getElementById('tagPopup');
        if (!popup) return;
        this.renderTagPopupList();
        this.updatePopupMode();
        popup.style.display = 'flex';
        const input = document.getElementById('tagSearchInput');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 50);
        }
    }

    closeTagPopup() {
        const popup = document.getElementById('tagPopup');
        if (popup) popup.style.display = 'none';
    }

    updatePopupMode() {
        const modeContainer = document.querySelector('#tagPopup .tag-popup-mode');
        if (!modeContainer) return;
        modeContainer.querySelectorAll('.mode-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.mode === this.currentFilterMode);
        });
    }

    clearTagSelection() {
        this.currentTags.clear();
        this.updateTagFilterBadge();
        this.renderTagPopupList(document.getElementById('tagSearchInput')?.value || '');
    }

    openBlogArticle(articleOrId) {
        const article = typeof articleOrId === 'object' ? articleOrId
            : (typeof window.articles !== 'undefined' ? window.articles.find(a => a.id === articleOrId) : null);
        if (!article) return;
        const backPages = { articles: 'articles', letters: 'letters', home: 'home', vault: 'vault' };
        this.readerReturnPage = backPages[this.currentPage] || 'articles';
        this.openArticle(article);
    }

    openArticle(article) {
        this.navbar.hide();
        this.typewriter.play(article.title, () => {
            this.hideAllPages();
            this.articleReader.render(article);
            this.articleReader.show();
            this.currentPage = 'article_reader';
            if (article.id) {
                if (article.id === 'readme') {
                    history.pushState({ articleId: article.id }, '', '/readme');
                } else {
                    history.pushState({ articleId: article.id }, '', '/article/' + encodeURIComponent(article.id));
                }
            }
        });
    }

    openReadme() {
        const readme = typeof window.aboutInfo !== 'undefined' ? window.aboutInfo : null;
        if (!readme) return;
        this.readerReturnPage = 'home';
        this.openArticle(readme);
    }

    goBackFromReader() { this.navigate(this.readerReturnPage || 'home'); }

    goBack() {
        const fallback = { articles: 'home', timeline: 'home', letters: 'home' };
        const prev = this.previousPage;
        if (!prev || prev === 'article_reader' || prev === 'encrypted_list') {
            const currentFallback = fallback[this.currentPage] || 'home';
            this.navigate(currentFallback);
        } else {
            this.navigate(prev);
        }
    }

    goBackToVault() {
        this.vault.reset();
        this.navigate('vault');
    }

    updateReadingProgress() {
        if (this.currentPage !== 'article_reader') return;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        document.documentElement.style.setProperty('--reading-progress', (docH > 0 ? Math.min(window.scrollY / docH, 1) : 0) * 100 + '%');
    }

    bindEvents() {
        this.vault.submitBtn?.addEventListener('click', () => this.vault.submit());
        this.vault.keyInput?.addEventListener('keypress', e => { if (e.key === 'Enter') this.vault.submit(); });
        this.vault.keyInput?.addEventListener('input', () => this.vault.clearError());

        this.el.backBtn?.addEventListener('click', () => this.goBackToVault());

        document.getElementById('readmeCard')?.addEventListener('click', () => this.openReadme());

        document.getElementById('tocClose')?.addEventListener('click', () => this.articleReader.closeToc());

        document.getElementById('articlesExit')?.addEventListener('click', () => {
            this.goBack();
        });

        document.getElementById('timelineBackBtn')?.addEventListener('click', () => {
            this.goBack();
        });

        document.getElementById('timelineThemeToggle')?.addEventListener('click', () => {
            var t = document.documentElement.getAttribute('data-theme') || 'dark';
            var next = t === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            var btn = document.getElementById('timelineThemeToggle');
            if (btn) btn.textContent = next === 'dark' ? '◐' : '◑';
            this.onThemeChanged();
        });

        let searchTimer = null;
        const searchBox = document.querySelector('#articles .search-box');
        searchBox?.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                this.renderFilteredArticles(e.target.value);
            }, 300);
        });

        const tagFilterBtn = document.getElementById('tagFilterBtn');
        tagFilterBtn?.addEventListener('click', () => {
            this.openTagPopup();
        });

        const tagPopup = document.getElementById('tagPopup');
        tagPopup?.addEventListener('click', (e) => {
            if (e.target === tagPopup) {
                this.closeTagPopup();
            }
        });

        document.getElementById('tagPopupClose')?.addEventListener('click', () => {
            this.closeTagPopup();
        });

        const tagSearchInput = document.getElementById('tagSearchInput');
        tagSearchInput?.addEventListener('input', (e) => {
            this.renderTagPopupList(e.target.value);
        });

        const tagPopupList = document.getElementById('tagPopupList');
        tagPopupList?.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-btn');
            if (!btn) return;
            const tagName = btn.dataset.tag;
            if (this.currentTags.has(tagName)) {
                this.currentTags.delete(tagName);
            } else {
                this.currentTags.add(tagName);
            }
            this.renderTagPopupList(tagSearchInput?.value || '');
            this.updateTagFilterBadge();
            const sb = document.querySelector('#articles .search-box');
            this.renderFilteredArticles(sb?.value || '');
        });

        document.getElementById('tagPopupClear')?.addEventListener('click', () => {
            this.currentTags.clear();
            this.renderTagPopupList(tagSearchInput?.value || '');
            this.updateTagFilterBadge();
            const sb = document.querySelector('#articles .search-box');
            this.renderFilteredArticles(sb?.value || '');
        });

        document.getElementById('tagPopupConfirm')?.addEventListener('click', () => {
            this.closeTagPopup();
        });

        document.querySelector('#tagPopup .tag-popup-mode')?.addEventListener('click', (e) => {
            const opt = e.target.closest('.mode-option');
            if (!opt) return;
            this.currentFilterMode = opt.dataset.mode;
            this.updatePopupMode();
            const sb = document.querySelector('#articles .search-box');
            this.renderFilteredArticles(sb?.value || '');
        });

        const articlesList = document.getElementById('articlesList');
        articlesList?.addEventListener('click', (e) => {
            const row = e.target.closest('.article-row');
            const tagEl = e.target.closest('.article-tag');

            if (tagEl) {
                const tagName = tagEl.dataset.tag;
                this.currentTags.clear();
                this.currentTags.add(tagName);
                this.renderTagPopupList(document.getElementById('tagSearchInput')?.value || '');
                this.updateTagFilterBadge();
                const sb = document.querySelector('#articles .search-box');
                this.renderFilteredArticles(sb?.value || '');
                return;
            }

            if (row) {
                const articleId = row.dataset.id;
                const article = typeof window.articles !== 'undefined' ? window.articles.find(a => a.id === articleId) : null;
                if (article) {
                    this.openBlogArticle(article);
                }
            }
        });

        const tableHeader = document.querySelector('#articles .table-header');
        tableHeader?.addEventListener('click', (e) => {
            const col = e.target.closest('.sort-col');
            if (!col) return;
            const field = col.dataset.sort;
            if (this.currentSortField === field) {
                this.currentSortDir = this.currentSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                this.currentSortField = field;
                this.currentSortDir = field === 'date' ? 'desc' : 'asc';
            }
            const sb = document.querySelector('#articles .search-box');
            this.renderFilteredArticles(sb?.value || '');
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const popup = document.getElementById('tagPopup');
                if (popup && popup.style.display === 'flex') {
                    this.closeTagPopup();
                    return;
                }
                const tocHidden = this.articleReader.tocPanel?.classList.contains('hidden');
                if (!tocHidden) this.articleReader.closeToc();
                else if (this.currentPage === 'article_reader') this.goBackFromReader();
                else if (this.currentPage === 'encrypted_list') this.goBackToVault();
            }
        });

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/"]');
            if (!link) return;
            e.preventDefault();
            const href = link.getAttribute('href');
            const path = href.replace(/^\//, '') || 'home';
            if (href === '/' || href === '') {
                this.navigate('home');
                return;
            }
            if (path === 'vault') {
                this.navigate('vault');
            } else if (path === 'articles') {
                if (sessionStorage.getItem('vaultUnlocked')) {
                    this.navigate('articles');
                } else {
                    this.navigate('vault');
                }
            } else if (path === 'timeline') {
                this.navigate('timeline');
            } else if (path === 'letters') {
                this.navigate('letters');
            } else if (path === 'readme') {
                this.openReadme();
            }
        });
    }

    generateBinaryBackground() {
        const canvas = this.el.binaryBg;
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth, h = window.innerHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
        ctx.font = '10px JetBrains Mono, monospace'; ctx.textBaseline = 'top';
        const charW = 8, charH = 12;

        const style = getComputedStyle(document.documentElement);
        const tertiaryRgb = style.getPropertyValue('--accent-tertiary-rgb').trim() || '189, 147, 249';
        const primaryRgb = style.getPropertyValue('--accent-primary-rgb').trim() || '100, 255, 218';

        for (let r = 0; r < Math.ceil(h / charH); r++) {
            for (let c = 0; c < Math.ceil(w / charW); c++) {
                if (Math.random() < 0.02) {
                    ctx.fillStyle = `rgba(${tertiaryRgb}, 0.2)`;
                    ctx.fillText('0123456789ABCDEF'[Math.floor(Math.random() * 16)], c * charW, r * charH);
                } else {
                    ctx.fillStyle = `rgba(${primaryRgb}, 0.15)`;
                    ctx.fillText(Math.random() > 0.5 ? '1' : '0', c * charW, r * charH);
                }
            }
        }
    }

    initCaesarWheels() {
        const html = document.querySelector('.caesar-wheel')?.innerHTML || '';
        ['top-left', 'bottom-right'].forEach(pos => {
            if (!document.querySelector('.caesar-wheel.' + pos)) {
                const w = document.createElement('div'); w.className = 'caesar-wheel ' + pos; w.innerHTML = html; document.body.appendChild(w);
            }
        });
    }
}

const app = new App();
app.init();
window.__app = app;
window.toggleTheme = () => app.theme.toggle();
