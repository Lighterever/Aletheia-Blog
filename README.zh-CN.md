<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>
<br>

# ℵ · aletheia

<p align="center">
  <em>think, write, unfold.</em>
</p>

<p align="center">
  <a href="#-核心功能"><strong>核心功能</strong></a> ·
  <a href="#-快速开始"><strong>快速开始</strong></a> ·
  <a href="#-项目结构"><strong>项目结构</strong></a> ·
  <a href="#-撰写内容"><strong>撰写内容</strong></a> ·
  <a href="#-部署"><strong>部署</strong></a>
</p>

---

纯前端极简博客，SPA + History API 路由。密钥室作为内容门槛（解锁体验终端美学），解锁后进入文章检索页浏览和阅读。支持 GitHub Flavored Markdown、KaTeX 数学公式、语法高亮、深浅双主题，配备学习轨迹时间轴和来信页面。

---

## ✨ 核心功能

<table>
<tr><td width="50%">

**🔐 密钥室**
Matrix 数字雨背景，终端风格密钥框，`aletheia` 解锁，AES 解密，环形扩散特效 + 解密进度动画。

**📝 文章系统**
`.md` + YAML frontmatter 源文件，构建管线输出加密数据 + 静态 HTML（SEO）。标签多选筛选（OR/AND），全文搜索（300ms 防抖），排序。

**🕐 学习轨迹时间轴**
横向画布，左键拖拽平移、⌘+滚轮缩放、点击展开卡片。主题条冻结表头、节点合并展示、进行中动画指示、主题筛选、hover 预览、日期检索、定位今天。

</td><td width="50%">

**🎨 深浅双主题**
CSS 变量驱动，一键切换。液态玻璃阅读器、噪点纹理、毛玻璃导航栏、三级阴影系统。暗色 `#0a0a0f` / 浅色 `#fafafa`。

**🧮 富文本排版**
KaTeX 数学公式、highlight.js 语法高亮、marked.js GFM 渲染、代码块语言标签 + 复制、标题锚点、阅读进度条、TOC 目录。

**📬 来信页面**
专门展示收到的来信与手记，日期范围标注。

</td></tr>
</table>

---

## 📦 项目结构

```
/
├── index.html              ← SPA 入口（全部视图层）
│
├── css/                    ← CSS 模块（7 文件）
│   ├── base.css            ← CSS reset、变量、工具类
│   ├── home.css            ← 主页 + Caesar 密码轮动画
│   ├── vault.css           ← 密钥室 + Matrix Rain
│   ├── articles.css        ← 文章检索 + 标签筛选
│   ├── reader.css          ← 文章阅读 + TOC + 进度条
│   ├── timeline.css        ← 时间轴画布（节点、主题条、卡片、控制栏）
│   └── letters.css         ← 来信页面
│
├── js/                     ← 前端逻辑（ES 模块）
│   ├── app.js              ← 主控制器、路由、Crypto
│   ├── utils.js            ← 共享工具函数
│   ├── core/               ← 核心组件（5 文件）
│   └── pages/              ← 页面控制器（4 文件）
│
├── articles/               ← 文章源文件（.md + YAML frontmatter）
├── timeline/               ← 时间轴源文件（.md + YAML frontmatter）
│
├── data/                   ← 构建产出
│   ├── data.js             ← 加密文章数据
│   └── timeline-data.js    ← 时间轴数据
│
├── posts/                  ← 静态 HTML（SEO，自动生成）
│
├── scripts/                ← 构建工具
│   ├── build.js            ← 统一构建（文章 + 时间轴）
│   └── serve.py            ← 开发服务器（SPA rewrite）
│
├── vercel.json             ← Vercel SPA rewrite 规则
├── 404.html                ← 密码学风格 404 页面
├── sitemap.xml             ← 自动更新的站点地图
└── robots.txt              ← SEO robots
```

---

## 🚀 快速开始

```bash
# 克隆仓库
git clone <repo-url> && cd aletheia

# 构建数据文件
node scripts/build.js

# 启动开发服务器
python3 scripts/serve.py
# → http://localhost:3000
```

**密钥室密码**：`aletheia`

---

## 🗺️ 路由表

| URL | 页面 | 导航栏 | 需解锁 |
|-----|------|--------|--------|
| `/` | 主页 | ✓ | — |
| `/vault` | 密钥室 | ✓ | — |
| `/articles` | 文章检索 + 搜索 | ✓ | 🔒 |
| `/article/{slug}` | 文章阅读 + TOC | ✗ | 🔒 |
| `/timeline` | 学习轨迹时间轴 | 终端式顶栏 | — |
| `/letters` | 来信页面 | ✓ | — |
| `/readme` | 站点介绍（独立页） | ✗ | — |

