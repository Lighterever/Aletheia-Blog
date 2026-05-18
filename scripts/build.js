const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const markedFootnote = require('marked-footnote');
const markedAlert = require('marked-alert');
const { emojify } = require('../js/utils/emojify.js');
const mdPreprocess = require('../js/utils/md-preprocessor.js');

const ARTICLES_DIR = path.join(__dirname, '..', 'articles');
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'data.js');
const TIMELINE_DIR = path.join(__dirname, '..', 'timeline');
const TIMELINE_OUTPUT = path.join(DATA_DIR, 'timeline-data.js');
const README_FILE = path.join(__dirname, '..', 'about.md');
const VAULT_KEY = 'aletheia';

const SITE_CONFIG = {
    baseUrl: 'https://www.lighterever.com',
    title: 'ℵ · aletheia',
    description: 'thoughts, unfolded - 数学、计算机、哲学的探索',
};

marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false,
});
marked.use(markedFootnote());
marked.use(markedAlert());

function parseFrontmatter(text) {
    const lines = text.split('\n');
    const result = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        if (value.startsWith('[') && value.endsWith(']')) {
            const inner = value.slice(1, -1).trim();
            if (inner) {
                result[key] = inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
            } else {
                result[key] = [];
            }
        } else {
            result[key] = value;
        }
    }
    return result;
}

function parseMdFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const trimmed = raw.trim();

    if (!trimmed.startsWith('---')) {
        throw new Error(`Missing frontmatter in ${filePath}`);
    }

    const secondDelim = trimmed.indexOf('---', 3);
    if (secondDelim === -1) {
        throw new Error(`Unclosed frontmatter in ${filePath}`);
    }

    const frontmatterText = trimmed.slice(3, secondDelim).trim();
    const content = trimmed.slice(secondDelim + 3).trim();
    const meta = parseFrontmatter(frontmatterText);

    const basename = path.basename(filePath, '.md');

    return {
        id: meta.id || basename,
        title: meta.title || basename,
        date: meta.date || '',
        tags: meta.tags || [],
        description: meta.description || '',
        content: content,
    };
}

