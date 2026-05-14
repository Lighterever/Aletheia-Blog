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

                if (lang) {
                    const label = document.createElement('span');
                    label.className = 'code-lang-label';
                    label.textContent = lang;
                    pre.appendChild(label);
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);

                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.innerHTML = '\u2398';
                copyBtn.title = 'Copy code';
                copyBtn.addEventListener('click', () => {
                    const codeText = code.textContent;
                    navigator.clipboard.writeText(codeText).then(() => {
                        copyBtn.classList.add('copied');
                        copyBtn.innerHTML = '\u2713';
                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                            copyBtn.innerHTML = '\u2398';
                        }, 2000);
                    }).catch(() => {
                        copyBtn.textContent = 'Err';
                    });
                });
                wrapper.appendChild(copyBtn);
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
            const tagsStr = (article.tags || []).map(t => '#' + t).join(' ');

            const metaEl = document.getElementById('articleMeta');
            if (metaEl) {
                metaEl.textContent = dateStr + ' · ' + tagsStr;
            }

            MarkdownRenderer.render(article.content, this.content, article.title);

            this.setupArticle();

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

        setupArticle() {
            this.addHeadingIds();
            this.generateToc();
            this.createFabs();
            window.scrollTo(0, 0);
            document.documentElement.style.setProperty('--reading-progress', '0%');
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
        hide() { this.closeToc(); this.removeFabs(); this.reader?.classList.add('hidden'); }
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

    class App {
        constructor() {
            this.pages = {
                home: document.getElementById('homePage'),
                articles: document.getElementById('articles'),
                vault: document.getElementById('vaultPage'),
                encrypted_list: document.getElementById('articlesContainer'),
                article_reader: document.getElementById('articleReader')
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
            this.currentTag = 'all';
            this.readerReturnPage = 'home';

            this.theme = new Theme(this);
            this.navbar = new Navbar(this);
            this.typewriter = new Typewriter();
            this.articleReader = new ArticleReader();
            this.vault = new Vault(this);
            this.matrixRain = new MatrixRain(this.el.matrixRainEl);

            this.articleReader.onBackClick = () => this.goBackFromReader();
        }

        init() {
            this.generateBinaryBackground();
            this.initCaesarWheels();
            this.bindEvents();
            MarkdownRenderer.init();

            const hash = (window.location.hash || '#home').replace('#', '');
            this.navigate(hash);

            window.addEventListener('hashchange', () => {
                if (this.currentPage === 'article_reader') return;
                this.navigate((window.location.hash || '#home').replace('#', ''));
            });
            window.addEventListener('scroll', () => this.updateReadingProgress(), { passive: true });
            window.addEventListener('resize', () => this.generateBinaryBackground());
        }

        onThemeChanged() {
            this.matrixRain?.updateColors();
            this.generateBinaryBackground();
            this.initCaesarWheels();
        }

        navigate(page) {
            if (page === 'readme') {
                this.openReadme();
                return;
            }
            if (page.startsWith('article/')) {
                if (!sessionStorage.getItem('vaultUnlocked')) {
                    window.location.hash = '#vault';
                    this.navigate('vault');
                    return;
                }
                const id = parseInt(page.replace('article/', ''), 10);
                if (!isNaN(id)) {
                    this.openBlogArticle(id);
                    return;
                }
            }

            const protectedPages = ['articles', 'encrypted_list'];
            if (protectedPages.includes(page) && !sessionStorage.getItem('vaultUnlocked')) {
                window.location.hash = '#vault';
                this.navigate('vault');
                return;
            }

            this.hideAllPages();
            this.currentPage = page;

            switch (page) {
                case 'home':
                    this.pages.home?.classList.remove('hidden');
                    this.navbar.show();
                    this.navbar.updateActive('home');
                    window.location.hash = '#home';
                    break;
                case 'articles':
                    this.pages.articles?.classList.remove('hidden');
                    this.navbar.show();
                    this.navbar.updateActive('vault');
                    this.renderArticleRetrieval();
                    window.location.hash = '#articles';
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
                    window.location.hash = '#vault';
                    break;
                case 'encrypted_list':
                    this.pages.encrypted_list?.classList.remove('hidden');
                    this.navbar.hide();
                    break;
                case 'article_reader':
                    this.pages.article_reader?.classList.remove('hidden');
                    this.navbar.hide();
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
        }

        renderArticleRetrieval() {
            const list = document.getElementById('articlesList');
            const tagFilter = document.getElementById('tagFilter');
            if (!list || !tagFilter) return;

            const allTags = getAllTags();
            tagFilter.innerHTML = '<button class="tag-btn active" data-tag="all">全部</button>' +
                allTags.map(tag => `<button class="tag-btn" data-tag="${tag}">#${tag}</button>`).join('');

            this.renderFilteredArticles();
        }

        renderFilteredArticles(searchQuery = '', activeTag = 'all') {
            const list = document.getElementById('articlesList');
            if (!list) return;

            let filtered = typeof articles !== 'undefined' ? [...articles] : [];

            if (activeTag !== 'all') {
                filtered = filtered.filter(a => (a.tags || []).includes(activeTag));
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

            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (filtered.length === 0) {
                const emptyEl = document.getElementById('articlesEmpty');
                if (emptyEl) emptyEl.innerHTML = '<div class="no-results">grep: 无匹配</div>';
                list.innerHTML = '';
                return;
            }

            const emptyEl = document.getElementById('articlesEmpty');
            if (emptyEl) emptyEl.innerHTML = '';
            list.innerHTML = filtered.map((a) => {
                const realIndex = articles.indexOf(a);
                const dateStr = formatDate(a.date).replace(/-/g, '.');
                const tagsHtml = (a.tags || []).map(t =>
                    `<span class="article-tag" data-tag="${t}">#${t}</span>`
                ).join('');
                return `
                    <div class="article-row" data-id="${realIndex}">
                        <span class="article-date">${dateStr}</span>
                        <span class="article-separator">──</span>
                        <span class="article-title">${escapeHtml(a.title)}</span>
                        <div class="article-tags">${tagsHtml}</div>
                    </div>
                `;
            }).join('');
        }

        openBlogArticle(id) {
            const article = (typeof articles !== 'undefined') ? articles[id] : null;
            if (!article) return;
            this.readerReturnPage = 'articles';
            this.openArticle(article);
        }

        openArticle(article) {
            this.navbar.hide();
            this.typewriter.play(article.title, () => {
                this.hideAllPages();
                this.articleReader.render(article);
                this.articleReader.show();
                this.currentPage = 'article_reader';
                const idx = articles.indexOf(article);
                window.location.hash = idx >= 0 ? '#article/' + idx : '#readme';
            });
        }

        openReadme() {
            const readme = typeof articles !== 'undefined' ? articles.find(a => a.id === 'readme') : null;
            if (!readme) return;
            this.readerReturnPage = 'home';
            this.openArticle(readme);
        }

        goBackFromReader() { this.navigate(this.readerReturnPage || 'home'); }

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
                this.navigate('home');
            });

            let searchTimer = null;
            const searchBox = document.querySelector('#articles .search-box');
            searchBox?.addEventListener('input', (e) => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    this.renderFilteredArticles(e.target.value, this.currentTag || 'all');
                }, 300);
            });

            const tagFilter = document.getElementById('tagFilter');
            tagFilter?.addEventListener('click', (e) => {
                const btn = e.target.closest('.tag-btn');
                if (!btn) return;

                tagFilter.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.currentTag = btn.dataset.tag;
                const sb = document.querySelector('#articles .search-box');
                this.renderFilteredArticles(sb?.value || '', this.currentTag);
            });

            const articlesList = document.getElementById('articlesList');
            articlesList?.addEventListener('click', (e) => {
                const row = e.target.closest('.article-row');
                const tagEl = e.target.closest('.article-tag');

                if (tagEl) {
                    const tagName = tagEl.dataset.tag;
                    const tf = document.getElementById('tagFilter');
                    this.currentTag = tagName;
                    tf?.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                    const targetBtn = tf?.querySelector(`[data-tag="${tagName}"]`);
                    targetBtn?.classList.add('active');
                    const sb = document.querySelector('#articles .search-box');
                    this.renderFilteredArticles(sb?.value || '', tagName);
                    return;
                }

                if (row) {
                    const id = parseInt(row.dataset.id, 10);
                    if (!isNaN(id) && typeof articles !== 'undefined' && articles[id]) {
                        this.openBlogArticle(id);
                    }
                }
            });

            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') {
                    const tocHidden = this.articleReader.tocPanel?.classList.contains('hidden');
                    if (!tocHidden) this.articleReader.closeToc();
                    else if (this.currentPage === 'article_reader') this.goBackFromReader();
                    else if (this.currentPage === 'encrypted_list') this.goBackToVault();
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
