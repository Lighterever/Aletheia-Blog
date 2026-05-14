# Markdown 渲染升级规范

## 项目概述

将现有博客的 Markdown 渲染从 marked.js 裸解析升级为 markdown-it + github-markdown-css（深浅双主题）+ Prism.js 方案，提升文章排版美观度、代码高亮效果，并适配博客主题切换。

---

## 一、改动清单

### 1.1 移除 marked.js

**删除：**
- `index.html` 中的 marked.js CDN 引用
- `app.js` 中的 `marked.setOptions()` 配置
- `app.js` 中的 `marked.parse()` 调用

### 1.2 引入 markdown-it

**index.html 新增 CDN：**
```html
<script src="https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js"></script>
```

**app.js 替换解析逻辑：**

```javascript
const md = window.markdownit({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str, lang) {
    if (lang && Prism.languages[lang]) {
      try {
        return '<pre class="language-' + lang + '"><code class="language-' + lang + '">' +
               Prism.highlight(str, Prism.languages[lang], lang) +
               '</code></pre>';
      } catch (_) {}
    }
    return '<pre class="language-none"><code class="language-none">' +
           md.utils.escapeHtml(str) +
           '</code></pre>';
  }
});

// Prism autoloader
if (window.Prism && Prism.plugins.autoloader) {
  Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
}
```

**文章渲染调用：**

```javascript
// 旧：const htmlContent = marked.parse(article.content);
// 新：
const htmlContent = md.render(article.content);
```

### 1.3 引入 Prism.js 代码高亮（深浅双主题）

**index.html 新增 CDN：**

```html
<!-- Prism 明亮主题 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css"
      data-prism-theme="light" disabled>
<!-- Prism 暗色主题 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css"
      data-prism-theme="dark">
<!-- Prism 核心 + autoloader -->
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
```

**常用语言预加载（可选，减少首次加载延迟）：**

```html
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-c.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-cpp.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-latex.min.js"></script>
```

### 1.4 引入 github-markdown-css（深浅双主题）

**index.html 新增 CDN：**

```html
<!-- 明亮主题 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-light.min.css"
      data-md-theme="light" disabled>
<!-- 暗色主题 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-dark.min.css"
      data-md-theme="dark">
```

**注意：** 不引入 `github-markdown.css`（自动检测系统偏好版），需要手动和博客主题切换按钮同步。

**文章容器添加 class：**

```html
<!-- 旧 -->
<div id="articleContent"></div>

<!-- 新 -->
<div id="articleContent" class="markdown-body"></div>
```

### 1.5 主题切换联动

在现有主题切换函数中追加 markdown 和 Prism 的主题切换逻辑：

```javascript
function toggleTheme() {
  // ... 现有逻辑 ...
  const isDark = /* 当前是否暗色 */;

  // markdown CSS 主题切换
  document.querySelectorAll('[data-md-theme]').forEach(el => {
    el.disabled = (el.getAttribute('data-md-theme') === (isDark ? 'light' : 'dark'));
  });

  // Prism CSS 主题切换
  document.querySelectorAll('[data-prism-theme]').forEach(el => {
    el.disabled = (el.getAttribute('data-prism-theme') === (isDark ? 'light' : 'dark'));
  });
}
```

### 1.6 KaTeX 数学公式（保留）

CDN 和渲染调用不变，仍在 markdown-it 渲染后调用 `renderMathInElement`。

---

## 二、浅色主题全站美化规范

浅色主题不能只是"把黑色换成白色"，那样会很素。需要在保留博客气质的前提下，让浅色也有质感。

### 2.0.1 浅色主题配色方案

暗色主题的核心气质是"终端黑客感"，浅色主题的核心气质应该是"干净纸面感"——不是无聊的白，是有点温度的纸。

```
浅色主题配色：

背景：        #fafafa（微暖白，不是纯白 #fff）
次要背景：    #f0f0f0
卡片/代码背景：#f5f5f5
文字：        #1a1a1a
次要文字：    #666666
链接/强调：   #0a7d4f（深绿，暗色 #00ff88 的浅色对应）
代码文字：    #d63384（玫红，暗色 #00ff88 的浅色对应）
边框：        #e0e0e0
hover背景：   #f0f0f0
引用边框：    #0a7d4f
```

**核心原则：** 暗色用 `#00ff88`（荧光绿），浅色用 `#0a7d4f`（深绿）。不是同一个颜色调亮，而是同一个色系的"纸面版"。荧光绿在白底上刺眼，深绿在白底上沉稳但不无聊。

### 2.0.2 全站浅色覆盖（追加到 style.css）

