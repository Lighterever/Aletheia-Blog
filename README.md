# ℵ · aletheia

> 个人博客。think, write, unfold.

纯前端极简博客，SPA + History API 路由。主页展示思想片段和入口，密钥室作为内容门槛，解锁后进入文章检索页浏览和阅读。支持 GitHub Flavored Markdown、KaTeX 数学公式、语法高亮、深浅双主题。

---

## 项目结构

```
/
├── index.html         ← 全部视图层
├── style.css          ← CSS 变量驱动的双主题样式
├── app.js             ← OOP 核心（8 类 + MarkdownRenderer）
├── data.js            ← 文章数据（由构建脚本自动生成）
├── vercel.json        ← SPA rewrite 规则
├── articles/          ← 文章源文件（.md + YAML frontmatter）
├── scripts/           ← 构建工具
└── README.md
```

---

## 页面与路由

SPA 架构，History API 路由（无 `#`）。

| URL | 页面 | 导航栏 | 需要解锁 |
|-----|------|--------|----------|
| `/` | 主页 | 显示 | 否 |
| `/vault` | 密钥输入页 | 显示 | 否 |
| `/articles` | 文章检索页 | 显示 | 是 |
| `/article/{id}` | 文章阅读页 | 隐藏 | 是 |
| `/readme` | README 文 | 隐藏 | 否 |

### 主页（`/`）

Hero 区展示 `ℵ · aletheia` 标题和标签行，密钥室入口按钮，README 卡片，footer。Caesar 密码轮背景动画（hover 脉冲发光）。

### 密钥室（`/vault`）

终端风格输入框，密钥 `aletheia` 解锁。Matrix Rain 背景动画 + 环形扩散解锁特效 + 解密进度动画。

- `sessionStorage` 持久化解锁状态，刷新不丢失，关闭标签页清除
- 未解锁访问 `/articles` 或 `/article/*` 自动重定向到 `/vault`

### 文章检索页（`/articles`）

四层布局：
1. **顶栏**：ℵ Logo + 搜索框（`grep...`）+ Exit 按钮
2. **终端风格列表头**：`DATE` / `TITLE` / `TAGS` 列头，可点击排序
3. **标签筛选栏**：多选标签按钮 + OR/AND 切换 + 筛选计数 + 清除
4. **文章列表**：日期 ── 标题  #标签

搜索匹配标题、标签和正文，300ms 防抖。标签支持多选组合和 OR/AND 逻辑。

### 文章阅读页（`/article/{id}`）

打字机标题动画、Markdown 渲染（marked.js + github-markdown-css）、highlight.js 语法高亮、KaTeX 数学公式、代码块语言标签 + 复制按钮、标题锚点、右侧 TOC 目录面板、阅读进度条。液态玻璃毛效果阅读器。

---

## OOP 架构

```
App（主控制器）
├── Theme            ← 深浅色主题切换（localStorage 持久化）
├── Navbar           ← 全局导航栏（毛玻璃 + 滚动态）
├── Typewriter       ← 打字机标题动画
├── MatrixRain       ← Matrix数字雨背景（密钥室专属）
├── ArticleReader    ← 文章阅读（MarkdownRenderer + TOC + 进度条）
├── MarkdownRenderer ← Markdown 渲染增强（静态类：语法高亮/复制/锚点/表格）
├── Vault            ← 密钥验证 + 解锁特效（Web Animation API）
└── Crypto           ← AES 解密（静态方法）
```

统一导航入口 `App.navigate(page)`，每次切换先隐藏所有页面。

---

## 样式

暗色/浅色双主题，CSS 变量驱动。液态玻璃阅读器、噪点纹理背景、三级阴影系统、毛玻璃导航栏。

| 变量 | 暗色 | 浅色 |
|------|------|------|
| `--bg-primary` | `#0a0a0f` | `#fafafa` |
| `--accent-primary` | `#00ff88` | `#0a7d4f` |
| `--text-primary` | `#e8e8f0` | `#1a1a2e` |
| `--text-muted` | `#606080` | `#8888a0` |

字体：中文 `Noto Serif SC`，等宽 `JetBrains Mono`。

---

## 添加文章

在 `articles/` 目录下创建 `.md` 文件，使用 YAML frontmatter：

```markdown
---
title: 文章标题
date: 2026-05-15
tags: [数学, 算法]
id: article-slug
---

# 标题

正文 Markdown...
```

运行构建脚本生成 `data.js`：

```bash
node scripts/build-articles.js
```

- `id` 可选，不填使用文件名
- 标签用逗号分隔，支持中文：`tags: [人际, 心理]`
- 数学公式用 KaTeX 语法：行内 `$E=mc^2$`，行间 `$$\int$$`

---

## CDN 依赖

| 库 | 用途 |
|----|------|
| `marked.js` 9.1.6 | Markdown 解析 |
| `highlight.js` 11.9.0 | 代码语法高亮 |
| `github-markdown-css` 5.6.1 | GitHub 风格 Markdown 排版 |
| `KaTeX` 0.16.9 | 数学公式渲染 |
| `CryptoJS` 4.2.0 | AES 加密（备用） |

---

## 部署

### Vercel（推荐）

项目根目录已包含 `vercel.json`，直接 push 到 Vercel 即可。SPA rewrite 规则自动生效。

### 本地运行

```bash
python3 -m http.server 3000
# 访问 http://localhost:3000
```
