/**
 * 密钥博客 - OOP 架构
 * Author: Lighter (zhenith)
 */

(function() {
    'use strict';

    const CONFIG = { transitionDelay: 800, typewriterSpeed: 50, typewriterPause: 300 };

    class Crypto {
        static decryptAES(encryptedData, password) {
            try {
                const parts = encryptedData.split(':');
                if (parts.length !== 3) throw new Error('Invalid format');
                const salt = CryptoJS.enc.Hex.parse(parts[0]);
                const iv = CryptoJS.enc.Hex.parse(parts[1]);
                const ciphertext = CryptoJS.enc.Hex.parse(parts[2]);
                const key = CryptoJS.PBKDF2(password, salt, { keySize: 256/32, iterations: 100000, hasher: CryptoJS.algo.SHA256 });
                const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
                const decrypted = CryptoJS.AES.decrypt(cipherParams, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
                return decrypted.toString(CryptoJS.enc.Utf8);
            } catch (e) { return null; }
        }
    }

    class Theme {
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

    class MarkdownRenderer {
        static init() {
            marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
        }

        static render(content, targetElement, title) {
            if (!targetElement) return;

            let html = marked.parse(content);

            if (title && !/<h1[ >]/.test(html)) {
                html = `<h1>${escapeHtml(title)}</h1>` + html;
            }

            targetElement.innerHTML = html;
            targetElement.classList.add('markdown-body');

            if (typeof hljs !== 'undefined') {
                try { hljs.highlightAll(); } catch (e) {}
            }

            MarkdownRenderer.enhanceCodeBlocks(targetElement);
            MarkdownRenderer.addHeadingAnchors(targetElement);
            MarkdownRenderer.wrapTables(targetElement);
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

    class Navbar {
        constructor(app) {
            this.app = app;
            this.el = document.getElementById('globalNav');
            this.links = document.getElementById('navLinks');
            this.mobileMenu = document.getElementById('mobileMenu');
            this.mobileMenuBtn = document.getElementById('mobileMenuBtn');

            this.mobileMenuBtn?.addEventListener('click', () => this.mobileMenu?.classList.toggle('hidden'));
            document.addEventListener('click', e => {
                if (!this.mobileMenu?.contains(e.target) && !this.mobileMenuBtn?.contains(e.target)) {
                    this.mobileMenu?.classList.add('hidden');
                }
            });
            this.mobileMenu?.querySelectorAll('.mobile-nav-link').forEach(link => {
                link.addEventListener('click', () => this.mobileMenu?.classList.add('hidden'));
            });
        }

        updateActive(page) {
            this.links?.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.page === page);
            });
        }

        show() { this.el?.classList.remove('hidden'); }
        hide() { this.el?.classList.add('hidden'); }
    }

    class Typewriter {
        constructor() {
            this.overlay = document.getElementById('typewriterOverlay');
            this.textEl = document.getElementById('typewriterText');
            this.timer = null;
        }

        play(text, callback) {
            if (!this.overlay || !this.textEl) { callback?.(); return; }
            this.stop();
            this.overlay.classList.remove('hidden');
            this.textEl.textContent = '';
            let i = 0;
            this.timer = setInterval(() => {
                this.textEl.textContent += text[i];
                i++;
                if (i >= text.length) {
                    this.stop();
                    setTimeout(() => { this.overlay.classList.add('hidden'); callback?.(); }, CONFIG.typewriterPause);
                }
            }, CONFIG.typewriterSpeed);
        }

        stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
        hide() { this.stop(); this.overlay?.classList.add('hidden'); }
    }

    class MatrixRain {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas?.getContext('2d');
            this.animationId = null;
            this.chars = '01∅∆∇∈∉⊂⊃∀∃∂∫√∞≈≠≤≥+-×÷±';
            this.fontSize = 14;
            this.drops = [];
            this.accentColor = '#64ffda';
            this.bgColor = 'rgba(10, 10, 15, 0.05)';
            if (canvas) this.setupCanvas();
        }

        updateColors() {
            const style = getComputedStyle(document.documentElement);
            this.accentColor = style.getPropertyValue('--accent-primary').trim();
            const bgRgb = style.getPropertyValue('--bg-primary-rgb').trim() || '10, 10, 15';
            this.bgColor = `rgba(${bgRgb}, 0.05)`;
        }

        setupCanvas() {
            if (!this.canvas) return;
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.drops = Array(Math.floor(this.canvas.width / this.fontSize)).fill(1);
        }

        start() {
            if (!this.canvas || this.animationId) return;
            this.setupCanvas();
            this.updateColors();
            const draw = () => {
                this.ctx.fillStyle = this.bgColor;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = this.accentColor;
                this.ctx.font = this.fontSize + 'px JetBrains Mono, monospace';
                for (let i = 0; i < this.drops.length; i++) {
                    this.ctx.fillText(this.chars[Math.floor(Math.random() * this.chars.length)], i * this.fontSize, this.drops[i] * this.fontSize);
                    if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) this.drops[i] = 0;
                    this.drops[i]++;
                }
                this.animationId = requestAnimationFrame(draw);
            };
            draw();
        }

        stop() {
            if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
            if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    class ArticleReader {
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

            if (typeof renderMathInElement !== 'undefined') {
                try {
                    renderMathInElement(this.content, {
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
            if (article && typeof articles !== 'undefined') {
                this.createPostNavigation(article, articles);
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

    class Vault {
        constructor(app) {
            this.app = app;
            this.keyInput = document.getElementById('keyInput');
            this.submitBtn = document.getElementById('submitBtn');
            this.errorMsg = document.getElementById('errorMsg');
            this.successAnim = document.getElementById('successAnim');
            this.decryptionOverlay = document.getElementById('decryptionOverlay');
            this.decryptionStatus = document.getElementById('decryptionStatus');
            this.decryptionProgressBar = document.getElementById('decryptionProgressBar');
            this.decryptionRandomText = document.getElementById('decryptionRandomText');
            this.decryptionMatrix = document.getElementById('decryptionMatrix');
            this.animationToggleBtn = document.getElementById('animationToggleBtn');
            this.hintDisplay = document.getElementById('hintDisplay');
            this.isDecrypting = false;
            this.decryptionAnimInterval = null;
            this.matrixColumns = [];
            this.decryptionAnimationEnabled = localStorage.getItem('decryptionAnimationEnabled') !== 'false';
            this.initAnimationToggle();
        }

        initAnimationToggle() {
            if (this.animationToggleBtn) {
                if (this.decryptionAnimationEnabled) {
                    this.animationToggleBtn.classList.add('active');
                } else {
                    this.animationToggleBtn.classList.remove('active');
                }
                this.animationToggleBtn.addEventListener('click', () => this.toggleAnimation());
            }
        }

        toggleAnimation() {
            this.decryptionAnimationEnabled = !this.decryptionAnimationEnabled;
            localStorage.setItem('decryptionAnimationEnabled', this.decryptionAnimationEnabled);
            if (this.animationToggleBtn) {
                this.animationToggleBtn.classList.toggle('active', this.decryptionAnimationEnabled);
            }
        }

        async submit() {
            if (this.isDecrypting) return;
            const key = this.keyInput?.value.trim();
            if (!key) { this.showError('Please enter a key'); return; }

            this.isDecrypting = true;
            if (this.submitBtn) this.submitBtn.disabled = true;

            if (key !== 'aletheia') {
                this.showError('Access denied — invalid key');
                this.isDecrypting = false;
                if (this.submitBtn) this.submitBtn.disabled = false;
                return;
            }

            if (this.decryptionAnimationEnabled) {
                await this.playDecryptionAnimation();
            } else {
                await this.playSuccessAnimation();
            }

            sessionStorage.setItem('vaultUnlocked', 'true');

            this.app.navigate('articles');
            this.isDecrypting = false;
            if (this.submitBtn) this.submitBtn.disabled = false;
        }

        playSuccessAnimation() {
            return new Promise(resolve => {
                if (!this.successAnim) { resolve(); return; }

                this.successAnim.style.opacity = '1';
                this.successAnim.style.visibility = 'visible';
                this.successAnim.classList.remove('show');

                const rings = this.successAnim.querySelectorAll('.success-ring');
                
                rings.forEach((ring, i) => {
                    ring.style.opacity = '1';
                    const anim = ring.animate([
                        { width: '0', height: '0', opacity: 1, transform: 'translate(50px, 50px)' },
                        { width: '300px', height: '300px', opacity: 0, transform: 'translate(-50px, -50px)' }
                    ], {
                        duration: 800,
                        delay: i * 200,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                    anim.onfinish = () => {
                        ring.style.opacity = '0';
                    };
                });

                const totalDelay = 800 + (rings.length - 1) * 200;
                setTimeout(() => {
                    this.successAnim.style.opacity = '0';
                    this.successAnim.style.visibility = 'hidden';
                    resolve();
                }, totalDelay);
            });
        }

        reset() {
            this.isDecrypting = false;
            if (this.submitBtn) this.submitBtn.disabled = false;
            if (this.keyInput) this.keyInput.value = '';
            this.successAnim?.classList.remove('show');
            document.documentElement.style.setProperty('--reading-progress', '0%');
        }

        playDecryptionAnimation() {
            return new Promise((resolve) => {
                if (!this.decryptionOverlay) { resolve(); return; }
                this.decryptionOverlay.classList.remove('hidden');
                let progress = 0;
                const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?';

                this.createMatrixRain();

                const statusMessages = [
                    'Initializing decryption...',
                    'Loading encrypted data...',
                    'Verifying key hash...',
                    'Running PBKDF2 iterations...',
                    'Deriving AES key...',
                    'Decrypting blocks...',
                    'Validating checksum...',
                    'Almost done...'
                ];
                let messageIndex = 0;

                const updateRandomText = () => {
                    let text = '';
                    for (let i = 0; i < 200; i++) {
                        text += chars[Math.floor(Math.random() * chars.length)];
                    }
                    if (this.decryptionRandomText) {
                        this.decryptionRandomText.textContent = text;
                    }
                };

                this.decryptionAnimInterval = setInterval(() => {
                    progress += Math.random() * 3 + 1;
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(this.decryptionAnimInterval);
                        if (this.decryptionProgressBar) {
                            this.decryptionProgressBar.style.width = '100%';
                        }
                        if (this.decryptionStatus) {
                            this.decryptionStatus.textContent = 'Access Granted!';
                        }
                        setTimeout(() => {
                            this.decryptionOverlay?.classList.add('hidden');
                            this.cleanupMatrixRain();
                            if (this.decryptionProgressBar) {
                                this.decryptionProgressBar.style.width = '0%';
                            }
                            resolve();
                        }, 800);
                    } else {
                        if (this.decryptionProgressBar) {
                            this.decryptionProgressBar.style.width = progress + '%';
                        }
                        updateRandomText();

                        const newMessageIndex = Math.floor((progress / 100) * statusMessages.length);
                        if (newMessageIndex !== messageIndex && newMessageIndex < statusMessages.length) {
                            messageIndex = newMessageIndex;
                            if (this.decryptionStatus) {
                                this.decryptionStatus.textContent = statusMessages[messageIndex];
                            }
                        }
                    }
                }, 50);
            });
        }

        createMatrixRain() {
            if (!this.decryptionMatrix) return;
            this.decryptionMatrix.innerHTML = '';
            this.matrixColumns = [];

            const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
            const columnCount = Math.floor(window.innerWidth / 30);

            for (let i = 0; i < columnCount; i++) {
                const column = document.createElement('div');
                column.className = 'decryption-matrix-column';
                column.style.left = (i * 30) + 'px';
                column.style.animationDuration = (Math.random() * 3 + 2) + 's';
                column.style.animationDelay = (Math.random() * 2) + 's';

                let text = '';
                const charCount = Math.floor(Math.random() * 15) + 10;
                for (let j = 0; j < charCount; j++) {
                    text += chars[Math.floor(Math.random() * chars.length)] + '\n';
                }
                column.textContent = text;

                this.decryptionMatrix.appendChild(column);
                this.matrixColumns.push(column);
            }
        }

        cleanupMatrixRain() {
            if (this.decryptionMatrix) {
                this.decryptionMatrix.innerHTML = '';
            }
            this.matrixColumns = [];
        }

        showError(msg) { if (this.errorMsg) { this.errorMsg.querySelector('.error-text').textContent = msg; this.errorMsg.classList.add('show'); } }
        clearError() { this.errorMsg?.classList.remove('show'); }
    }

    class TimelineCanvas {
        constructor(containerId) {
            this.viewport = document.getElementById(containerId || 'canvasViewport');
            this.content = document.getElementById('canvasContent');

            this.scale = 1.0;
            this.translateX = 0;
            this.translateY = 0;
            this.minScale = 0.25;
            this.maxScale = 2.0;
            this.pixelsPerDay = 50;
            this.prevZoomLevel = 'card';

            this.isDragging = false;
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.lastTranslateX = 0;
            this.lastTranslateY = 0;

            this.zoomStep = 0.05;
            this.zoomAnimationDuration = 150;

            this.expandedNodes = new Set();
            this.selectedTopicIds = new Set();

            this.data = typeof timelineData !== 'undefined' ? timelineData : [];

            this.canvasWidth = 0;
            this.canvasHeight = 0;

            this.cardOverflowPadding = 0;

            this.nodePositions = new Map();

            this._boundOnMouseDown = this.onMouseDown.bind(this);
            this._boundOnMouseMove = this.onMouseMove.bind(this);
            this._boundOnMouseUp   = this.onMouseUp.bind(this);
            this._boundOnWheel     = this.onWheel.bind(this);
            this._boundOnKeyDown   = this.onKeyDown.bind(this);
            this._boundOnClickViewport = this.onClickViewport.bind(this);
            this._boundContextMenu = null;
            this._resizeTimer = null;
            this._boundOnResize = null;

            this._touchStartHandler = null;
            this._touchMoveHandler  = null;
            this._touchEndHandler   = null;

            this._controlClickHandlers = [];
            this._keyPanTimer = null;

            this.init();
        }

        init() {
            this.renderTimeline();
            this.bindEvents();
            this.updateTransform();
            this.initSearchBar();
            this.initLocateButton();
            this.updateTodayLabel();
            this.locateToToday();
        }

        renderTimeline() {
            if (!this.content || this.data.length === 0) {
                if (this.content) this.content.innerHTML = '<div class="timeline-empty">暂无学习记录</div>';
                return;
            }

            this.calculateCanvasSize();

            const canvas = document.createElement('div');
            canvas.className = 'timeline-canvas';
            canvas.style.width = this.canvasWidth + 'px';
            canvas.style.height = this.canvasHeight + 'px';

            var topicColors = ['#00ff88', '#7b8cde', '#bd93f9', '#ffb86c', '#ff79c6', '#50fa7b', '#8be9fd', '#f1fa8c'];
            var self = this;

            this.data.forEach(function(topic, topicIndex) {
                topic._color = topicColors[topicIndex % topicColors.length];
            });

            var barTopics = this.data.filter(function(t) { return !t._loose; });
            var barAreaHeight = barTopics.length > 0 ? barTopics.length * 36 + 20 : 10;

            var barLayer = document.createElement('div');
            barLayer.className = 'timeline-bar-layer';
            barLayer.style.height = barAreaHeight + 'px';
            canvas.appendChild(barLayer);

            var barIdx = 0;
            this.data.forEach(function(topic) {
                if (topic._loose) return;
                var bar = self.renderTopicBar(topic, barIdx);
                barLayer.appendChild(bar);
                barIdx++;
            });

            var timelineLine = document.createElement('div');
            timelineLine.className = 'timeline-main-line';
            timelineLine.style.top = (barAreaHeight + 30) + 'px';
            canvas.appendChild(timelineLine);

            var nodeLayer = document.createElement('div');
            nodeLayer.className = 'timeline-node-layer';
            nodeLayer.style.top = (barAreaHeight + 30) + 'px';
            nodeLayer.style.height = '40px';
            canvas.appendChild(nodeLayer);

            var tickLayer = document.createElement('div');
            tickLayer.className = 'timeline-tick-layer';
            tickLayer.style.top = (barAreaHeight + 74) + 'px';
            canvas.appendChild(tickLayer);
            this.renderTickLayer(tickLayer);

            var allNodes = [];

            var dateGroups = {};
            this.data.forEach(function(topic) {
                topic.entries.forEach(function(entry, entryIndex) {
                    if (!dateGroups[entry.date]) {
                        dateGroups[entry.date] = [];
                    }
                    dateGroups[entry.date].push({ topic: topic, entry: entry, entryIndex: entryIndex });
                });
            });

            Object.keys(dateGroups).sort().forEach(function(date) {
                var group = dateGroups[date];
                var node = self.renderNode(group);
                allNodes.push({ node: node, date: date });
            });

            allNodes.sort(function(a, b) { return a.date.localeCompare(b.date); });

            allNodes.forEach(function(item) {
                nodeLayer.appendChild(item.node);
            });

            this.content.innerHTML = '';
            this.content.appendChild(canvas);

            this.buildNodePositionMap();
            this.updateZoomLevel();
            this.updateTransform();
        }

        calculateCanvasSize() {
            if (this.data.length === 0) {
                this.canvasWidth = 2000;
                this.canvasHeight = 400;
                return;
            }

            var minDate = new Date('2026-01-01');
            var maxDate = new Date(0);

            this.data.forEach(function(topic) {
                var end = topic.end ? new Date(topic.end) : new Date();
                if (end > maxDate) maxDate = end;
            });

            var days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
            this.canvasWidth = Math.max(days * this.pixelsPerDay, 2000) + 400;

            var barCount = this.data.filter(function(t) { return !t._loose; }).length;
            var barAreaHeight = barCount > 0 ? barCount * 36 + 20 : 10;
            this.canvasHeight = barAreaHeight + 160 + this.cardOverflowPadding + 100;
        }

        renderTopicBar(topic, topicIndex) {
            var bar = document.createElement('div');
            bar.className = 'topic-bar';
            bar.style.top = (topicIndex * 36) + 'px';
            bar.style.background = topic._color;
            bar.dataset.topicId = topic.id;

            var label = document.createElement('span');
            label.className = 'topic-bar-label';
            label.textContent = topic.title;
            bar.appendChild(label);

            var startX = this.dateToX(topic.start);
            var endDate;
            if (topic.end) {
                endDate = topic.end;
            } else {
                endDate = new Date().toISOString().substring(0, 10);
                bar.classList.add('ongoing');
            }
            var endX = this.dateToX(endDate) + 20;
            bar.style.left = startX + 'px';
            bar.style.width = Math.max(endX - startX, 80) + 'px';

            var self = this;
            bar.addEventListener('click', function(e) {
                e.stopPropagation();
                var tid = bar.dataset.topicId;
                if (self.selectedTopicIds.has(tid)) {
                    self.selectedTopicIds.delete(tid);
                } else {
                    self.selectedTopicIds.add(tid);
                }
                self.applyTopicFilter();
            });

            return bar;
        }

        renderNode(group) {
            var first = group[0];
            var entry = first.entry;
            var topic = first.topic;

            var node = document.createElement('div');
            node.className = 'timeline-node';
            node.dataset.date = entry.date;

            var topicIdsInGroup = [];
            group.forEach(function(g) {
                topicIdsInGroup.push(g.topic.id);
            });
            node.dataset.topicIds = topicIdsInGroup.join(',');

            var x = this.dateToX(entry.date);
            node.style.left = x + 'px';

            var dot = document.createElement('div');
            dot.className = 'node-dot';

            if (group.length > 1) {
                dot.classList.add('merged');
            }

            var hasInsight = group.some(function(g) { return g.entry.isInsight; });
            if (hasInsight) {
                dot.classList.add('insight');
            }

            if (group.some(function(g) { return g.entry.date === g.topic.start; })) {
                dot.classList.add('milestone');
            }

            if (group.some(function(g) { return !g.topic.end && g.entryIndex === g.topic.entries.length - 1; })) {
                dot.classList.add('current');
            }

            dot.style.background = topic._color || 'var(--node-default)';
            if (hasInsight) {
                dot.style.background = '';
            }

            node.appendChild(dot);

            var dateLabel = document.createElement('div');
            dateLabel.className = 'node-date';
            dateLabel.textContent = this.formatDateForZoom(entry.date);
            node.appendChild(dateLabel);

            var card = this.renderCard(group);
            node.appendChild(card);

            node.dataset.pinned = 'false';

            dot.addEventListener('mouseenter', function(e) {
                e.stopPropagation();
                if (node.dataset.pinned !== 'true') {
                    node.classList.add('hover-expanded');
                }
            });

            dot.addEventListener('mouseleave', function() {
                if (node.dataset.pinned !== 'true') {
                    node.classList.remove('hover-expanded');
                }
            });

            var self = this;
            node.addEventListener('click', function(e) {
                if (e.button === 0) {
                    if (node.dataset.pinned === 'true') {
                        node.dataset.pinned = 'false';
                        node.classList.remove('expanded');
                        self.expandedNodes.delete(entry.date);
                        node.classList.remove('hover-expanded');
                    } else {
                        node.dataset.pinned = 'true';
                        node.classList.add('expanded');
                        node.classList.add('hover-expanded');
                        self.expandedNodes.add(entry.date);
                        self.checkCardOverflow();
                    }
                }
            });

            return node;
        }

        renderCard(group) {
            var card = document.createElement('div');
            card.className = 'node-card';

            var firstEntry = group[0].entry;

            var header = document.createElement('div');
            header.className = 'card-header';

            var date = document.createElement('span');
            date.className = 'card-date';
            date.textContent = firstEntry.date;
            header.appendChild(date);

            var closeBtn = document.createElement('button');
            closeBtn.className = 'card-close';
            closeBtn.innerHTML = '\u00D7';
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.collapseNode(firstEntry.date);
            }.bind(this));
            header.appendChild(closeBtn);

            card.appendChild(header);

            var content = document.createElement('div');
            content.className = 'card-content';

            group.forEach(function(g) {
                if (g.entry.isInsight) {
                    var insight = document.createElement('div');
                    insight.className = 'card-insight';
                    insight.innerHTML = '\uD83D\uDCA1 \u7075\u611f\u65f6\u523b';
                    content.appendChild(insight);
                }

                if (group.length > 1) {
                    var topicLabel = document.createElement('div');
                    topicLabel.className = 'card-topic-label';
                    topicLabel.textContent = g.topic.title;
                    content.appendChild(topicLabel);
                }

                var contentHtml = this.formatContent(g.entry.content);
                 var entryDiv = document.createElement('div');
                 entryDiv.className = 'card-entry';
                 entryDiv.innerHTML = contentHtml;
                 content.appendChild(entryDiv);
            }.bind(this));

            card.appendChild(content);

            var allTags = [];
            group.forEach(function(g) {
                if (g.entry.tags && g.entry.tags.length > 0) {
                    allTags = allTags.concat(g.entry.tags);
                }
                if (g.topic.tags && g.topic.tags.length > 0) {
                    allTags = allTags.concat(g.topic.tags);
                }
            });
            var uniqueTags = [];
            allTags.forEach(function(t) {
                if (uniqueTags.indexOf(t) === -1) uniqueTags.push(t);
            });

            if (uniqueTags.length > 0) {
                var tags = document.createElement('div');
                tags.className = 'card-tags';
                uniqueTags.forEach(function(tag) {
                    var tagEl = document.createElement('span');
                    tagEl.className = 'card-tag';
                    tagEl.textContent = '#' + tag;
                    tags.appendChild(tagEl);
                });
                card.appendChild(tags);
            }

            return card;
        }

        formatContent(content) {
            let formatted = content.replace(/\uD83D\uDCA1\s*/g, '');

            formatted = formatted.replace(/(^- .+\n?)+/gm, (match) => {
                const items = match.trim().split('\n').map(item =>
                    '<li>' + item.replace(/^- /, '') + '</li>'
                ).join('');
                return '<ul>' + items + '</ul>';
            });

            formatted = formatted.split('\n\n').map(block => {
                const trimmed = block.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('<ul>')) return trimmed;
                return '<p>' + trimmed + '</p>';
            }).join('');

            return formatted;
        }

        dateToX(dateStr) {
            if (this.data.length === 0) return 200;

            var date = new Date(dateStr);
            var minDate = new Date('2026-01-01');

            var daysSinceStart = Math.ceil((date - minDate) / (1000 * 60 * 60 * 24));
            return 200 + daysSinceStart * this.pixelsPerDay;
        }

        renderTickLayer(layer) {
            if (typeof renderedTicks === 'undefined') window.renderedTicks = [];
            layer.innerHTML = '';

            var allDates = [];
            this.data.forEach(function(topic) {
                topic.entries.forEach(function(e) { allDates.push(e.date); });
            });
            allDates.sort();

            var minDate = new Date('2026-01-01');
            var maxDate = new Date(allDates[allDates.length - 1]);

            var ticks = [];

            if (this.scale <= 0.3) {
                var startY = minDate.getFullYear();
                var endY = maxDate.getFullYear();
                for (var y = startY; y <= endY; y++) {
                    var pos = this.dateToX(y + '-01-01');
                    ticks.push({ x: pos, label: String(y), cls: 'tick-year' });
                }
            } else if (this.scale <= 0.6) {
                var y = minDate.getFullYear();
                var m = minDate.getMonth() + 1;
                var y2 = maxDate.getFullYear();
                var m2 = maxDate.getMonth() + 1;
                var currY = y, currM = m;
                while (currY < y2 || (currY === y2 && currM <= m2)) {
                    var mm = String(currM).padStart(2, '0');
                    var pos = this.dateToX(currY + '-' + mm + '-01');
                    ticks.push({ x: pos, label: currY + '/' + currM, cls: 'tick-month' });
                    currM++;
                    if (currM > 12) { currM = 1; currY++; }
                }
            }

            var self = this;
            ticks.forEach(function(t) {
                var el = document.createElement('span');
                el.className = 'tick-label ' + t.cls;
                el.textContent = t.label;
                el.style.left = t.x + 'px';
                layer.appendChild(el);
            });
        }

        updateTickLayer() {
            var layer = this.content.querySelector('.timeline-tick-layer');
            if (!layer) return;
            var barTopics = this.data.filter(function(t) { return !t._loose; });
            var barAreaHeight = barTopics.length > 0 ? barTopics.length * 36 + 20 : 10;
            layer.style.top = (barAreaHeight + 74) + 'px';
            this.renderTickLayer(layer);
        }

        formatDateForZoom(dateStr) {
            if (this.scale <= 0.3) {
                return '';
            }
            if (this.scale <= 0.6) {
                return '';
            }
            return dateStr;
        }

        bindEvents() {
            this.viewport.addEventListener('mousedown', this._boundOnMouseDown);
            document.addEventListener('mousemove', this._boundOnMouseMove);
            document.addEventListener('mouseup', this._boundOnMouseUp);
            this.viewport.addEventListener('click', this._boundOnClickViewport);

            this._boundContextMenu = (e) => { e.preventDefault(); };
            this.viewport.addEventListener('contextmenu', this._boundContextMenu);

            this.viewport.addEventListener('wheel', this._boundOnWheel, { passive: false });

            document.addEventListener('keydown', this._boundOnKeyDown);

            this._boundOnResize = this.debounce(() => {
                this.centerView();
            }, 200);
            window.addEventListener('resize', this._boundOnResize);

            this.initTouchGestures();
            this.bindControlEvents();
        }

        onMouseDown(e) {
            if (e.button === 2) {
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.lastTranslateX = this.translateX;
                this.lastTranslateY = this.translateY;
                this.viewport.style.cursor = 'grabbing';
                e.preventDefault();
            }
        }

        onMouseMove(e) {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;

            this.translateX = this.lastTranslateX + deltaX;
            this.translateY = this.lastTranslateY + deltaY;

            this.updateTransform();
        }

        onMouseUp(e) {
            if (e.button === 2) {
                this.isDragging = false;
                this.viewport.style.cursor = 'grab';
            }
        }

        onWheel(e) {
            e.preventDefault();

            if (e.metaKey || e.ctrlKey) {
                var delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
                var newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));

                if (newScale !== this.scale) {
                    var rect = this.viewport.getBoundingClientRect();
                    var mouseX = e.clientX - rect.left;
                    var oldCanvasX = mouseX - this.translateX;
                    var oldPpd = this.pixelsPerDay;
                    var daysFromStart = (oldCanvasX - 200) / oldPpd;

                    this.scale = newScale;
                    this.pixelsPerDay = Math.round(50 * Math.pow(this.scale, 1.3));
                    this.updateZoomLevel();

                    var self = this;
                    if (this._zoomRAF) cancelAnimationFrame(this._zoomRAF);
                    this._zoomRAF = requestAnimationFrame(function() {
                        self.calculateCanvasSize();
                        var canvas = self.content.querySelector('.timeline-canvas');
                        if (canvas) {
                            canvas.style.width = self.canvasWidth + 'px';
                            canvas.style.height = self.canvasHeight + 'px';
                        }
                        repositionDOM(self);
                        var newAnchorX = 200 + daysFromStart * self.pixelsPerDay;
                        self.translateX = mouseX - newAnchorX;
                        self.updateTransform();
                    });

                    this.updateZoomUI();
                }
            } else {
                this.translateX -= e.deltaX;
                this.translateY -= e.deltaY;
                this.updateTransform();
            }
        }

        repositionAll() {
            if (this.data.length === 0) return;
            this.calculateCanvasSize();
            var canvas = this.content.querySelector('.timeline-canvas');
            if (canvas) {
                canvas.style.width = this.canvasWidth + 'px';
                canvas.style.height = this.canvasHeight + 'px';
            }
            repositionDOM(this);
            this.buildNodePositionMap();
            this.updateZoomLevel();
            this.updateTransform();
        }

        setScale(newScale, animate) {
            var rect = this.viewport.getBoundingClientRect();
            var centerX = rect.width / 2;
            var oldCanvasX = centerX - this.translateX;
            var oldPpd = this.pixelsPerDay;
            var daysFromStart = (oldCanvasX - 200) / oldPpd;
            var mouseX = centerX;

            this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
            this.pixelsPerDay = Math.round(50 * Math.pow(this.scale, 1.3));
            this.updateZoomLevel();

            var self = this;
            if (this._zoomRAF) cancelAnimationFrame(this._zoomRAF);
            this._zoomRAF = requestAnimationFrame(function() {
                self.calculateCanvasSize();
                var canvas = self.content.querySelector('.timeline-canvas');
                if (canvas) {
                    canvas.style.width = self.canvasWidth + 'px';
                    canvas.style.height = self.canvasHeight + 'px';
                }
                repositionDOM(self);
                var newAnchorX = 200 + daysFromStart * self.pixelsPerDay;
                self.translateX = mouseX - newAnchorX;
                self.updateTransform();
            });

            this.updateZoomUI();
        }

        updateTransform() {
            this.clampTranslate();
            this.content.style.transform = 'translate(' + this.translateX + 'px, ' + this.translateY + 'px)';
            this.updateBarLabels();
        }

        clampTranslate() {
            if (!this.viewport) return;
            var vpRect = this.viewport.getBoundingClientRect();
            var vpW = vpRect.width;
            var vpH = vpRect.height;

            var canvasW = this.canvasWidth;
            var canvasH = this.canvasHeight;

            var minTx = Math.min(0, vpW - canvasW - 200);
            var maxTx = 200;
            this.translateX = Math.max(minTx, Math.min(maxTx, this.translateX));

            var minTy = Math.min(0, vpH - canvasH);
            var maxTy = 0;
            this.translateY = Math.max(minTy, Math.min(maxTy, this.translateY));
        }

        updateBarLabels() {
            if (!this.viewport) return;
            var vpRect = this.viewport.getBoundingClientRect();
            var vpLeft = -this.translateX;
            var vpRight = vpLeft + vpRect.width;

            var self = this;
            this.content.querySelectorAll('.topic-bar').forEach(function(bar) {
                var label = bar.querySelector('.topic-bar-label');
                if (!label) return;
                label.style.transform = '';
                label.style.paddingLeft = '';

                var barLeft = parseFloat(bar.style.left);
                var barWidth = parseFloat(bar.style.width);
                var barRight = barLeft + barWidth;
                if (barWidth <= 0) return;

                if (barRight < vpLeft || barLeft > vpRight) return;

                var paddingLeftPx = 12;
                if (barLeft < vpLeft) {
                    var shift = vpLeft - barLeft;
                    label.style.paddingLeft = (paddingLeftPx + shift) + 'px';
                }
            });
        }

        onClickViewport(e) {
            if (e.button !== 0) return;
            var target = e.target;
            while (target && target !== this.viewport) {
                if (target.classList.contains('topic-bar') || target.classList.contains('timeline-node')) {
                    return;
                }
                target = target.parentElement;
            }
            this.clearTopicFilter();
        }

        applyTopicFilter() {
            var self = this;
            this.content.querySelectorAll('.timeline-node').forEach(function(node) {
                var ids = (node.dataset.topicIds || '').split(',');
                if (self.selectedTopicIds.size === 0) {
                    node.classList.remove('dimmed');
                } else {
                    var match = ids.some(function(id) { return self.selectedTopicIds.has(id); });
                    if (match) {
                        node.classList.remove('dimmed');
                    } else {
                        node.classList.add('dimmed');
                    }
                }
            });
            this.content.querySelectorAll('.topic-bar').forEach(function(bar) {
                var tid = bar.dataset.topicId;
                if (self.selectedTopicIds.has(tid)) {
                    bar.classList.add('selected');
                } else {
                    bar.classList.remove('selected');
                    bar.style.animation = 'none';
                    bar.style.opacity = '0.85';
                }
            });
        }

        clearTopicFilter() {
            this.selectedTopicIds.clear();
            this.applyTopicFilter();
        }

        updateZoomLevel() {
            var level = 'card';
            if (this.scale <= 0.3) level = 'overview';
            else if (this.scale <= 0.6) level = 'mini';
            else if (this.scale >= 1.2) level = 'full';

            this.content.dataset.zoom = level;
        }

        updateZoomUI() {
            var slider = document.getElementById('zoomSlider');
            if (slider) {
                slider.value = this.scale * 100;
            }

            var valueEl = document.getElementById('zoomValue');
            if (valueEl) {
                valueEl.textContent = Math.round(this.scale * 100) + '%';
            }
        }

        debounce(fn, delay) {
            var self = this;
            return function() {
                var args = arguments;
                clearTimeout(self._resizeTimer);
                self._resizeTimer = setTimeout(function() {
                    fn.apply(self, args);
                }, delay);
            };
        }

        initTouchGestures() {
            var self = this;
            var lastTouchDistance = 0;

            this._touchStartHandler = function(e) {
                if (e.touches.length === 2) {
                    e.preventDefault();
                    var t1 = e.touches[0];
                    var t2 = e.touches[1];
                    lastTouchDistance = Math.hypot(
                        t2.clientX - t1.clientX,
                        t2.clientY - t1.clientY
                    );
                }
            };
            this.viewport.addEventListener('touchstart', this._touchStartHandler, { passive: false });

            this._touchMoveHandler = function(e) {
                if (e.touches.length === 2) {
                    e.preventDefault();

                    var t1 = e.touches[0];
                    var t2 = e.touches[1];

                    var distance = Math.hypot(
                        t2.clientX - t1.clientX,
                        t2.clientY - t1.clientY
                    );

                    var center = {
                        x: (t1.clientX + t2.clientX) / 2,
                        y: (t1.clientY + t2.clientY) / 2
                    };

                    if (lastTouchDistance > 0) {
                        var scaleDelta = distance / lastTouchDistance;
                        var newScale = Math.max(
                            self.minScale,
                            Math.min(self.maxScale, self.scale * scaleDelta)
                        );

                        if (newScale !== self.scale) {
                            var rect = self.viewport.getBoundingClientRect();
                            var tx = center.x - rect.left;
                            var oldCanvasX = tx - self.translateX;
                            var oldPpd = self.pixelsPerDay;
                            var daysFromStart = (oldCanvasX - 200) / oldPpd;

                            self.scale = newScale;
                            self.pixelsPerDay = Math.round(50 * Math.pow(self.scale, 1.3));
                            self.updateZoomLevel();

                            if (self._zoomRAF) cancelAnimationFrame(self._zoomRAF);
                            self._zoomRAF = requestAnimationFrame(function() {
                                self.calculateCanvasSize();
                                var canvas2 = self.content.querySelector('.timeline-canvas');
                                if (canvas2) {
                                    canvas2.style.width = self.canvasWidth + 'px';
                                    canvas2.style.height = self.canvasHeight + 'px';
                                }
                                repositionDOM(self);
                                var newAnchorX = 200 + daysFromStart * self.pixelsPerDay;
                                self.translateX = tx - newAnchorX;
                                self.updateTransform();
                            });
                            self.updateZoomUI();
                        }
                    }

                    lastTouchDistance = distance;
                }
            };
            this.viewport.addEventListener('touchmove', this._touchMoveHandler, { passive: false });

            this._touchEndHandler = function() {
                lastTouchDistance = 0;
            };
            this.viewport.addEventListener('touchend', this._touchEndHandler);
        }

        toggleNode(node, date) {
            if (this.expandedNodes.has(date)) {
                this.collapseNode(date);
            } else {
                this.expandNode(node, date);
            }
        }

        expandNode(node, date) {
            node.classList.add('expanded');
            node.classList.add('hover-expanded');
            node.dataset.pinned = 'true';
            this.expandedNodes.add(date);
            this.checkCardOverflow();
        }

        expandAll() {
            this.expandedNodes.clear();
            var self = this;
            this.content.querySelectorAll('.timeline-node').forEach(function(node) {
                node.classList.add('expanded');
                node.classList.add('hover-expanded');
                node.dataset.pinned = 'true';
                self.expandedNodes.add(node.dataset.date);
            });
            this.checkCardOverflow();
        }

        collapseNode(date) {
            var node = this.content.querySelector('.timeline-node[data-date="' + date + '"]');
            if (!node) return;
            node.classList.remove('expanded');
            node.classList.remove('hover-expanded');
            node.dataset.pinned = 'false';
            this.expandedNodes.delete(date);
        }

        collapseAll() {
            this.content.querySelectorAll('.timeline-node.expanded').forEach(function(node) {
                node.classList.remove('expanded');
                node.classList.remove('hover-expanded');
                node.dataset.pinned = 'false';
            });
            this.expandedNodes.clear();
            this.cardOverflowPadding = 0;
            var barCount = this.data.filter(function(t) { return !t._loose; }).length;
            var barAreaHeight = barCount > 0 ? barCount * 36 + 20 : 10;
            this.canvasHeight = barAreaHeight + 160 + this.cardOverflowPadding + 100;
            var canvas = this.content.querySelector('.timeline-canvas');
            if (canvas) canvas.style.height = this.canvasHeight + 'px';
            this.clampTranslate();
            this.updateTransform();
        }

        checkCardOverflow() {
            var self = this;
            requestAnimationFrame(function() {
                var canvas = self.content.querySelector('.timeline-canvas');
                if (!canvas) return;

                var maxCardBottom = 0;

                self.content.querySelectorAll('.timeline-node.expanded .node-card').forEach(function(card) {
                    var cardRect = card.getBoundingClientRect();
                    var canvasRect = canvas.getBoundingClientRect();
                    var cardBottomInCanvas = cardRect.bottom - canvasRect.bottom;
                    if (cardBottomInCanvas > 0) {
                        maxCardBottom = Math.max(maxCardBottom, cardBottomInCanvas);
                    }
                });

                if (maxCardBottom > self.cardOverflowPadding) {
                    self.cardOverflowPadding = maxCardBottom + 20;
                    self.canvasHeight = self.canvasHeight + (self.cardOverflowPadding > 0 ? self.cardOverflowPadding : 0);
                    var barCount = self.data.filter(function(t) { return !t._loose; }).length;
                    var barAreaHeight = barCount > 0 ? barCount * 36 + 20 : 10;
                    self.canvasHeight = barAreaHeight + 160 + self.cardOverflowPadding + 100;
                    canvas.style.height = self.canvasHeight + 'px';
                    self.clampTranslate();
                    self.updateTransform();
                }
            });
        }

        bindControlEvents() {
            var self = this;

            var expandAllBtn = document.getElementById('expandAllBtn');
            if (expandAllBtn) {
                var expandHandler = function() { self.expandAll(); };
                expandAllBtn.addEventListener('click', expandHandler);
                this._controlClickHandlers.push({ el: expandAllBtn, handler: expandHandler });
            }

            var collapseAllBtn = document.getElementById('collapseAllBtn');
            if (collapseAllBtn) {
                var collapseHandler = function() { self.collapseAll(); };
                collapseAllBtn.addEventListener('click', collapseHandler);
                this._controlClickHandlers.push({ el: collapseAllBtn, handler: collapseHandler });
            }

            var tipsBtn = document.getElementById('tipsBtn');
            var tipsOverlay = document.getElementById('tipsOverlay');
            var tipsClose = tipsOverlay ? tipsOverlay.querySelector('.tips-close') : null;
            if (tipsBtn && tipsOverlay) {
                tipsBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    tipsOverlay.classList.add('visible');
                });
                tipsOverlay.addEventListener('click', function(e) {
                    if (e.target === tipsOverlay) {
                        tipsOverlay.classList.remove('visible');
                    }
                });
                if (tipsClose) {
                    tipsClose.addEventListener('click', function() {
                        tipsOverlay.classList.remove('visible');
                    });
                }
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && tipsOverlay.classList.contains('visible')) {
                        tipsOverlay.classList.remove('visible');
                    }
                });
            }

            var zoomSlider = document.getElementById('zoomSlider');
            if (zoomSlider) {
                var sliderHandler = function(e) {
                    self.setScale(parseInt(e.target.value, 10) / 100, true);
                };
                zoomSlider.addEventListener('input', sliderHandler);
                this._controlClickHandlers.push({ el: zoomSlider, handler: sliderHandler });
            }
        }

        initLocateButton() {
            var self = this;
            var locateBtn = document.getElementById('locateBtn');
            if (!locateBtn) return;

            locateBtn.addEventListener('click', function() {
                self.locateToToday();
            });
        }

        updateTodayLabel() {
            var el = document.getElementById('timelineToday');
            if (el) {
                var now = new Date();
                var y = now.getFullYear();
                var m = String(now.getMonth() + 1).padStart(2, '0');
                var d = String(now.getDate()).padStart(2, '0');
                var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                var w = weekdays[now.getDay()];
                el.textContent = '📅 ' + y + '年' + m + '月' + d + '日 星期' + w;
            }
            var tbtn = document.getElementById('timelineThemeToggle');
            if (tbtn) {
                var t = document.documentElement.getAttribute('data-theme') || 'dark';
                tbtn.textContent = t === 'dark' ? '◐' : '◑';
            }
        }

        locateToToday() {
            var locateBtn = document.getElementById('locateBtn');
            if (!locateBtn) return;

            locateBtn.classList.add('locating');

            var today = new Date().toISOString().split('T')[0];

            var targetDate = null;
            var minDiff = Infinity;

            this.nodePositions.forEach(function(pos, date) {
                var diff = Math.abs(new Date(today) - new Date(date));
                if (diff < minDiff) {
                    minDiff = diff;
                    targetDate = date;
                }
            });

            if (targetDate) {
                this.jumpToDate(targetDate, true);
            }

            setTimeout(function() {
                locateBtn.classList.remove('locating');
            }, 800);
        }

        initSearchBar() {
            var self = this;
            var yearSelect = document.getElementById('yearSelect');
            var monthSelect = document.getElementById('monthSelect');
            var daySelect = document.getElementById('daySelect');
            var jumpBtn = document.getElementById('jumpBtn');

            if (!yearSelect) return;

            var years = this.getAvailableYears();
            years.forEach(function(year) {
                var option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });

            yearSelect.addEventListener('change', function() {
                self.updateMonths(yearSelect.value);
                daySelect.innerHTML = '<option value="">日期</option>';
            });

            monthSelect.addEventListener('change', function() {
                self.updateDays(yearSelect.value, monthSelect.value);
            });

            if (jumpBtn) {
                jumpBtn.addEventListener('click', function() {
                    var year = yearSelect.value;
                    var month = monthSelect.value;
                    var day = daySelect.value;

                    var targetDate = '';
                    if (day) {
                        targetDate = year + '-' + month + '-' + day;
                    } else if (month) {
                        targetDate = year + '-' + month + '-01';
                    } else if (year) {
                        targetDate = year + '-01-01';
                    }

                    if (targetDate) {
                        self.jumpToDate(targetDate, true);
                    }
                });
            }
        }

        getAvailableYears() {
            var years = new Set();

            this.data.forEach(function(topic) {
                topic.entries.forEach(function(entry) {
                    years.add(entry.date.substring(0, 4));
                });
            });

            return Array.from(years).sort();
        }

        updateMonths(year) {
            var monthSelect = document.getElementById('monthSelect');
            if (!monthSelect) return;

            monthSelect.innerHTML = '<option value="">月份</option>';

            if (!year) return;

            var months = new Set();
            var prefix = year + '-';

            this.data.forEach(function(topic) {
                topic.entries.forEach(function(entry) {
                    if (entry.date.startsWith(prefix)) {
                        months.add(entry.date.substring(5, 7));
                    }
                });
            });

            Array.from(months).sort().forEach(function(month) {
                var option = document.createElement('option');
                option.value = month;
                option.textContent = month + '月';
                monthSelect.appendChild(option);
            });
        }

        updateDays(year, month) {
            var daySelect = document.getElementById('daySelect');
            if (!daySelect) return;

            daySelect.innerHTML = '<option value="">日期</option>';

            if (!year || !month) return;

            var prefix = year + '-' + month + '-';
            var days = new Set();

            this.data.forEach(function(topic) {
                topic.entries.forEach(function(entry) {
                    if (entry.date.startsWith(prefix)) {
                        days.add(entry.date.substring(8, 10));
                    }
                });
            });

            Array.from(days).sort().forEach(function(day) {
                var option = document.createElement('option');
                option.value = day;
                option.textContent = day + '日';
                daySelect.appendChild(option);
            });
        }

        jumpToDate(dateStr, animate) {
            var position = this.nodePositions.get(dateStr);

            if (!position) {
                return;
            }

            var rect = this.viewport.getBoundingClientRect();

            if (animate) {
                this.content.classList.add('animate-jump');
            }

            this.translateX = rect.width / 2 - position.x;
            this.translateY = rect.height / 2 - position.y;

            this.updateTransform();

            if (animate) {
                var self = this;
                setTimeout(function() {
                    self.content.classList.remove('animate-jump');
                }, 400);
            }
        }

        buildNodePositionMap() {
            this.nodePositions.clear();

            var barCount = this.data.filter(function(t) { return !t._loose; }).length;
            var barAreaHeight = barCount > 0 ? barCount * 36 + 20 : 10;
            var self = this;
            this.content.querySelectorAll('.timeline-node').forEach(function(node) {
                var date = node.dataset.date;
                var x = parseFloat(node.style.left);
                var y = barAreaHeight + 30;

                self.nodePositions.set(date, { x: x, y: y });
            });
        }

        centerView() {
            var rect = this.viewport.getBoundingClientRect();

            this.translateX = (rect.width - this.canvasWidth) / 2;
            this.translateY = (rect.height - this.canvasHeight) / 2;

            this.updateTransform();
        }

        _smoothPan() {
            this.content.classList.add('smooth-zoom');
            var self = this;
            clearTimeout(this._keyPanTimer);
            this._keyPanTimer = setTimeout(function() {
                self.content.classList.remove('smooth-zoom');
            }, 160);
        }

        onKeyDown(e) {
            var page = document.getElementById('timelinePage');
            if (!page || page.classList.contains('hidden')) return;

            var PAN_STEP = 80;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.translateX += PAN_STEP;
                    this._smoothPan();
                    this.updateTransform();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.translateX -= PAN_STEP;
                    this._smoothPan();
                    this.updateTransform();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.translateY -= PAN_STEP;
                    this._smoothPan();
                    this.updateTransform();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.translateY += PAN_STEP;
                    this._smoothPan();
                    this.updateTransform();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.setScale(this.scale + this.zoomStep, true);
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.setScale(this.scale - this.zoomStep, true);
                    break;
                case '0':
                    e.preventDefault();
                    this.setScale(1.0, true);
                    break;
            }
        }

        destroy() {
            document.removeEventListener('mousemove', this._boundOnMouseMove);
            document.removeEventListener('mouseup', this._boundOnMouseUp);
            document.removeEventListener('keydown', this._boundOnKeyDown);

            if (this.viewport) {
                this.viewport.removeEventListener('mousedown', this._boundOnMouseDown);
                this.viewport.removeEventListener('wheel', this._boundOnWheel);

                if (this._boundContextMenu) {
                    this.viewport.removeEventListener('contextmenu', this._boundContextMenu);
                }
            }

            if (this._boundOnResize) {
                window.removeEventListener('resize', this._boundOnResize);
                this._boundOnResize = null;
            }
            clearTimeout(this._resizeTimer);

            if (this.viewport) {
                if (this._touchStartHandler) {
                    this.viewport.removeEventListener('touchstart', this._touchStartHandler);
                    this._touchStartHandler = null;
                }
                if (this._touchMoveHandler) {
                    this.viewport.removeEventListener('touchmove', this._touchMoveHandler);
                    this._touchMoveHandler = null;
                }
                if (this._touchEndHandler) {
                    this.viewport.removeEventListener('touchend', this._touchEndHandler);
                    this._touchEndHandler = null;
                }
            }

            this._controlClickHandlers.forEach(function(item) {
                if (item.el) item.el.removeEventListener('click', item.handler);
            });
            this._controlClickHandlers = [];

            this.expandedNodes.clear();
            this.nodePositions.clear();
        }
    }

    function repositionDOM(self) {
        var barTopics = self.data.filter(function(t) { return !t._loose; });
        var barAreaHeight = barTopics.length > 0 ? barTopics.length * 36 + 20 : 10;

        var timelineLine = self.content.querySelector('.timeline-main-line');
        if (timelineLine) timelineLine.style.top = (barAreaHeight + 30) + 'px';

        var nodeLayer = self.content.querySelector('.timeline-node-layer');
        if (nodeLayer) nodeLayer.style.top = (barAreaHeight + 30) + 'px';

        self.content.querySelectorAll('.topic-bar').forEach(function(bar) {
            var topicId = bar.dataset.topicId;
            var topic = self.data.find(function(t) { return t.id === topicId; });
            if (!topic) return;
            var startX = self.dateToX(topic.start);
            var endDate;
            if (topic.end) {
                endDate = topic.end;
            } else {
                endDate = new Date().toISOString().substring(0, 10);
                bar.classList.add('ongoing');
            }
            var endX = self.dateToX(endDate) + 20;
            bar.style.left = startX + 'px';
            bar.style.width = Math.max(endX - startX, 80) + 'px';
        });

        self.content.querySelectorAll('.timeline-node').forEach(function(node) {
            var d = node.dataset.date;
            var x = self.dateToX(d);
            node.style.left = x + 'px';
            var dateLabel = node.querySelector('.node-date');
            if (dateLabel) dateLabel.textContent = self.formatDateForZoom(d);
        });

        self.buildNodePositionMap();
        self.updateTickLayer();
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
            this.typewriter = new Typewriter();
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
            return path.replace(/^\//, '') || 'home';
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
                if (!sessionStorage.getItem('vaultUnlocked')) {
                    history.pushState(null, '', '/vault');
                    this.navigate('vault');
                    return;
                }
                const id = path.replace('article/', '');
                const article = typeof articles !== 'undefined' ? articles.find(a => a.id === id) : null;
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
                const article = typeof articles !== 'undefined' ? articles.find(a => a.id === id) : null;
                if (article) {
                    if (sessionStorage.getItem('vaultUnlocked')) {
                        this.openBlogArticle(article);
                    } else {
                        this.navigate('vault');
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
                const article = typeof articles !== 'undefined' ? articles.find(a => a.id === id) : null;
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
                    if (this.vault.hintDisplay) {
                        this.vault.hintDisplay.textContent = 'truth is an event';
                    }
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
            const tagFilter = document.getElementById('tagFilter');
            if (!tagFilter) return;

            this.currentTags.clear();
            this.currentFilterMode = 'or';

            const allTags = getAllTags();
            tagFilter.innerHTML = '<button class="tag-btn active" data-tag="all">全部</button>' +
                allTags.map(tag => `<button class="tag-btn" data-tag="${tag}">#${tag}</button>`).join('');

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

            let filtered = typeof articles !== 'undefined' ? [...articles] : [];

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
                    const contentMatch = (a.content || '').toLowerCase().includes(q);
                    return titleMatch || tagMatch || contentMatch;
                });
            }

            filtered = this.sortArticles(filtered, this.currentSortField, this.currentSortDir);
            this.applySortIndicator();

            const fs = document.getElementById('filterStatus');
            if (fs) {
                if (tags.size > 0) {
                    fs.innerHTML = `已选 ${tags.size} 个 · <span class="filter-mode-toggle"><span class="mode-option${this.currentFilterMode === 'or' ? ' active' : ''}" data-mode="or">OR</span><span class="mode-option${this.currentFilterMode === 'and' ? ' active' : ''}" data-mode="and">AND</span></span> · <span class="clear-filters">清除</span>`;
                    fs.style.display = 'flex';
                    fs.querySelector('.clear-filters')?.addEventListener('click', () => {
                        this.currentTags.clear();
                        this.clearTagSelection();
                        const sb = document.querySelector('#articles .search-box');
                        this.renderFilteredArticles(sb?.value || '');
                    });
                    fs.querySelector('.filter-mode-toggle')?.addEventListener('click', (e) => {
                        const opt = e.target.closest('.mode-option');
                        if (!opt) return;
                        this.currentFilterMode = opt.dataset.mode;
                        const sb = document.querySelector('#articles .search-box');
                        this.renderFilteredArticles(sb?.value || '');
                    });
                } else {
                    fs.style.display = 'none';
                }
            }

            if (filtered.length === 0) {
                const emptyEl = document.getElementById('articlesEmpty');
                if (emptyEl) emptyEl.innerHTML = '<div class="no-results">grep: 无匹配</div>';
                list.innerHTML = '';
                return;
            }

            const emptyEl = document.getElementById('articlesEmpty');
            if (emptyEl) emptyEl.innerHTML = '';
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

        clearTagSelection() {
            const tf = document.getElementById('tagFilter');
            if (!tf) return;
            const allBtn = tf.querySelector('[data-tag="all"]');
            tf.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active', 'selected'));
            if (allBtn) allBtn.classList.add('active');
        }

        openBlogArticle(articleOrId) {
            const article = typeof articleOrId === 'object' ? articleOrId
                : (typeof articles !== 'undefined' ? articles.find(a => a.id === articleOrId) : null);
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
                    history.pushState({ articleId: article.id }, '', '/article/' + encodeURIComponent(article.id));
                }
            });
        }

        openReadme() {
            const readme = typeof articles !== 'undefined' ? articles.find(a => a.id === 'readme') : null;
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

            const tagFilter = document.getElementById('tagFilter');
            tagFilter?.addEventListener('click', (e) => {
                const btn = e.target.closest('.tag-btn');
                if (!btn) return;
                const tagName = btn.dataset.tag;

                if (tagName === 'all') {
                    this.currentTags.clear();
                    this.clearTagSelection();
                } else {
                    if (this.currentTags.has(tagName)) {
                        this.currentTags.delete(tagName);
                        btn.classList.remove('selected');
                    } else {
                        this.currentTags.add(tagName);
                        btn.classList.add('selected');
                    }
                    const activeBtns = tagFilter.querySelectorAll('.tag-btn.selected');
                    if (activeBtns.length === 0 || this.currentTags.size === 0) {
                        const allBtn = tagFilter.querySelector('[data-tag="all"]');
                        if (allBtn) allBtn.classList.add('active');
                    } else {
                        const allBtn = tagFilter.querySelector('[data-tag="all"]');
                        if (allBtn) allBtn.classList.remove('active');
                    }
                }
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
                    const tf = document.getElementById('tagFilter');
                    if (tf) {
                        tf.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active', 'selected'));
                        const allBtn = tf.querySelector('[data-tag="all"]');
                        if (allBtn) allBtn.classList.remove('active');
                        const targetBtn = tf.querySelector(`[data-tag="${tagName}"]`);
                        if (targetBtn) targetBtn.classList.add('selected');
                    }
                    const sb = document.querySelector('#articles .search-box');
                    this.renderFilteredArticles(sb?.value || '');
                    return;
                }

                if (row) {
                    const articleId = row.dataset.id;
                    const article = typeof articles !== 'undefined' ? articles.find(a => a.id === articleId) : null;
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

    class LettersPage {
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

            return (typeof articles !== 'undefined' ? articles : [])
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
            const article = articles.find(a => a.id === articleId);
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

    function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function formatDate(s) { if (!s) return ''; const d = new Date(s); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

    function getAllTags() {
        const tagSet = new Set();
        if (typeof articles !== 'undefined') {
            articles.forEach(a => (a.tags || []).forEach(t => tagSet.add(t)));
        }
        return [...tagSet].sort();
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => new App().init()); }
    else { new App().init(); }
})();
