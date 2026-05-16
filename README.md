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
  <a href="#-features"><strong>Features</strong></a> ·
  <a href="#-quick-start"><strong>Quick Start</strong></a> ·
  <a href="#-project-structure"><strong>Structure</strong></a> ·
  <a href="#-writing-content"><strong>Writing</strong></a> ·
  <a href="#-deployment"><strong>Deploy</strong></a>
</p>

---

A pure front-end minimalist blog built as a SPA with History API routing. Features a cryptographic vault as the content gateway — unlock to browse articles. Dark/light dual-theme, Markdown rendering, KaTeX math, code highlighting, an interactive learning timeline, and a letters page.

---

## ✨ Features

<table>
<tr><td width="50%">

**🔐 Cryptographic Vault**
Matrix Rain background, terminal-style password input, AES decryption, unlock ripple animation.

**📝 Article System**
Markdown with YAML frontmatter. Build pipeline generates encrypted data + static HTML for SEO. Tag filtering with OR/AND logic, full-text search with 300ms debounce.

**🕐 Learning Timeline**
Horizontal canvas timeline. Pan (left-drag / touch), zoom (⌘+scroll / pinch), click-to-expand detail cards. Topic bars with freeze-pane labels, node merging, ongoing indicators, topic filtering, hover preview, date search, locate-to-today.

</td><td width="50%">

**🎨 Dual-Theme Design**
CSS variable-driven. Liquid glass reader, noise texture background, glass-morphism navbar, 3-tier shadow system. Dark: `#0a0a0f` / Light: `#fafafa`.

**🧮 Rich Typography**
KaTeX math (inline & display), syntax highlighting via highlight.js, GF Markdown via marked.js, code block language labels + copy buttons, heading anchors, reading progress bar, TOC panel.

**📬 Letters Page**
A dedicated space for incoming letters/chronicles with date-range display.

</td></tr>
</table>

---

## 📦 Project Structure

```
/
├── index.html              ← SPA entry (all views)
│
├── css/                    ← CSS modules (7 files)
│   ├── base.css            ← CSS reset, variables, utilities
│   ├── home.css            ← Home page + Caesar wheel animation
│   ├── vault.css           ← Vault + Matrix Rain
│   ├── articles.css        ← Article listing + tag filters
│   ├── reader.css          ← Article reader + TOC + progress bar
│   ├── timeline.css        ← Timeline canvas (nodes, bars, cards, controls)
│   └── letters.css         ← Letters page
│
├── js/                     ← Front-end logic (ES modules)
│   ├── app.js              ← App controller, routing, Crypto
│   ├── utils.js            ← Shared utilities
│   ├── core/               ← Core components (5 files)
│   └── pages/              ← Page controllers (4 files)
│
├── articles/               ← Article sources (.md + YAML frontmatter)
├── timeline/               ← Timeline sources (.md + YAML frontmatter)
│
├── data/                   ← Build outputs
│   ├── data.js             ← Encrypted article data
│   └── timeline-data.js    ← Timeline data
│
├── posts/                  ← Static HTML (SEO, auto-generated)
│
├── scripts/                ← Tooling
│   ├── build.js            ← Unified build (articles + timeline)
│   └── serve.py            ← Dev server with SPA rewrite
│
├── vercel.json             ← Vercel SPA rewrite rules
├── 404.html                ← Crypto-themed 404 page
├── sitemap.xml             ← Auto-updated sitemap
└── robots.txt              ← SEO robots
```

---

## 🚀 Quick Start

```bash
# Clone and enter
git clone <repo-url> && cd aletheia

# Build data files
node scripts/build.js

# Start dev server
python3 scripts/serve.py
# → http://localhost:3000
```

**Vault password**: `aletheia`

---

## 🗺️ Routes

| URL | Page | Navbar | Protected |
|-----|------|--------|-----------|
| `/` | Home | ✓ | — |
| `/vault` | Vault (password gate) | ✓ | — |
| `/articles` | Article listing + search | ✓ | 🔒 |
| `/article/{slug}` | Article reader + TOC | ✗ | 🔒 |
| `/timeline` | Learning timeline canvas | custom bar | — |
| `/letters` | Letters page | ✓ | — |
| `/readme` | Site introduction (standalone) | ✗ | — |

