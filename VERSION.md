# VERSION

## v1.0 — Initial Release (2026-05-16)

The first stable release of ℵ · aletheia. A complete personal blog platform with cryptographic vault, full-text article system, interactive learning timeline, and letters page.

### ✨ Core Systems

**🔐 Cryptographic Vault**
- Terminal-style password input with Matrix Rain background
- AES decryption (CryptoJS), unlock ripple animation (Web Animation API)
- `sessionStorage` persistence — survives refresh, clears on tab close
- Unauthenticated access to protected routes auto-redirects to `/vault`

**📝 Article System**
- `.md` + YAML frontmatter source files in `articles/`
- Build pipeline: `scripts/build.js` → encrypted `data/data.js` + static HTML for SEO (`posts/`)
- Full-text search (title + tags + body) with 300ms debounce
- Tag filtering: multi-select toggle, OR/AND logic, active count
- Sortable listing (DATE / TITLE / TAGS)
- Auto-generated `sitemap.xml` and `robots.txt`

**🧮 Rich Markdown Rendering**
- `marked.js` (GFM + breaks), `highlight.js` (dark/light theme switch)
- `github-markdown-css` baseline typography
- KaTeX math (inline & display, auto-render)
- Code block language labels + copy-to-clipboard buttons
- Heading anchors (hover § icon), table scroll wrapper
- Liquid-glass reader panel, reading progress bar, TOC sidebar

**🕐 Learning Timeline**
- Horizontal canvas with pan, zoom, and click-to-expand detail cards
- Interaction: left-drag / touch pan, ⌘+scroll / pinch zoom, hover preview, click toggle
- Topic bars with freeze-pane labels (text follows viewport on scroll)
- Node merging (same-date entries from different topics)
- Ongoing indicators (gradient fade + pulse dot for topics without `end` date)
- Topic filtering: click bar → dims non-matching nodes (OR logic, multi-select)
- Click viewport blank area to clear all filters
- Year/month tick labels with density-adaptive display
- `pixelsPerDay = 50 × scale^1.3` smooth zoom (25%–200%)
- Locate-to-today button (bottom-right), date search with year/month/day dropdowns
- Expand all / collapse all with animation
- Tips overlay (`?` button) with keyboard/gesture guide
- Dynamic canvas boundaries (expand for card overflow, contract on collapse)
- Collapse animation via CSS `transition` (opacity 0.3s)
- Keyboard navigation: ←→↑↓ pan, `+`/`-` zoom, `0` reset, with smooth transition
- Left boundary anchored at 2026-01-01
- Single-touch pan for mobile

**📬 Letters Page**
- Dedicated page for displaying incoming letters/chronicles
- Date range header, clean list layout

**🎨 Design System**
- Dark/light dual theme, CSS variable-driven, one-click toggle
- Theme state persisted in `localStorage`
- Liquid glass reader, SVG noise texture background, glass-morphism navbar
- 3-tier shadow system, Caesar cipher wheel animation on home page
- Typography: `Noto Serif SC` (body), `JetBrains Mono` (code)

### 🏗️ Architecture

**Modular OOP Design (9 classes)**
```
App (controller)
├── Theme              ← Dual-theme switching
├── Navbar             ← Glass navbar, scroll-aware
├── Typewriter         ← Title animation
├── MatrixRain         ← Canvas digital rain
├── Vault              ← Password auth + unlock effects
├── ArticleReader      ← Markdown → DOM, TOC, progress
├── MarkdownRenderer   ← Static enhancement pipeline
├── TimelineCanvas     ← 800+ line canvas timeline
└── LettersPage        ← Letters display
```

**Project Structure**
- `js/core/` — Reusable core components (5 files)
- `js/pages/` — Route-specific page controllers (4 files)
- `js/app.js` — App controller, routing, Crypto
- `css/` — 7 modular CSS files (base, home, vault, articles, reader, timeline, letters)
- `scripts/build.js` — Unified build pipeline (articles + timeline)
- `scripts/serve.py` — Dev server with SPA fallback rewrite

