# 个人博客文章 SEO 静态化规范

## 1. 项目背景

### 1.1 当前架构问题

当前博客采用 SPA（单页应用）架构：

```
MD 文件 → scripts/build-articles.js 打包 → data.js（加密数据）→ SPA 动态渲染
```

**存在的问题：**

- 所有文章内容都打包在加密的 `data.js` 文件中
- 搜索引擎爬虫访问 `index.html` 时，只能获取空壳 HTML，无实际内容
- 即使爬虫执行 JS，由于需要密钥解密，也看不到文章内容
- 每次访问都是全新的页面渲染，不利于 SEO 索引

### 1.2 解决方案

采用「双产物策略」：

1. **保持现有 SPA 架构**：`data.js` 继续用于站内导航和密钥室功能
2. **新增静态 HTML 页面**：为每篇文章生成独立的、纯静态的 HTML 文件
3. **生成 SEO 文件**：`sitemap.xml` 和 `robots.txt`

```
构建产物
├── index.html          # SPA 入口（保持不变）
├── data.js             # 加密文章数据（保持不变）
├── style.css           # 共用样式（保持不变）
├── posts/              # 新增：文章静态页面
│   ├── readme/index.html
│   ├── another-post/index.html
│   └── ...
├── sitemap.xml         # 新增：站点地图
└── robots.txt          # 新增：爬虫规则
```

---

## 2. Front Matter 规范

每篇文章 MD 文件的 Front Matter 需包含以下字段：

```yaml
---
title: 文章标题
date: 2026-05-14
tags: [技术, 数学]
id: readme              # 用于生成 URL: /posts/readme/index.html
description: 文章的 SEO 描述，用于 meta description 和 Open Graph。建议 150-160 字符。
---
```

### 字段说明

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `title` | 是 | 文章标题 | `快速排序算法详解` |
| `date` | 是 | 发布日期，格式 `YYYY-MM-DD` | `2026-05-14` |
| `id` | 是 | 文章唯一标识，生成 URL slug | `quick-sort-algorithm` |
| `tags` | 是 | 标签数组 | `[算法, 数据结构]` |
| `description` | 是 | SEO 描述，建议 150-160 字符 | `深入理解快速排序...` |

> **注意**：`id` 字段将直接用作 URL slug，请使用英文小写字母、数字和连字符。

---

## 3. 构建脚本改造

### 3.1 修改 `scripts/build-articles.js`

将以下代码块**替换**原有 `generateDataJs` 函数之后的内容，并**新增**静态 HTML 生成函数。