SPA 架构，History API 路由（无 `#`）。密钥状态 `sessionStorage` 持久化 — 刷新保留，关闭标签页清除。

---

## 📝 撰写内容

### 文章

在 `articles/` 目录创建 `.md` 文件，使用 YAML frontmatter：

```markdown
---
title: 文章标题
date: 2026-05-20
tags: [密码学, 数学]
id: article-slug
description: SEO 描述（一句话）
---

# 文章标题

## 第一节

正文内容...
```

| 字段 | 必填 | 说明 |
|-------|:----:|-------|
| `title` | ✓ | 页面标题 + 检索列表显示 |
| `date` | ✓ | `YYYY-MM-DD`，用于排序和 SEO |
| `tags` | | 逗号分隔，支持中文：`[密码学, 数学]` |
| `id` | | URL slug，默认取文件名 |
| `description` | | SEO meta description |

**标题层级规范**：H1 仅出现一次（必须与 frontmatter `title` 一致），然后 H2 → H3。禁止跳过层级。

### 时间轴记录

在 `timeline/` 目录创建 `.md` 文件，YAML frontmatter + `### YYYY-MM-DD` 日期条目：

```markdown
---
id: discrete-math
title: 离散数学
tags: [数学, CS]
start: 2026-04-20
---

### 2026-04-22
tags: 里程碑, 逻辑

完成了命题逻辑基础。

### 2026-04-25
tags: 集合论

集合论与基数。
💡 对角线论证 — 自指导致不完备。
```

| 字段 | 位置 | 说明 |
|------|------|------|
| `title` | frontmatter | 主题名（空则为零散节点） |
| `tags` | frontmatter | 主题级标签（所有卡片均显示） |
| `start` / `end` | frontmatter | `YYYY-MM-DD`。无 `end` = 进行中（渐变淡出 + 脉冲圆点） |
| `tags:` | 条目行 | 条目级标签（与主题级标签合并） |
| `💡` | 行首 | 灵感时刻 — 节点脉冲高亮 |

运行构建：

```bash
node scripts/build.js
```

---

## 🎨 设计系统

| CSS 变量 | 暗色 | 浅色 |
|----------|------|------|
| `--bg-primary` | `#0a0a0f` | `#fafafa` |
| `--accent-primary` | `#00ff88` | `#0a7d4f` |
| `--text-primary` | `#e8e8f0` | `#1a1a2e` |
| `--text-muted` | `#606080` | `#8888a0` |

**字体**：正文 `Noto Serif SC`，等宽 `JetBrains Mono`。

**设计亮点**：液态玻璃阅读器、毛玻璃导航栏（滚动态隐藏/显示）、SVG 噪点纹理背景、三级阴影系统、Caesar 密码轮背景动画。

---

## 🧱 架构

```
App（主控制器）
├── Theme              ← 深浅色主题切换（localStorage 持久化）
├── Navbar             ← 毛玻璃导航栏（滚动态、活跃态）
├── Typewriter         ← 打字机标题动画（可调速）
├── MatrixRain         ← Canvas 数字雨（密钥室专属）
├── Vault              ← AES 密钥验证 + 解锁特效（Web Animation API）
├── ArticleReader      ← Markdown → DOM、TOC、进度条
├── MarkdownRenderer   ← 静态管线：高亮/锚点/复制/表格
├── TimelineCanvas     ← 画布时间轴（拖拽、缩放、节点、卡片、筛选）
├── LettersPage        ← 来信展示
└── Crypto             ← AES 解密（静态）
```

**9 个类**，分为 `core/`（通用组件）和 `pages/`（路由页面）。ES 模块化，无需构建即可在现代浏览器中运行。

---

## 📦 CDN 依赖

| 库 | 用途 |
|----|------|
| `marked.js` 9.1.6 | Markdown → HTML |
| `highlight.js` 11.9.0 | 代码语法高亮 |
| `github-markdown-css` 5.6.1 | GitHub 风格排版 |
| `KaTeX` 0.16.9 | 数学公式渲染 |
| `CryptoJS` 4.2.0 | AES 加密（密钥室） |

---

## 🚢 部署

### Vercel（推荐）

Push 到 Vercel — `vercel.json` 自动处理 SPA rewrite 规则。

### 静态托管

```bash
node scripts/build.js
# 托管根目录即可
```

### 本地开发

```bash
python3 scripts/serve.py
# → http://localhost:3000
```

---

<p align="center">
  <sub>由 vibecoding 构建。部署在 Vercel。内容以 AES 加密。</sub>
</p>