function escapeStringLiteral(str) {
    return str.replace(/[\\'"]/g, '\\$&');
}

function generateDataJs(articles, aboutArticle) {
    const entries = articles.map((a) => {
        const base64Content = Buffer.from(a.content, 'utf-8').toString('base64');
        const tagsStr = JSON.stringify(a.tags);
        return `    {
        id: '${escapeStringLiteral(a.id)}',
        title: '${escapeStringLiteral(a.title)}',
        date: '${escapeStringLiteral(a.date)}',
        tags: ${tagsStr},
        content: '${base64Content}'
    }`;
    });

    var aboutJs = '';
    if (aboutArticle) {
        var base64AboutContent = Buffer.from(aboutArticle.content, 'utf-8').toString('base64');
        var at = JSON.stringify(aboutArticle.tags);
        aboutJs = `
window.aboutInfo = {
    id: '${escapeStringLiteral(aboutArticle.id)}',
    title: '${escapeStringLiteral(aboutArticle.title)}',
    date: '${escapeStringLiteral(aboutArticle.date)}',
    tags: ${at},
    content: '${base64AboutContent}'
};`;
    }

    return `/**
 * 加密博客数据文件（由 scripts/build.js 自动生成）
 * 请勿手动编辑此文件，在 articles/ 目录下添加 .md 文件后运行 node scripts/build.js
 */

window.VAULT_KEY = '${VAULT_KEY}';
window.articles = [
${entries.join(',\n')}
];${aboutJs}
`;

}

function parseTimelineContent(content) {
    const entryRegex = /###\s+(\d{4}-\d{2}-\d{2})\s*\n([\s\S]*?)(?=\n###\s+\d{4}-\d{2}-\d{2}|$)/g;
    const entries = [];
    let match;

    while ((match = entryRegex.exec(content)) !== null) {
        const date = match[1];
        const body = match[2].trim();
        const lines = body.split('\n').map(l => l.trim()).filter(Boolean);

        const contentLines = [];
        let isInsight = false;
        const entryTags = [];
        let articleLink = '';

        for (const line of lines) {
            if (line.startsWith('💡')) {
                isInsight = true;
                contentLines.push(line);
            } else if (/^tags\s*:\s*(.+)/i.test(line)) {
                const raw = line.match(/^tags\s*:\s*(.+)/i)[1];
                raw.split(/[,，、]/).forEach(function(t) {
                    const tag = t.trim();
                    if (tag) entryTags.push(tag);
                });
            } else if (/^link\s*:\s*(.+)/i.test(line)) {
                articleLink = line.match(/^link\s*:\s*(.+)/i)[1].trim();
            } else {
                contentLines.push(line);
            }
        }

        entries.push({
            date: date,
            content: contentLines.join(' '),
            isInsight: isInsight,
            tags: entryTags,
            articleLink: articleLink,
        });
    }

    entries.sort((a, b) => a.date.localeCompare(b.date));

    return entries;
}

function parseTimelineFile(filePath) {
    var raw = fs.readFileSync(filePath, 'utf-8');
    var trimmed = raw.trim();
    var basename = path.basename(filePath, '.md');

    var meta = {};
    var hasFrontmatter = false;
    var content = trimmed;

    if (trimmed.startsWith('---')) {
        var secondDelim = trimmed.indexOf('---', 3);
        if (secondDelim !== -1) {
            var frontmatterText = trimmed.slice(3, secondDelim).trim();
            content = trimmed.slice(secondDelim + 3).trim();
            meta = parseFrontmatter(frontmatterText);
            hasFrontmatter = true;
        }
    }

    var entries = parseTimelineContent(content);
    if (entries.length === 0) return null;

    if (!meta.start) {
        meta.start = entries[0].date;
    }

    return {
        id: meta.id || basename,
        title: meta.title || basename,
        start: meta.start,
        end: meta.end || null,
        tags: meta.tags || [],
        entries: entries,
        _loose: !meta.title,
    };
}

function generateTimelineJs(topics) {
    var topicEntries = topics.map(function(topic) {
        var entriesStr = topic.entries.map(function(e) {
            var base64EntryContent = Buffer.from(e.content, 'utf-8').toString('base64');
            var tagsArr = e.tags || [];
            var entryTagsStr = JSON.stringify(tagsArr);
            var linkStr = e.articleLink ? '"' + escapeStringLiteral(e.articleLink) + '"' : 'null';
            return '{"date":"' + e.date + '","content":"' + base64EntryContent + '","isInsight":' + e.isInsight + ',"tags":' + entryTagsStr + ',"articleLink":' + linkStr + '}';
        }).join(',');
        var tagsStr = JSON.stringify(topic.tags);
        var endVal = topic.end ? "'" + escapeStringLiteral(topic.end) + "'" : 'null';
        return '    {\n' +
            '        id: \'' + escapeStringLiteral(topic.id) + '\',\n' +
            '        title: \'' + escapeStringLiteral(topic.title) + '\',\n' +
            '        start: \'' + escapeStringLiteral(topic.start) + '\',\n' +
            '        end: ' + endVal + ',\n' +
            '        tags: ' + tagsStr + ',\n' +
            '        _loose: ' + (topic._loose ? 'true' : 'false') + ',\n' +
            '        entries: [' + entriesStr + ']\n' +
            '    }';
    });

    return '/**\n' +
        ' * 时间轴数据文件（由 scripts/build.js 自动生成）\n' +
        ' * 请勿手动编辑此文件，在 timeline/ 目录下添加 .md 文件后运行 node scripts/build.js\n' +
        ' */\n' +
        '\n' +
        'window.timelineData = [\n' +
        topicEntries.join(',\n') + '\n' +
        '];\n';
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function ensurePostsDir() {
    const postsDir = path.join(__dirname, '..', 'posts');
    if (!fs.existsSync(postsDir)) {
        fs.mkdirSync(postsDir, { recursive: true });
    }
    return postsDir;
}

function generateArticleHtml(article, baseUrl) {
    const rawContent = emojify(article.content);
    const preprocessed = mdPreprocess.preprocess(rawContent);
    let htmlContent = marked.parse(preprocessed);
    htmlContent = mdPreprocess.restoreLatex(htmlContent);
    const dateStr = article.date;
    const tagsStr = (article.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ');
    const articleUrl = `${baseUrl}/posts/${article.id}/`;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "datePublished": article.date,
        "description": article.description || '',
        "url": articleUrl,
        "publisher": {
            "@type": "Organization",
            "name": SITE_CONFIG.title
        }
    };

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">

    <title>${escapeHtml(article.title)} - ${SITE_CONFIG.title}</title>
    <meta name="description" content="${escapeHtml(article.description || '')}">
    <meta name="author" content="Lighter">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${articleUrl}">

    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(article.title)}">
    <meta property="og:description" content="${escapeHtml(article.description || '')}">
    <meta property="og:url" content="${articleUrl}">
    <meta property="og:site_name" content="${SITE_CONFIG.title}">
    <meta property="article:published_time" content="${article.date}">
${(article.tags || []).map(t => `    <meta property="article:tag" content="${escapeHtml(t)}">`).join('\n')}

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(article.title)}">
    <meta name="twitter:description" content="${escapeHtml(article.description || '')}">

    <link rel="icon" type="image/svg+xml" href="${baseUrl}/favicon.svg">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-dark.min.css" id="gh-md-dark-theme">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css" id="gh-md-light-theme" disabled>
    <link rel="stylesheet" href="${baseUrl}/css/base.css">
    <link rel="stylesheet" href="${baseUrl}/css/home.css">
    <link rel="stylesheet" href="${baseUrl}/css/vault.css">
    <link rel="stylesheet" href="${baseUrl}/css/articles.css">
    <link rel="stylesheet" href="${baseUrl}/css/reader.css">
    <link rel="stylesheet" href="${baseUrl}/css/timeline.css">
    <link rel="stylesheet" href="${baseUrl}/css/letters.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css" id="hljs-dark-theme">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css" id="hljs-light-theme" disabled>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">

    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 4)}
    </script>

    <script>
        (function() {
            var theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
        })();
    </script>