```javascript
// ==================== 原有代码保持不变 ====================
// parseFrontmatter()
// parseMdFile()
// escapeStringLiteral()
// escapeTemplateLiteral()
// generateDataJs()
// ...（保留所有原有代码）

// ==================== 新增代码 ====================

const path = require('path');

// 站点基础信息（请根据实际情况修改）
const SITE_CONFIG = {
    baseUrl: 'https://your-domain.com',  // 修改为你的域名
    title: 'ℵ · aletheia',
    description: 'thoughts, unfolded - 数学、计算机、哲学的探索',
};

// 确保 posts 目录存在
function ensurePostsDir() {
    const postsDir = path.join(__dirname, '..', 'posts');
    if (!fs.existsSync(postsDir)) {
        fs.mkdirSync(postsDir, { recursive: true });
    }
    return postsDir;
}

// 生成文章静态 HTML
function generateArticleHtml(article, baseUrl) {
    const { marked } = require('marked');
    
    // 配置 marked
    marked.setOptions({
        gfm: true,
        breaks: false,
    });
    
    const htmlContent = marked.parse(article.content);
    const dateStr = article.date;  // 格式: YYYY-MM-DD
    const tagsStr = (article.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ');
    const articleUrl = `${baseUrl}/posts/${article.id}/`;
    
    // JSON-LD 结构化数据
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no">
    
    <!-- 基础 SEO Meta -->
    <title>${escapeHtml(article.title)} - ${SITE_CONFIG.title}</title>
    <meta name="description" content="${escapeHtml(article.description || '')}">
    <meta name="author" content="Lighter">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${articleUrl}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(article.title)}">
    <meta property="og:description" content="${escapeHtml(article.description || '')}">
    <meta property="og:url" content="${articleUrl}">
    <meta property="og:site_name" content="${SITE_CONFIG.title}">
    <meta property="article:published_time" content="${article.date}">
    ${(article.tags || []).map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n    ')}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(article.title)}">
    <meta name="twitter:description" content="${escapeHtml(article.description || '')}">
    
    <!-- 样式 -->
    <link rel="icon" type="image/svg+xml" href="${baseUrl}/favicon.svg">
    <link rel="stylesheet" href="${baseUrl}/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Noto+Serif+SC:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    
    <!-- JSON-LD -->
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 4)}
    </script>
    
    <!-- 主题初始化脚本（防止闪烁） -->
    <script>
        (function() {
            var theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
        })();
    </script>
</head>
<body>
    <!-- 导航栏 -->
    <nav class="global-nav">
        <div class="nav-container">
            <a href="${baseUrl}/" class="nav-logo">
                <span class="logo-symbol">ℵ</span>
                <span class="logo-badge">测试中</span>
            </a>
            <div class="nav-links">
                <a href="${baseUrl}/" class="nav-link" data-page="home">首页</a>
                <a href="${baseUrl}/#vault" class="nav-link vault-link">
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

    <!-- 文章内容 -->
    <main class="article-reader">
        <article class="article-content">
            <h1>${escapeHtml(article.title)}</h1>
            <div class="article-meta">${dateStr}${tagsStr ? ' · ' + tagsStr : ''}</div>
            <hr class="article-divider">
            ${htmlContent}
        </article>
        
        <!-- 返回链接 -->
        <div class="article-footer">
            <a href="${baseUrl}/" class="back-to-home">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                返回首页
            </a>
        </div>
    </main>

    <!-- KaTeX 数学渲染 -->
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    
    <!-- 主题切换脚本 -->
    <script>
        function toggleTheme() {
            var current = document.documentElement.getAttribute('data-theme') || 'dark';
            var next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        }
        
        // 确保 KaTeX 在 DOM 加载完成后渲染
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof renderMathInElement !== 'undefined') {
                renderMathInElement(document.body, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ],
                    throwOnError: false
                });
            }
        });
    </script>
</body>
</html>`;
}

// HTML 实体转义
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 生成 sitemap.xml
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

// 生成 robots.txt
function generateRobotsTxt(baseUrl) {
    return `User-agent: *
Allow: /

# 静态文章页面
Allow: /posts/

# 爬虫不应访问加密数据
Disallow: /data.js
Disallow: /scripts/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# 速率限制
Crawl-delay: 1`;
}

// ==================== 修改 main 函数 ====================
function main() {
    if (!fs.existsSync(ARTICLES_DIR)) {
        console.error('articles/ directory not found');
        process.exit(1);
    }

    const files = fs.readdirSync(ARTICLES_DIR)
        .filter((f) => f.endsWith('.md'))
        .sort();

    if (files.length === 0) {
        console.log('No .md files found in articles/');
        return;
    }

    const articles = files.map((f) => {
        const filePath = path.join(ARTICLES_DIR, f);
        console.log(`  parsing: ${f}`);
        const parsed = parseMdFile(filePath);
        
        // 验证必填字段
        if (!parsed.description) {
            console.warn(`  ⚠ Warning: Missing 'description' in ${f} - SEO description will be empty`);
        }
        
        return parsed;
    });

    // 1. 生成 data.js（原有功能）
    const output = generateDataJs(articles);
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
    console.log(`\nGenerated data.js with ${articles.length} article(s)`);

    // 2. 生成静态 HTML 页面
    const postsDir = ensurePostsDir();
    console.log(`\nGenerating static HTML pages...`);
    
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

    // 3. 生成 sitemap.xml
    const sitemap = generateSitemap(articles, SITE_CONFIG.baseUrl);
    fs.writeFileSync(path.join(__dirname, '..', 'sitemap.xml'), sitemap, 'utf-8');
    console.log(`\nGenerated sitemap.xml`);

    // 4. 生成 robots.txt
    const robotsTxt = generateRobotsTxt(SITE_CONFIG.baseUrl);
    fs.writeFileSync(path.join(__dirname, '..', 'robots.txt'), robotsTxt, 'utf-8');
    console.log(`Generated robots.txt`);
}