**Routing**: SPA with History API (no `#`), `vercel.json` rewrite rules

### 🛠️ Developer Experience
- `node scripts/build.js` — single command builds both articles and timeline data
- `python3 scripts/serve.py` — dev server at port 3000 with `Cache-Control: no-store`
- ES modules, no bundler required — runs directly in modern browsers
- All content source files are plain Markdown with YAML frontmatter

### 📦 Dependencies (CDN)
| Library | Version | Usage |
|---------|---------|-------|
| marked.js | 9.1.6 | Markdown parsing |
| highlight.js | 11.9.0 | Code syntax highlighting |
| github-markdown-css | 5.6.1 | Typography baseline |
| KaTeX | 0.16.9 | Math rendering |
| CryptoJS | 4.2.0 | AES encryption |

### 🔧 Technical Highlights
- **Timeline canvas**: virtual coordinate system with `dateToX()`/`clampTranslate()`, `repositionDOM()` for zoom, `daysFromStart` anchor for zoom stability
- **Performance**: `requestAnimationFrame` in zoom/scroll loops, debounced resize, passive scroll listeners
- **Security**: AES-256-CBC encrypted article data, vault gate protection
- **SEO**: auto-generated static HTML pages, sitemap, robots.txt
- **Accessibility**: keyboard-navigable timeline, semantic HTML structure

### 🐛 Bug Fixes (from v0.2)
- Fix SPA route mismatch on refresh (`/timeline` → `/timeline/` redirect)
- Fix keyboard pan direction (ArrowLeft now moves view left)
- Fix collapse animation flicker (CSS transition replaces JS `setTimeout`)
- Fix topic bar flash on deselect (force `animation: none` on removal)
- Fix `dimmed` nodes CSS animation `forwards` locking opacity
- Fix tips overlay animation (pure opacity transition)
- Fix missing `/timeline` rewrite rule in `vercel.json`

### ⚠️ Breaking Changes
- Build script renamed: `build-articles.js` → `build.js`
- Data output moved to `data/` directory
- `style.css` split into 7 modular files in `css/`
- `app.js` split into `js/app.js` + `js/core/` + `js/pages/`
- Script tag `type="module"` required in HTML

---

## v0.2 (2026-05-16)

### Learning Timeline
- New `/timeline` route with horizontal canvas timeline page
- `TimelineCanvas` class: pan (right-drag / touch), zoom (⌘+scroll / pinch)
- Three zoom density levels with smooth `pixelsPerDay` formula
- Timeline data pipeline: `.md` files in `timeline/` → `timeline-data.js`
- Terminal-style control bar + search dropdowns
- Tip overlay (`?` button) with usage guide

### Build System
- `scripts/build-articles.js` → `scripts/build.js`, unified articles + timeline build
- Output `data.js` + `timeline-data.js`

### Other
- New timeline CSS (~1760 lines)
- 404 page with crypto-themed design
- Enhanced navbar glass effect

### Breaking Changes
- Build script renamed

---

## v0.1 (2026-05-15)

### SPA Routing
- Hash routing → History API routing
- `vercel.json` SPA rewrite configuration
- Vault protection redirect

### Design Polish
- Light theme color system refinement
- Navbar glass-morphism + scroll shadow
- Caesar cipher wheel hover animation
- Noise texture background (SVG turbulence)
- 3-tier shadow system
- KaTeX blocks, blockquotes, lists, hr styling
- Responsive enhancements

### Article Search
- Terminal-style listing header with sortable columns
- Multi-tag toggle with OR/AND logic
- URL upgrade: `/article/0` → `/article/{slug}`

---

## v0.0 (2026-05-14)

### Initial Development
- Pure front-end SPA blog
- Home + Vault + Article listing + Article reader
- Hash routing
- Vault password: `aletheia`
- Matrix Rain + ripple unlock effects
- Markdown rendering pipeline (marked + highlight + KaTeX + copy)
- Liquid glass reader, TOC panel, typewriter title, progress bar
- `articles/` source → `data.js` build script