```css
/* ========== 全站浅色主题 ========== */

[data-theme="light"] body,
html.light body {
  background: #fafafa;
  color: #1a1a1a;
}

/* 导航栏 */
[data-theme="light"] nav,
html.light nav {
  background: rgba(250, 250, 250, 0.95);
  border-bottom: 1px solid #e0e0e0;
  backdrop-filter: blur(10px);
}
[data-theme="light"] nav a,
html.light nav a {
  color: #1a1a1a;
}
[data-theme="light"] nav a:hover,
html.light nav a:hover {
  color: #0a7d4f;
}

/* Hero区 */
[data-theme="light"] .hero-title,
html.light .hero-title {
  color: #1a1a1a;
}
[data-theme="light"] .hero-subtitle,
html.light .hero-subtitle {
  color: #666;
}
[data-theme="light"] .hero-formula,
html.light .hero-formula {
  color: #999;
}
[data-theme="light"] .hero-intro,
html.light .hero-intro {
  color: #555;
}

/* 标签 */
[data-theme="light"] .tag,
html.light .tag {
  color: #0a7d4f;
  border-color: #0a7d4f;
  background: rgba(10, 125, 79, 0.06);
}

/* 密钥室按钮 */
[data-theme="light"] .vault-button,
html.light .vault-button {
  border-color: #0a7d4f;
  color: #0a7d4f;
}
[data-theme="light"] .vault-button:hover,
html.light .vault-button:hover {
  background: rgba(10, 125, 79, 0.08);
}

/* 密钥输入页 */
[data-theme="light"] .vault-container,
html.light .vault-container {
  background: #f5f5f5;
  border-color: #e0e0e0;
}
[data-theme="light"] .vault-input,
html.light .vault-input {
  background: #fff;
  border-color: #d0d0d0;
  color: #1a1a1a;
  caret-color: #0a7d4f;
}
[data-theme="light"] .vault-input:focus,
html.light .vault-input:focus {
  border-color: #0a7d4f;
  box-shadow: 0 0 0 2px rgba(10, 125, 79, 0.15);
}
[data-theme="light"] .vault-hint,
html.light .vault-hint {
  color: #999;
}

/* 文章检索页 */
[data-theme="light"] .article-row,
html.light .article-row {
  border-bottom-color: #e0e0e0;
}
[data-theme="light"] .article-row:hover,
html.light .article-row:hover {
  background: #f0f0f0;
}
[data-theme="light"] .article-date,
html.light .article-date {
  color: #999;
}
[data-theme="light"] .article-title,
html.light .article-title {
  color: #1a1a1a;
}
[data-theme="light"] .article-tags,
html.light .article-tags {
  color: #0a7d4f;
}

/* 搜索框 */
[data-theme="light"] .search-box,
html.light .search-box {
  border-color: #d0d0d0;
  color: #1a1a1a;
  background: #fff;
}
[data-theme="light"] .search-box::placeholder,
html.light .search-box::placeholder {
  color: #bbb;
}
[data-theme="light"] .search-box:focus,
html.light .search-box:focus {
  border-color: #0a7d4f;
}

/* 标签筛选器 */
[data-theme="light"] .tag-filter.active,
html.light .tag-filter.active {
  color: #0a7d4f;
  border-bottom-color: #0a7d4f;
}

/* Footer */
[data-theme="light"] .home-footer,
html.light .home-footer {
  color: #1a1a1a;
}
[data-theme="light"] .footer-symbol,
html.light .footer-symbol {
  color: #1a1a1a;
}
[data-theme="light"] .footer-text,
html.light .footer-text {
  color: #1a1a1a;
}
[data-theme="light"] .footer-formula,
html.light .footer-formula {
  color: #999;
}

/* 主题切换按钮 */
[data-theme="light"] .theme-toggle,
html.light .theme-toggle {
  color: #1a1a1a;
}

/* 滚动条 */
[data-theme="light"] ::-webkit-scrollbar-track,
html.light ::-webkit-scrollbar-track {
  background: #f0f0f0;
}
[data-theme="light"] ::-webkit-scrollbar-thumb,
html.light ::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

/* 打字机光标 */
[data-theme="light"] .typewriter-cursor,
html.light .typewriter-cursor {
  border-color: #0a7d4f;
}

/* 阅读进度条 */
[data-theme="light"] .progress-bar,
html.light .progress-bar {
  background: #0a7d4f;
}
```

### 2.0.3 Matrix Rain 浅色适配

浅色模式下 Matrix Rain 效果需要调整，否则绿字在白底上很刺眼：

```css
[data-theme="light"] #matrixCanvas,
html.light #matrixCanvas {
  opacity: 0.15;  /* 浅色下降低透明度 */
}
```