</head>
<body>
    <nav class="global-nav">
        <div class="nav-container">
            <a href="${baseUrl}/" class="nav-logo">
                <span class="logo-symbol">ℵ</span>
                <span class="logo-badge">测试中</span>
            </a>
            <div class="nav-links">
                <a href="${baseUrl}/" class="nav-link" data-page="home">首页</a>
                <a href="${baseUrl}/vault" class="nav-link vault-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    密钥室
                </a>
                <button class="theme-toggle" id="themeToggle" title="切换主题" onclick="toggleTheme()">
                    <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                </button>
            </div>
        </div>
    </nav>

    <main class="article-reader">
        <article class="article-content markdown-body">
            <h1>${escapeHtml(article.title)}</h1>
            <div class="article-meta">${dateStr}${tagsStr ? ' · ' + tagsStr : ''}</div>
            <hr class="article-divider">
            ${htmlContent}
        </article>

        <div class="article-footer">
            <a href="${baseUrl}/" class="back-to-home">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                返回首页
            </a>
        </div>
    </main>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>

    <script>
        function toggleTheme() {
            var current = document.documentElement.getAttribute('data-theme') || 'dark';
            var next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            var isDark = next === 'dark';
            var hlDark = document.getElementById('hljs-dark-theme');
            var hlLight = document.getElementById('hljs-light-theme');
            var ghDark = document.getElementById('gh-md-dark-theme');
            var ghLight = document.getElementById('gh-md-light-theme');
            if (hlDark) hlDark.disabled = !isDark;
            if (hlLight) hlLight.disabled = isDark;
            if (ghDark) ghDark.disabled = !isDark;
            if (ghLight) ghLight.disabled = isDark;
        }

        document.addEventListener('DOMContentLoaded', function() {
            var theme = document.documentElement.getAttribute('data-theme') || 'dark';
            var isDark = theme !== 'light';
            var hlDark = document.getElementById('hljs-dark-theme');
            var hlLight = document.getElementById('hljs-light-theme');
            var ghDark = document.getElementById('gh-md-dark-theme');
            var ghLight = document.getElementById('gh-md-light-theme');
            if (hlDark) hlDark.disabled = !isDark;
            if (hlLight) hlLight.disabled = isDark;
            if (ghDark) ghDark.disabled = !isDark;
            if (ghLight) ghLight.disabled = isDark;

            try { hljs.highlightAll(); } catch (e) {}

            enhanceCodeBlocks();
            addHeadingAnchors();
            wrapTables();

            if (typeof renderMathInElement !== 'undefined') {
                renderMathInElement(document.body, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ],
                    throwOnError: false
                });
            }

            initFootnoteTooltip();
        });

        function enhanceCodeBlocks() {
            var pres = document.querySelectorAll('.article-content pre');
            pres.forEach(function(pre) {
                var code = pre.querySelector('code');
                if (!code) return;
                var langMatch = (code.className || '').match(/language-(\\S+)/);
                var lang = langMatch ? langMatch[1] : '';
                var wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
                var header = document.createElement('div');
                header.className = 'code-block-header';
                header.innerHTML = '<span class="code-language">' + (lang || 'code') + '</span>' +
                    '<button class="code-copy-btn" title="\u590d\u5236\u4ee3\u7801">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
                    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
                    '</svg><span>\u590d\u5236</span></button>';
                wrapper.insertBefore(header, pre);
                pre.classList.add('code-block-content');
                var copyBtn = header.querySelector('.code-copy-btn');
                copyBtn.addEventListener('click', function() {
                    navigator.clipboard.writeText(code.textContent).then(function() {
                        copyBtn.classList.add('copied');
                        copyBtn.querySelector('span').textContent = '\u5df2\u590d\u5236';
                        setTimeout(function() { copyBtn.classList.remove('copied'); copyBtn.querySelector('span').textContent = '\u590d\u5236'; }, 2000);
                    }).catch(function() {
                        copyBtn.querySelector('span').textContent = '\u590d\u5236\u5931\u8d25';
                        setTimeout(function() { copyBtn.querySelector('span').textContent = '\u590d\u5236'; }, 2000);
                    });
                });
            });
        }

        function addHeadingAnchors() {
            var headings = document.querySelectorAll('.article-content h2, .article-content h3, .article-content h4');
            headings.forEach(function(h, i) {
                if (!h.id) h.id = 'heading-' + i;
                var anchor = document.createElement('a');
                anchor.className = 'heading-anchor';
                anchor.href = '#' + h.id;
                anchor.textContent = '\u00A7';
                anchor.setAttribute('aria-label', 'Permalink to ' + (h.textContent || '').trim());
                h.insertBefore(anchor, h.firstChild);
            });
        }

        function wrapTables() {
            var tables = document.querySelectorAll('.article-content table');
            tables.forEach(function(table) {
                var wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            });
        }

        function initFootnoteTooltip() {
            var refs = document.querySelectorAll('sup a[data-footnote-ref]');
            if (!refs.length) return;

            var tooltip = document.createElement('div');
            tooltip.className = 'footnote-tooltip';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);

            var hideTimeout;

            refs.forEach(function(link) {
                link.addEventListener('mouseenter', function(e) {
                    clearTimeout(hideTimeout);
                    var id = link.getAttribute('href');
                    if (!id) return;
                    var footnote = document.querySelector(id);
                    if (!footnote) return;
                    var content = footnote.cloneNode(true);
                    var backrefs = content.querySelectorAll('[data-footnote-backref]');
                    backrefs.forEach(function(b) { b.remove(); });
                    var text = content.textContent.trim();
                    if (text.length > 300) text = text.slice(0, 300) + '\u2026';
                    tooltip.textContent = text;
                    tooltip.style.display = 'block';
                    positionTip(tooltip, link);
                });

                link.addEventListener('mouseleave', function() {
                    hideTimeout = setTimeout(function() {
                        tooltip.style.display = 'none';
                    }, 200);
                });
            });

            tooltip.addEventListener('mouseenter', function() { clearTimeout(hideTimeout); });
            tooltip.addEventListener('mouseleave', function() { tooltip.style.display = 'none'; });

            function positionTip(tip, anchor) {
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
    </script>
</body>
</html>`;
}

function generateSitemap(articles, baseUrl) {
    let urls = articles.map(article => {
        const lastmod = article.date;
        const priority = article.tags && article.tags.includes('置顶') ? '1.0' : '0.8';
        return `  <url>
    <loc>${baseUrl}/posts/${article.id}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;
}