SPA architecture, History API routing (no `#`). Vault state persists in `sessionStorage` — survives refresh, clears on tab close.

---

## 📝 Writing Content

### Articles

Create `.md` files in `articles/` with YAML frontmatter:

```markdown
---
title: My Article Title
date: 2026-05-20
tags: [cryptography, math]
id: article-slug
description: SEO description (one line)
---

# My Article Title

## Section One

Content here...
```

| Field | Required | Notes |
|-------|:-------:|-------|
| `title` | ✓ | Page title + listing display |
| `date` | ✓ | `YYYY-MM-DD`, used for sorting & SEO |
| `tags` | | Comma-separated, supports CJK: `[密码学, 数学]` |
| `id` | | URL slug, defaults to filename |
| `description` | | SEO meta description |

**Heading rules**: H1 exactly once (must match frontmatter `title`), then H2 → H3. No skipping levels.

### Timeline Entries

Create `.md` files in `timeline/` with YAML frontmatter + `### YYYY-MM-DD` date entries:

```markdown
---
id: discrete-math
title: Discrete Mathematics
tags: [math, CS]
start: 2026-04-20
---

### 2026-04-22
tags: milestones, logic

Worked through propositional logic basics.

### 2026-04-25
tags: set-theory

Set theory and cardinality.
💡 Diagonal argument — self-reference leads to incompleteness.
```

| Field | Scope | Notes |
|-------|-------|-------|
| `title` | frontmatter | Topic name (empty = standalone loose node) |
| `tags` | frontmatter | Topic-level tags (applied to all cards) |
| `start` / `end` | frontmatter | `YYYY-MM-DD`. No `end` = ongoing (gradient fade + pulse dot) |
| `tags:` | entry line | Entry-level tags (merged with topic tags) |
| `💡` | line prefix | Insight moment — node gets pulse glow animation |

Build everything with:

```bash
node scripts/build.js
```

---

## 🎨 Design System

| CSS Variable | Dark | Light |
|-------------|------|-------|
| `--bg-primary` | `#0a0a0f` | `#fafafa` |
| `--accent-primary` | `#00ff88` | `#0a7d4f` |
| `--text-primary` | `#e8e8f0` | `#1a1a2e` |
| `--text-muted` | `#606080` | `#8888a0` |

**Typography**: Body `Noto Serif SC`, Mono `JetBrains Mono`.

**Highlights**: Liquid-glass reader, glass-morphism navbar with scroll-aware hide/show, noise texture background (SVG turbulence), 3-tier shadow system, Caesar cipher wheel animation on home page.

---

## 🧱 Architecture

```
App (controller)
├── Theme              ← Dual-theme with localStorage persistence
├── Navbar             ← Glass navbar, scroll-aware, active state
├── Typewriter         ← Title animation with configurable speed
├── MatrixRain         ← Canvas-based digital rain (vault only)
├── Vault              ← AES auth, unlock effects (Web Animation API)
├── ArticleReader      ← Markdown → DOM, TOC, progress bar
├── MarkdownRenderer   ← Static pipeline: highlight / anchor / copy / table
├── TimelineCanvas     ← Canvas timeline (drag, zoom, nodes, cards, filter)
├── LettersPage        ← Letters display
└── Crypto             ← AES decryption (static)
```

**9 classes** organized into `core/` (reusable) and `pages/` (route-specific). ES modules — no bundler needed, runs directly in modern browsers.

---

## 📦 CDN Dependencies

| Library | Purpose |
|---------|---------|
| `marked.js` 9.1.6 | Markdown → HTML |
| `highlight.js` 11.9.0 | Code syntax highlighting |
| `github-markdown-css` 5.6.1 | GitHub-style typography |
| `KaTeX` 0.16.9 | LaTeX math rendering |
| `CryptoJS` 4.2.0 | AES encryption (vault) |

---

## 🚢 Deployment

### Vercel (recommended)

Push to Vercel — `vercel.json` handles SPA rewrite rules automatically.

### Static hosting

```bash
node scripts/build.js
# Serve the root directory as a static site
```

### Local dev

```bash
python3 scripts/serve.py
# → http://localhost:3000
```

---

<p align="center">
  <sub>Built with vibecoding. Deployed on Vercel. Content encrypted with AES.</sub>
</p>