或者浅色模式下完全关闭 Matrix Rain，换成更柔和的背景效果（可选）。

### 2.0.4 浅色主题下的几个关键细节

1. **不要用纯白 #fff 做背景**，用 #fafafa，有纸张质感
2. **强调色不要用 #00ff88**，在白底上太刺眼，用深绿 #0a7d4f
3. **行内代码不要用绿色文字**，用玫红 #d63384，和深绿形成对比，像学术论文的标注
4. **代码块背景用 #f5f5f5**，比正文背景稍深，有层次感
5. **边框用 #e0e0e0**，比暗色的 #222 浅很多但仍然清晰
6. **hover 状态用背景变化而非颜色变化**，浅色下背景从 #fafafa → #f0f0f0 就够了

---

## 三、Markdown 排版样式覆盖

github-markdown-css 提供基础排版，需覆盖以适配博客配色体系。深浅主题分开覆盖。

### 2.1 暗色主题覆盖（当前默认）

```css
/* ========== 暗色主题 Markdown 覆盖 ========== */

.markdown-body {
  background: transparent !important;
  color: #e0e0e0 !important;
  font-family: -apple-system, 'Noto Sans SC', sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
}

.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  color: #f0f0f0;
  border-bottom-color: #222;
}
.markdown-body h1 { font-size: 1.8rem; margin-top: 2em; }
.markdown-body h2 { font-size: 1.4rem; margin-top: 1.8em; border-bottom: 1px solid #222; padding-bottom: 0.3em; }
.markdown-body h3 { font-size: 1.2rem; margin-top: 1.5em; }

.markdown-body p { line-height: 1.8; margin-bottom: 1em; }

.markdown-body a { color: #00ff88; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }

.markdown-body code {
  background: #1a1a1a;
  color: #00ff88;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
}

.markdown-body pre {
  background: #111 !important;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
}
.markdown-body pre code {
  background: transparent !important;
  color: #e0e0e0;
  padding: 0;
  font-size: 0.85rem;
  line-height: 1.6;
}

.markdown-body blockquote {
  border-left: 3px solid #00ff88;
  color: #999;
  padding: 0.5em 1em;
  margin: 1em 0;
  background: #111;
}

.markdown-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
.markdown-body table th, .markdown-body table td { border: 1px solid #222; padding: 0.5em 1em; }
.markdown-body table th { background: #1a1a1a; color: #f0f0f0; }
.markdown-body table tr:nth-child(even) { background: #0f0f0f; }

.markdown-body ul, .markdown-body ol { padding-left: 2em; }
.markdown-body li { margin-bottom: 0.3em; }

.markdown-body hr { border: none; border-top: 1px solid #222; margin: 2em 0; }

.markdown-body img { max-width: 100%; border-radius: 4px; }

.markdown-body .katex-display { margin: 1.5em 0; overflow-x: auto; }
```

### 2.2 明亮主题覆盖

```css
/* ========== 明亮主题 Markdown 覆盖 ========== */

[data-theme="light"] .markdown-body,
html.light .markdown-body {
  background: transparent !important;
  color: #24292f !important;
}

[data-theme="light"] .markdown-body h1,
[data-theme="light"] .markdown-body h2,
[data-theme="light"] .markdown-body h3,
html.light .markdown-body h1,
html.light .markdown-body h2,
html.light .markdown-body h3 {
  color: #1f2328;
  border-bottom-color: #d1d9e0;
}

[data-theme="light"] .markdown-body a,
html.light .markdown-body a {
  color: #0969da;
}

[data-theme="light"] .markdown-body code,
html.light .markdown-body code {
  background: #eff1f3;
  color: #cf222e;
}

[data-theme="light"] .markdown-body pre,
html.light .markdown-body pre {
  background: #f6f8fa !important;
  border: 1px solid #d1d9e0;
}
[data-theme="light"] .markdown-body pre code,
html.light .markdown-body pre code {
  color: #24292f;
}

[data-theme="light"] .markdown-body blockquote,
html.light .markdown-body blockquote {
  border-left: 3px solid #0969da;
  color: #656d76;
  background: #f6f8fa;
}

[data-theme="light"] .markdown-body table th,
html.light .markdown-body table th {
  background: #f6f8fa;
  color: #1f2328;
  border-color: #d1d9e0;
}
[data-theme="light"] .markdown-body table td,
html.light .markdown-body table td {
  border-color: #d1d9e0;
}
[data-theme="light"] .markdown-body table tr:nth-child(even),
html.light .markdown-body table tr:nth-child(even) {
  background: #f6f8fa;
}

[data-theme="light"] .markdown-body hr,
html.light .markdown-body hr {
  border-top-color: #d1d9e0;
}
```

