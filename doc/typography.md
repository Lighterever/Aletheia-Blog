# ℵ 网站字体方案

## 设计原则

1. **零延迟优先** — 等宽字体和无衬线 UI 字体走操作系统原生字体栈，零网络加载
2. **单一控制点** — 所有 `font-family` 通过 [base.css](../css/base.css) 的三个 CSS 变量定义，全站统一
3. **跨平台一致** — macOS / Windows / Linux / iOS / Android 各有最优原生字体
4. **可读性** — 正文衬线字体 17px / 行高 1.95，阅读舒适

---

## 字体变量

定义在 [css/base.css](../css/base.css) 的 `:root` 中：

### `--font-sans` — 无衬线 / UI 字体

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue",
             Arial, "Noto Sans SC", sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
             "Noto Color Emoji";
```

| 平台 | 实际渲染字体 |
|------|------------|
| macOS / iOS | San Francisco (系统原生) |
| Windows | Segoe UI (ClearType 优化) |
| Android / Linux | Roboto → Noto Sans SC |
| 其他 | Helvetica Neue → Arial → sans-serif |

末尾的 emoji 字体确保所有平台表情符号正确渲染。

### `--font-serif` — 衬线 / 正文字体

```css
--font-serif: 'Noto Serif SC', 'Source Han Serif CN', 'Times New Roman',
              'Noto Serif', serif;
```

| 平台 | 实际渲染字体 |
|------|------------|
| 所有 (网络加载) | **Noto Serif SC** (Google Fonts, ~30KB subset) |
| 回退 1 | Source Han Serif CN (思源宋体，部分系统预装) |
| 回退 2 | Times New Roman (所有系统原生) |
| 回退 3 | Noto Serif → serif |

**注意**: 刻意排除了 Georgia。Georgia 的拉丁数字是 old-style figures（模仿小写字母高低起伏），无法通过 CSS `font-feature-settings` 修正。`Noto Serif SC` 的拉丁数字天然等高。

### `--font-mono` — 等宽 / 代码字体

```css
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco,
             Consolas, "Liberation Mono", "Courier New", monospace;
```

| 平台 | 实际渲染字体 |
|------|------------|
| macOS 14+ | SF Mono (系统原生) |
| macOS 10-13 | Menlo → Monaco |
| Windows | Consolas (ClearType 优化) |
| Linux | Liberation Mono → Courier New |
| iOS / Android | 系统等宽字体 |

零额外下载，所有平台系统预装。

---

## 字体使用分布

### 页面全局
- `body`: `var(--font-mono)` — 全局默认等宽，各区块按需覆盖

### 各页面/组件

| 区域 | 字体变量 | 说明 |
|------|---------|------|
| 文章正文 `.article-content` | `var(--font-serif)` | 17px, line-height 1.95 |
| 代码块 `pre code` | `var(--font-mono)` | 13px, tab-size 4 |
| 内联代码 `code` | `var(--font-mono)` | 0.85em |
| 导航栏、按钮、标签 | `var(--font-mono)` | 终端/密码学风格 |
| 密钥室、检索页 | `var(--font-mono)` | 统一终端美学 |
| README 卡片文字 | `var(--font-serif)` | 首页摘要 |
| 打字机动效 | `var(--font-mono)` | 24px, 荧光绿 |
| 脚注提示框 | `var(--font-serif)` | 13px |
| 时间轴节点 | `var(--font-mono)` | 终端风格 |
| 来信页面卡片 | `var(--font-serif)` | 正文内容 |

### 特殊用途

| 位置 | 字体 | 原因 |
|------|------|------|
| blockquote 装饰引号 | `Times New Roman` | 纯装饰，一个大引号字符，避免网络字体依赖 |
| KaTeX 数学公式 | KaTeX 自带字体 (Computer Modern) | 数学排版专用，独立字体系统，不受 CSS 变量影响 |
| 凯撒轮 SVG | `monospace` | 纯装饰背景元素 |

---

## Google Fonts 加载

仅加载 **1 个** 网络字体：

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&display=swap"
      rel="stylesheet">
```

- 字重: 400 / 500 / 600 / 700
- `display=swap` — 先用回退字体渲染，加载完成后无缝切换
- 两个 `preconnect` 提前建立连接
- 总下载量约 30KB (subset)

**不再加载**: Inter（改用系统无衬线栈）、JetBrains Mono（改用系统等宽栈）

---

## Markdown 渲染字体效果

### 标题层级

| 级别 | 字号 | 字重 | 字体系列 |
|------|------|------|---------|
| h1 | ~27px | 700 | `--font-serif` (间接继承) |
| h2 | ~21px | 600 | `--font-serif` + `#` 前缀(mono) |
| h3 | ~19px | 600 | `--font-serif` + 竖线装饰 |
| h4 | 17px | 600 | `--font-serif` |
| h5 | 0.9rem | 600 | `--font-serif`, uppercase |
| h6 | 0.85rem | 500 | `--font-serif` |

### 行内元素

| 元素 | 字体 | 特性 |
|------|------|------|
| **粗体** | 继承 + 600 weight | 颜色 `--accent-primary` |
| *斜体* | 继承 | 颜色 `--text-secondary` |
| ~~删除线~~ | 继承 | opacity 0.6 |
| `代码` | `--font-mono` | 0.85em, 紫色, 深色背景 |
| [链接]() | 继承 | 底部边框动画 |
| ==高亮== | 继承 | 渐变黄色背景 |
| 脚注引用 | `--font-mono` | 0.75em |

### 代码块

```
font-family: var(--font-mono)
font-size: 13px
line-height: 1.6
tab-size: 4
```

语法高亮由 highlight.js (`atom-one-dark`) 提供，主题不覆盖字体。

### 列表

| 类型 | 标记字体 | 标记颜色 |
|------|---------|---------|
| 无序列表 | 圆点 (CSS `::before`) | `--accent-primary` |
| 有序列表 | `--font-mono` | `--accent-primary` |
| 任务列表 | 原生 checkbox | `--accent-primary` |

### 表格

font-size 15px，表头 uppercase + letter-spacing 0.04em，无单独字体覆盖。

### 引用块

blockquote 左侧 `4px` 实色边条，渐变背景。装饰引号使用 `Times New Roman`。

### 数学公式 (KaTeX)

使用 KaTeX 自带的 Computer Modern 数学字体，通过 `renderMathInElement()` 自动渲染 `$...$` 和 `$$...$$`。
- 行内公式：继承正文字号
- 块级公式：居中，圆角卡片背景

---

## 构建与缓存

- 每次 `npm run build` 后，`index.html` 的 `<script>` 引用会被注入 `?v=xxx` 版本戳
- 静态文章页 (`posts/*/index.html`) 也加载相同的 `base.css` / `reader.css`，字体一致
- Vercel 部署的 `/data/*` 文件设 `Cache-Control: max-age=0, must-revalidate`
- 这确保更新 `about.md` 或文章内容后，浏览器始终拉取最新版本

---

## 检查清单

运行 `npm run build` 后验证：

- [ ] `index.html` 仅加载 Noto Serif SC 一个 Google Font
- [ ] `posts/*/index.html` 同上
- [ ] `editor/index.html` 加载 favicon.svg 和 favicon
- [ ] 所有 CSS 文件 `font-family` 引用均为 `var(--font-*)`
- [ ] 正文数字等高（Noto Serif SC lining figures）
- [ ] 代码块显示系统原生等宽字体
- [ ] KaTeX 公式正常渲染
- [ ] Emoji 在导航和正文中正确显示