main();
```

### 3.2 关键修改点说明

1. **SITE_CONFIG 配置**：修改 `baseUrl` 为你的实际域名
2. **新增 `generateArticleHtml()`**：为每篇文章生成独立的 HTML 文件
3. **新增 `generateSitemap()`**：生成站点地图
4. **新增 `generateRobotsTxt()`**：生成爬虫规则
5. **修改 `main()`**：在构建流程中调用上述新增函数

### 3.3 需要的依赖

确保项目已安装 `marked`（用于 Markdown 解析）：

```bash
cd /app/data/blog
npm install marked
```

---

## 4. 静态 HTML 模板详解

### 4.1 Head 部分

每个生成的 HTML 包含完整的 SEO 标签：

```html
<!-- 基础 Meta -->
<title>文章标题 - ℵ · aletheia</title>
<meta name="description" content="文章描述...">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://your-domain.com/posts/slug/">

<!-- Open Graph（SNS 分享） -->
<meta property="og:type" content="article">
<meta property="og:title" content="文章标题">
<meta property="og:description" content="文章描述...">
<meta property="og:url" content="https://your-domain.com/posts/slug/">
<meta property="og:site_name" content="ℵ · aletheia">
<meta property="article:published_time" content="2026-05-14">
<meta property="article:tag" content="标签1">
<meta property="article:tag" content="标签2">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="文章标题">
<meta name="twitter:description" content="文章描述...">

<!-- JSON-LD 结构化数据 -->
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "文章标题",
    "datePublished": "2026-05-14",
    "description": "文章描述...",
    "url": "https://your-domain.com/posts/slug/",
    "publisher": {
        "@type": "Organization",
        "name": "ℵ · aletheia"
    }
}
</script>
```

### 4.2 主题支持

静态页面通过内联脚本实现主题初始化，防止页面闪烁：

```html
<script>
    (function() {
        var theme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
    })();
</script>
```

### 4.3 样式复用

静态页面直接引用现有的 `style.css`，确保与 SPA 中的文章阅读体验一致：

```html
<link rel="stylesheet" href="/style.css">
```

---

## 5. 生成的文件示例

### 5.1 文章页面

生成路径：`/posts/readme/index.html`

访问 URL：`https://your-domain.com/posts/readme/`

### 5.2 sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-domain.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://your-domain.com/posts/readme/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://your-domain.com/posts/another-post/</loc>
    <lastmod>2026-05-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 5.3 robots.txt

```
User-agent: *
Allow: /

# 静态文章页面
Allow: /posts/

# 爬虫不应访问加密数据
Disallow: /data.js
Disallow: /scripts/

# Sitemap
Sitemap: https://your-domain.com/sitemap.xml

# 速率限制
Crawl-delay: 1
```

---

## 6. Vercel 部署适配

### 6.1 vercel.json 配置