### 2.3 Prism 暗色主题微调

```css
/* Prism Tomorrow 微调 — 暗色体系 */
.token.comment, .token.prolog, .token.doctype, .token.cdata { color: #666; }
.token.keyword { color: #c792ea; }
.token.string, .token.attr-value { color: #c3e88d; }
.token.function { color: #82aaff; }
.token.number { color: #f78c6c; }
.token.operator { color: #89ddff; }
.token.punctuation { color: #89ddff; }
.token.class-name { color: #ffcb6b; }
.token.boolean { color: #f78c6c; }
.token.builtin { color: #ffcb6b; }
```

---

## 三、CDN 依赖汇总

替换后 index.html `<head>` 区域完整引用：

```html
<!-- ========== Markdown 渲染 ========== -->

<!-- markdown-it -->
<script src="https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js"></script>

<!-- github-markdown-css 深浅双主题 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-light.min.css" data-md-theme="light" disabled>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-dark.min.css" data-md-theme="dark">

<!-- Prism.js 深浅双主题 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" data-prism-theme="light" disabled>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" data-prism-theme="dark">
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>

<!-- KaTeX -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
```

**删除：**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
```

---

## 四、app.js 改动对照

### 4.1 删除

```javascript
marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
const htmlContent = marked.parse(article.content);
```

### 4.2 新增（文件顶部，DOMContentLoaded 之前）

```javascript
const md = window.markdownit({
  html: true, linkify: true, typographer: true, breaks: true,
  highlight: function (str, lang) {
    if (lang && Prism.languages[lang]) {
      try {
        return '<pre class="language-' + lang + '"><code class="language-' + lang + '">' +
               Prism.highlight(str, Prism.languages[lang], lang) + '</code></pre>';
      } catch (_) {}
    }
    return '<pre class="language-none"><code class="language-none">' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

if (window.Prism && Prism.plugins.autoloader) {
  Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
}
```

### 4.3 替换

```javascript
// 旧
const htmlContent = marked.parse(article.content);
// 新
const htmlContent = md.render(article.content);
```

### 4.4 主题切换联动（追加到现有 toggleTheme 函数）

```javascript
// markdown CSS 主题切换
document.querySelectorAll('[data-md-theme]').forEach(el => {
  el.disabled = (el.getAttribute('data-md-theme') === (isDark ? 'light' : 'dark'));
});

// Prism CSS 主题切换
document.querySelectorAll('[data-prism-theme]').forEach(el => {
  el.disabled = (el.getAttribute('data-prism-theme') === (isDark ? 'light' : 'dark'));
});
```

---

## 五、验证步骤

### 5.1 基础渲染

- [ ] 标题 h1-h6 正常显示
- [ ] 段落换行正常
- [ ] 链接可点击，颜色正确
- [ ] 行内代码样式正确
- [ ] 引用块边框和背景正确

### 5.2 代码高亮

- [ ] python / javascript / c / cpp / bash 语法高亮正常
- [ ] 未指定语言的代码块显示为等宽纯文本
- [ ] 代码块样式与主题协调

### 5.3 数学公式

- [ ] 行内公式 `$E = mc^2$` 正常渲染
- [ ] 行间公式正常渲染

### 5.4 主题切换

- [ ] 切换到明亮：markdown 排版变为浅色
- [ ] 切换到明亮：代码高亮变为 Prism 默认亮色
- [ ] 切换回暗色：一切恢复
- [ ] 切换后无残留颜色不协调的元素

### 5.5 兼容性

- [ ] 删除 marked.js 后无报错
- [ ] 所有路由正常
- [ ] 密钥室功能不受影响
- [ ] 移动端排版正常

---

## 六、回滚方案

1. `index.html`：删 markdown-it / Prism / github-markdown-css CDN，恢复 marked.js
2. `app.js`：删 md 初始化代码，恢复 `marked.setOptions()` + `marked.parse()`
3. `style.css`：删 `.markdown-body` 相关覆盖样式

---

## 七、未来可选扩展

| 插件 | 功能 | 引入时机 |
|------|------|----------|
| markdown-it-footnote | 脚注 `[^1]` | 写学术文章时 |
| markdown-it-anchor | 标题锚点 | 需要段落链接时 |
| markdown-it-toc-done-right | 自动目录 | 长文需要独立目录时 |
| markdown-it-mark | 高亮标记 `==text==` | 需要文本高亮时 |
| markdown-it-container | 自定义容器（提示/警告框） | 需要 callout 块时 |