function generateRobotsTxt(baseUrl) {
    return `User-agent: *
Allow: /

Allow: /posts/

Disallow: /data/
Disallow: /scripts/

Sitemap: ${baseUrl}/sitemap.xml

Crawl-delay: 1`;
}

function main() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    var aboutArticle = null;
    if (fs.existsSync(README_FILE)) {
        console.log('  parsing: readme.md (standalone)');
        aboutArticle = parseMdFile(README_FILE);
    }

    var articles = [];
    if (fs.existsSync(ARTICLES_DIR)) {
        const files = fs.readdirSync(ARTICLES_DIR)
            .filter((f) => f.endsWith('.md'))
            .sort();

        if (files.length > 0) {
            articles = files.map((f) => {
                const filePath = path.join(ARTICLES_DIR, f);
                console.log(`  parsing: ${f}`);
                const parsed = parseMdFile(filePath);

                if (!parsed.description) {
                    console.warn(`  ⚠ Warning: Missing 'description' in ${f} - SEO description will be empty`);
                }

                return parsed;
            });
        }
    } else {
        console.log('articles/ directory not found (this is normal in production), skipping article generation');
    }

    if (articles.length === 0 && !aboutArticle) {
        console.log('No .md files found — nothing to build.');
        injectCacheBuster();
        return;
    }

    const output = generateDataJs(articles, aboutArticle);
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
    console.log(`\nGenerated data.js with ${articles.length} article(s)`);

    const postsDir = ensurePostsDir();
    console.log(`\nGenerating static HTML pages...`);

    if (aboutArticle) {
        const aboutDir = path.join(postsDir, aboutArticle.id);
        if (!fs.existsSync(aboutDir)) {
            fs.mkdirSync(aboutDir, { recursive: true });
        }
        const aboutHtml = generateArticleHtml(aboutArticle, SITE_CONFIG.baseUrl);
        fs.writeFileSync(path.join(aboutDir, 'index.html'), aboutHtml, 'utf-8');
        console.log(`  ✓ /posts/${aboutArticle.id}/index.html`);
    }

    articles.forEach(article => {
        const articleDir = path.join(postsDir, article.id);
        if (!fs.existsSync(articleDir)) {
            fs.mkdirSync(articleDir, { recursive: true });
        }

        const html = generateArticleHtml(article, SITE_CONFIG.baseUrl);
        const htmlPath = path.join(articleDir, 'index.html');
        fs.writeFileSync(htmlPath, html, 'utf-8');
        console.log(`  ✓ /posts/${article.id}/index.html`);
    });

    var allForSitemap = [...articles];
    if (aboutArticle) allForSitemap.push(aboutArticle);
    const sitemap = generateSitemap(allForSitemap, SITE_CONFIG.baseUrl);
    fs.writeFileSync(path.join(__dirname, '..', 'sitemap.xml'), sitemap, 'utf-8');
    console.log(`\nGenerated sitemap.xml`);

    const robotsTxt = generateRobotsTxt(SITE_CONFIG.baseUrl);
    fs.writeFileSync(path.join(__dirname, '..', 'robots.txt'), robotsTxt, 'utf-8');
    console.log(`Generated robots.txt`);

    if (!fs.existsSync(TIMELINE_DIR)) {
        console.log('\ntimeline/ directory not found, skipping timeline generation');
    } else {
        const timelineFiles = fs.readdirSync(TIMELINE_DIR)
            .filter((f) => f.endsWith('.md'))
            .sort();

        if (timelineFiles.length === 0) {
            console.log('\nNo .md files found in timeline/');
        } else {
            console.log('\nGenerating timeline data...');
            const topics = timelineFiles.map((f) => {
                const filePath = path.join(TIMELINE_DIR, f);
                console.log(`  parsing timeline: ${f}`);
                return parseTimelineFile(filePath);
            }).filter(Boolean);

            const timelineOutput = generateTimelineJs(topics);
            fs.writeFileSync(TIMELINE_OUTPUT, timelineOutput, 'utf-8');
            console.log(`\nGenerated timeline-data.js with ${topics.length} topic(s)`);
        }
    }

    injectCacheBuster();
}

function injectCacheBuster() {
    const indexPath = path.join(__dirname, '..', 'index.html');
    if (!fs.existsSync(indexPath)) return;

    const buildVersion = Date.now().toString(36);
    let html = fs.readFileSync(indexPath, 'utf-8');

    html = html.replace(
        /(<script src="\/data\/data\.js)("><\/script>)/,
        '$1?v=' + buildVersion + '$2'
    );
    html = html.replace(
        /(<script src="\/data\/timeline-data\.js)("><\/script>)/,
        '$1?v=' + buildVersion + '$2'
    );
    html = html.replace(
        /(<script type="module" src="\/js\/app\.js)("><\/script>)/,
        '$1?v=' + buildVersion + '$2'
    );

    fs.writeFileSync(indexPath, html, 'utf-8');
    console.log('  ✓ cache-busting injected into index.html');
}

main();