在项目根目录创建或修改 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "scripts/build-articles.js",
      "use": "@vercel/node",
      "config": {
        "outputDirectory": "."
      }
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "."
      }
    }
  ],
  "routes": [
    { "handle": "filesystem" },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 6.2 部署脚本

在 `package.json` 中添加构建命令：

```json
{
  "scripts": {
    "build": "node scripts/build-articles.js",
    "build:vercel": "node scripts/build-articles.js"
  }
}
```

### 6.3 Vercel 控制台设置

在 Vercel 项目设置中：

1. **Build Command**: `npm run build:vercel`
2. **Output Directory**: `public`（或保持默认，根据项目结构调整）
3. **Install Command**: `npm install`

### 6.4 注意事项

- 确保 `posts/` 目录在构建后被包含在部署产物中
- Vercel 会自动处理 SPA 路由，所有不存在的路径都会回退到 `index.html`
- 静态生成的 `/posts/slug/` 路径会被 Vercel 正确托管

---

## 7. 验证清单

### 7.1 构建验证

运行构建脚本后，检查以下文件是否生成：

```bash
ls -la posts/                    # 检查 posts 目录结构
ls -la posts/readme/             # 检查单篇文章目录
cat posts/readme/index.html     # 检查 HTML 内容
cat sitemap.xml                  # 检查站点地图
cat robots.txt                  # 检查爬虫规则
```

### 7.2 HTML 内容验证

在生成的 `posts/slug/index.html` 中确认：

- [ ] `<title>` 标签包含文章标题
- [ ] `<meta name="description">` 包含文章描述
- [ ] `<link rel="canonical">` 指向正确 URL
- [ ] Open Graph meta 标签完整
- [ ] JSON-LD 结构化数据有效（可通过 JSONLint 验证）
- [ ] `<link rel="stylesheet" href="/style.css">` 正确引用样式

### 7.3 SEO 效果验证

1. **Google Search Console**：
   - 提交 `sitemap.xml`
   - 检查「URL 检查」工具能否正确抓取文章页面
   - 查看「效果」报告中的索引状态

2. **结构化数据测试**：
   - 访问 [Google Rich Results Test](https://search.google.com/test/rich-results)
   - 输入文章 URL，验证 Article 结构化数据

3. **移动端兼容性**：
   - 使用 Google 的「移动端适合性测试」
   - 确保页面在移动设备上正常显示

4. **页面速度**：
   - 使用 [PageSpeed Insights](https://pagespeed.web.dev/)
   - 验证核心 Web 指标（LCP、FID、CLS）

### 7.4 功能验证

- [ ] 静态页面可独立访问（无需 SPA）
- [ ] 主题切换在静态页面正常工作
- [ ] 数学公式（KaTeX）正常渲染
- [ ] 页面样式与 SPA 中一致
- [ ] 「返回首页」链接正确

---

## 8. 维护指南

### 8.1 添加新文章

1. 在 `articles/` 目录创建新的 `.md` 文件
2. 确保 Front Matter 包含所有必填字段
3. 运行 `node scripts/build-articles.js`
4. 新文章会同时出现在 `data.js` 和 `posts/` 目录

### 8.2 更新站点 URL

如果域名变更，修改 `SITE_CONFIG.baseUrl`：

```javascript
const SITE_CONFIG = {
    baseUrl: 'https://new-domain.com',
    // ...
};
```

### 8.3 重新生成所有页面

```bash
cd /app/data/blog
node scripts/build-articles.js
```

---

## 9. 文件变更汇总

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 修改 | `scripts/build-articles.js` | 新增静态 HTML 生成逻辑 |
| 修改 | `package.json` | 添加 marked 依赖 |
| 新增 | `posts/*/index.html` | 每篇文章的静态页面 |
| 新增 | `sitemap.xml` | 站点地图 |
| 新增 | `robots.txt` | 爬虫规则 |
| 新增 | `vercel.json` | Vercel 部署配置（如需要） |

---

## 10. 注意事项

1. **description 字段**：务必为每篇文章添加 `description` 字段，这是 SEO 描述的关键来源

2. **id 字段**：用于生成 URL slug，应使用英文小写字母、数字和连字符

3. **样式一致性**：静态页面复用 `style.css`，无需额外维护样式

4. **主题支持**：通过 localStorage 实现主题切换，与 SPA 体验一致

5. **数学公式**：静态页面使用 KaTeX CDN 自动渲染

6. **Vercel 缓存**：部署后可能需要等待几分钟才能看到最新的 sitemap
