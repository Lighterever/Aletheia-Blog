# ℵ · aletheia

> 个人博客。think, write, unfold.

纯前端的极简博客。主页展示思想片段和入口，密钥室作为内容门槛，解锁后进入文章检索页浏览和阅读。

---

## 项目结构

```
/
├── index.html      ← 全部视图层 + 全局导航栏
├── style.css       ← 暗色极简主题 + CSS变量体系
├── app.js          ← OOP核心：7个类 + hash路由
├── data.js         ← 文章数据（由构建脚本自动生成）
├── articles/       ← 文章源文件（.md + frontmatter）
├── scripts/        ← 构建工具
├── encrypt.js      ← Node.js加密工具
└── README.md
```

---

## 页面与路由

SPA 架构，所有视图通过 CSS `hidden` 类切换。

| Hash | 页面 | 导航栏 | 需要解锁 |
|------|------|--------|----------|
| `#home` | 主页 | 显示 | 否 |
| `#vault` | 密钥输入页 | 显示 | 否 |
| `#articles` | 文章检索页 | 显示 | 是 |
| `#article/{id}` | 文章阅读页 | 隐藏 | 是 |
| `#readme` | README文 | 隐藏 | 否 |

### 主页（#home）

Hero 区展示 `ℵ · aletheia` 标题和标签行，密钥室入口按钮，README 卡片，以及 footer。无公开文章区。

### 密钥室（#vault）

终端风格输入框，输入密钥 `aletheia` 解锁，成功后跳转文章检索页。配有 Matrix Rain 背景动画和环形扩散解锁特效。

- 输入密钥验证逻辑：输入值 === `aletheia`
- `sessionStorage` 持久化解锁状态，刷新不丢失，关标签页清除
- 未解锁访问 `#articles` 或 `#article/*` 会被重定向到 `#vault`

### 文章检索页（#articles）

解锁后进入。顶部是搜索框（placeholder: `grep...`），主体为文章列表，每行格式为 `日期 ── 标题  #标签`，底部有标签筛选器。搜索匹配标题、标签和正文，300ms 防抖。标签从文章数据自动提取。

### 文章阅读页

打字机标题动画、Markdown 渲染（marked.js）、KaTeX 数学公式支持（行内 `$...$`，行间 `$$...$$`）、右侧 TOC 目录面板、阅读进度条。

---

## OOP 架构

所有模块封装为类，由 `App` 类统一协调。

```
App（主控制器）
├── Theme          ← 深浅色主题切换（localStorage持久化）
├── Navbar         ← 全局导航栏
├── Typewriter     ← 打字机标题动画
├── MatrixRain     ← Matrix数字雨背景（密钥室专属）
├── ArticleReader  ← 文章阅读（Markdown + TOC + 进度条）
├── Vault          ← 密钥验证 + 解锁特效（Web Animation API）
└── Crypto         ← AES解密（静态方法）
```

统一导航入口 `App.navigate(page)`，每次切换先隐藏所有页面。

---

## 样式

暗色极简主题，CSS 变量驱动。

| 变量 | 用途 |
|------|------|
| `--bg-primary` | `#0a0a0f` |
| `--accent-primary` | `#00ff88` |
| `--text-primary` | `#e8e8f0` |
| `--text-muted` | `#606080` |

字体：中文 `Noto Serif SC`，等宽 `JetBrains Mono`。

---

## 添加文章

在 `articles/` 目录下创建 `.md` 文件，使用 frontmatter 声明元数据：

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

然后运行构建脚本生成 `data.js`：

```bash
node scripts/build-articles.js
```

标签从文章数据自动提取，新增后自动出现在检索页筛选器中。`id` 字段可选，不填则使用文件名（不含扩展名）。

数学公式用 KaTeX 语法：行内 `$E=mc^2$`，行间 `$$\int$$`。

---

## 加密工具

`encrypt.js` 用 AES-256-CBC 加密文章内容（Node.js 端使用，纯静态部署时用于预处理）。

```bash
node encrypt.js --key "密钥" --title "标题" --content "Markdown内容"
node encrypt.js --key "密钥" --title "标题" --file "文章.md"
```

---

## 本地运行

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080
```
