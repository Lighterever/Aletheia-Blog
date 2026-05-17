# ℵ · aletheia — Markdown 渲染系统指南

> 最后更新：2026-05-17  
> 渲染引擎：marked.js 9.1.6 + 自定义扩展管线

---

## 一、渲染管线架构

```
原始 .md 文件
  → emojify 预处理     (:smile: → 😄)
  → md-preprocessor    (==高亮== ~下标~ ^上标^ Setext→ATX, $$提取)
  → marked.js GFM 解析 (marked.parse)
  → marked-footnote    (脚注/尾注)
  → marked-alert       (GitHub Alert Callouts)
  → restoreLatex       ($$块级公式回插, 避免被<p>包裹)
  → highlight.js       (代码语法高亮)
  → KaTeX              (数学公式渲染)
  → MarkdownRenderer   (锚点、复制按钮、表格包装、脚注悬浮框)
```

### 组件清单

| 层级 | 组件 | 来源 | 文件 / CDN | 职责 |
|------|------|------|-----------|------|
| L0 | emojify | 自建 | `js/utils/emojify.js` | 30+ emoji 短码 → Unicode |
| L0 | md-preprocessor | 自建 | `js/utils/md-preprocessor.js` | `==` `~` `^` `====` `$$` 转换 |
| L1 | marked | CDN+npm | marked 9.1.6 | GFM 核心解析 |
| L1 | marked-footnote | CDN+npm | `marked-footnote@1.4.0` | `[^label]` 脚注/尾注 |
| L1 | marked-alert | CDN+npm | `marked-alert@2.1.2` | `> [!NOTE]` 等 Callout |
| L2 | highlight.js | CDN | 11.9.0 | 代码语法高亮 |
| L2 | KaTeX | CDN | 0.16.9 | 数学公式渲染 |
| L2 | MarkdownRenderer | 自建 | `js/core/markdown-renderer.js` | 锚点/复制按钮/表格包装/脚注悬浮框 |

---

## 二、格式速查

### 2.1 标题 (Headings)

| 语法 | 渲染 | 备注 |
|------|------|------|
| `# H1` ～ `###### H6` | `<h1>` ～ `<h6>` | H2 带 `#` 前缀装饰；H3 带左侧竖线 |
| `Title\n====` | `<h2>` | Setext 风格，预处理器转换为 `##` |
| `Title\n----` | `<h2>` | Setext 风格，marked 原生支持 |

### 2.2 文本样式 (Inline Text)

| 语法 | 渲染 | 类型 |
|------|------|------|
| `**粗体**` | `<strong>` | 标准 GFM |
| `*斜体*` | `<em>` | 标准 GFM |
| `***粗斜体***` | `<em><strong>` | 标准 GFM |
| `~~删除线~~` | `<del>` | 标准 GFM |
| `` `行内代码` `` | `<code>` | 标准 GFM |
| `==高亮==` | `<mark>` | **预处理器扩展** |
| `H~2~O` | `<sub>` | **预处理器扩展**（下标） |
| `E=mc^2^` | `<sup>` | **预处理器扩展**（上标） |
| `<u>下划线</u>` | 蓝色下划线 | 原生 HTML |
| `<ins>插入文本</ins>` | 荧光笔高亮下划线 | 原生 HTML（视觉与 `<u>` 有区分） |
| `<mark>文本</mark>` | 默认高亮背景 | 原生 HTML |
| `<mark style="background:#ff6b6b">` | 自定义背景色 | 原生 HTML，支持 hex 颜色 |
| `<kbd>Ctrl</kbd>` | 键盘按键 | 原生 HTML，带边框凸起效果 |
| `<abbr title="解释">术语</abbr>` | 点状下划线 | 原生 HTML，hover 显示 title |
| `<small>小字</small>` | 0.8em 灰色 | 原生 HTML |

### 2.3 排版与对齐

| 语法 | 效果 |
|------|------|
| `<p align="left">` | 左对齐 |
| `<p align="center">` | 居中对齐 |
| `<p align="right">` | 右对齐 |
| `<p align="justify">` | 两端对齐 |
| `<center>…</center>` | 居中容器 |

### 2.4 字体颜色与大小

| 语法 | 说明 |
|------|------|
| `<font color="#ff6b6b">` | 颜色（hex 值） |
| `<font color="#a29bfe">` | 颜色（hex 值） |
| `<font color="#00ff88">` | 颜色（hex 值） |
| `<font size="1">` … `<font size="7">` | 字号：1=0.65em, 3=1em, 5=1.5em, 7=2.2em |

### 2.5 链接与图片

| 语法 | 说明 |
|------|------|
| `[文本](url)` | 内部链接（蓝色下划线，hover 变为绿色） |
| `[文本](https://…)` | 外部链接 |
| `[文本](url "标题")` | 带 title 属性 |
| `<https://example.com>` | 裸 URL 自动链接 |
| `<email@example.com>` | 邮件链接 |
| `![alt](url)` | 图片（支持点击灯箱放大） |

### 2.6 列表

| 语法 | 说明 |
|------|------|
| `-` / `*` / `+` | 无序列表，3 层嵌套各有不同圆点装饰 |
| `1.` 数字顺序 | 有序列表，2 层嵌套各有不同编号样式 |
| `- [ ]` | 任务列表（未完成） |
| `- [x]` | 任务列表（已完成） |

### 2.7 引用块 (Blockquote)

| 语法 | 说明 |
|------|------|
| `> 引用内容` | 带装饰引号 `"` 和渐变背景 |
| `> > 嵌套引用` | 嵌套引用（不同颜色和缩进） |

### 2.8 GitHub Alert Callouts（扩展）

> 使用 `marked-alert` 扩展，渲染 `> [!TYPE]` 语法块。带 SVG 图标和各色左边框。

| 语法 | 类型 | 边框色 | 用途 |
|------|------|--------|------|
| `> [!NOTE]` | NOTE | `#539BF5` 蓝 | 辅助说明、背景信息 |
| `> [!TIP]` | TIP | `#57AB5A` 绿 | 技巧、建议 |
| `> [!IMPORTANT]` | IMPORTANT | `#986EE2` 紫 | 关键信息、不得遗漏 |
| `> [!WARNING]` | WARNING | `#C69026` 橙 | 注意事项、需要关注 |
| `> [!CAUTION]` | CAUTION | `#E5534B` 红 | 危险警告、可能产生负面后果 |

写法示例：

```markdown
> [!WARNING]
> 这段内容需要用户特别注意。
```

### 2.9 代码块

| 语法 | 说明 |
|------|------|
| ` ```lang\n…\n``` ` | 带语言标注（highlight.js 语法高亮 + 语言标签 + 复制按钮） |
| ` ```\n…\n``` ` | 无语言标注 |
| ``` ```python ```、``` ```haskell ```、``` ```bash ``` 等 | 支持所有 highlight.js 语言 |

### 2.10 表格

| 语法 | 说明 |
|------|------|
| `\| A \| B \|` + `\| --- \| --- \|` | 标准 GFM 表格，斑马纹 + 横向滚动 |

支持表头/表体分离、左右对齐（`:---` / `:---:` / `---:`）。

### 2.11 分割线

| 语法 | 渲染 |
|------|------|
| `---` / `***` / `___` | 中央 `· · ·` 装饰分割线 |

### 2.12 折叠面板 (`<details>`)

```html
<details>
<summary>点击展开</summary>

支持内嵌 markdown 格式。

</details>
```

支持 `open` 属性默认展开。箭头旋转动画。

### 2.13 定义列表 (`<dl>`)

```html
<dl>
<dt>术语A</dt>
<dd>对术语A的定义和解释。</dd>
<dt>术语B</dt>
<dd>对术语B的定义和解释。</dd>
</dl>
```

渲染为带圆角边框和浅色背景的卡片式列表块。

### 2.14 Emoji 短码（扩展）

> 通过自建 `emojify` 预处理器转换。常用短码：

😄 `:smile:` | 🚀 `:rocket:` | ✨ `:sparkles:` | ❤️ `:heart:` | 🔥 `:fire:`
💡 `:bulb:` | ⚠️ `:warning:` | ✅ `:check:` | ⭐ `:star:` | ⚡ `:zap:`
📖 `:book:` | 🔑 `:key:` | 🔒 `:lock:` | ⚙️ `:gear:` | 💯 `:100:`
👏 `:clap:` | 👍 `:+1:` | 🎉 `:tada:` | ☕ `:coffee:` | 🍕 `:pizza:`

### 2.15 脚注（扩展）

> 通过 `marked-footnote` 扩展，支持标准 GFM 脚注语法。

| 语法 | 说明 |
|------|------|
| `正文[^label]` | 行内脚注引用，渲染为上标链接 |
| `[^label]: 内容` | 脚注定义，渲染到文末 `.footnotes` 区域 |

**交互增强**：鼠标悬浮脚注上标时显示浮框预览内容（无须跳转）。点击仍可跳转到文末区域。

同一脚注可被多次引用，自动编号且回链独立编号。

### 2.16 数学公式 (LaTeX / KaTeX)

| 语法 | 说明 |
|------|------|
| `$E=mc^2$` | 行内公式 |
| `$$\int_0^\infty e^{-x^2}dx$$` | 块级公式（独立渲染容器） |

> 预处理器自动将 `$$...$$` 提取为独立 `<div class="katex-block-wrapper">`，避免 marked 将其错误包裹在 `<p>` 中导致 KaTeX 无法识别。

支持全部 KaTeX 语法：矩阵、积分、求和、希腊字母、箭头、括号等。

### 2.17 HTML 实体与转义

| 语法 | 渲染 |
|------|------|
| `&amp;` | `&` |
| `&lt;` | `<` |
| `&gt;` | `>` |
| `&quot;` | `"` |
| `&copy;` | © |
| `&reg;` | ® |
| `&trade;` | ™ |
| `\*` `\_` `\`` | 反斜杠转义 markdown 标记字符 |

---

## 三、CSS 设计系统

### 主题适配

所有格式均适配 **暗色主题** 和 **浅色主题**（`[data-theme="light"]`）。

### 样式亮点

| 元素 | 暗色 | 浅色 | 特性 |
|------|------|------|------|
| 阅读容器 | 液态玻璃背景 (blur 60px) | 半透明白 | 渐变边缘融入背景 |
| 代码块 | 深色卡片 + 语言标签 + 复制按钮 | 浅灰 `#f6f8fa` | highlight.js 高亮 |
| 引用块 | 蓝紫渐变 + 装饰引号 `"` | 同 | 嵌套引用自动区分 |
| 表格 | 暗色斑马纹 | 浅色斑马纹 | 横向溢出滚动 |
| Alert | 5 色左边框 (12% 透明度背景) | 同 | 等宽字体大写标题 |
| 脚注浮框 | 深色卡片 + 绿色边框光晕 | 浅色卡片 | 入场动画 |
| KaTeX 容器 | 半透明紫调卡片 | 浅灰卡片 | hover 边框高亮 |
| 定义列表 | 圆角边框卡片 | 同 | 等宽字体术语 |
| `<ins>` | 荧光笔高亮下划线 | 同 | 与 `<u>` 区分明显 |
| 链接 | 蓝色下划线 → hover 绿色 | 深蓝 → 绿色 | 无外链图标 |

---

## 四、文件清单

| 文件 | 作用 |
|------|------|
| `index.html` | SPA 入口，加载 emojify / preprocessor / marked / footnote / alert / hljs / KaTeX |
| `scripts/build.js` | 静态 HTML 构建，包含完整渲染管线 + 内联脚注浮框 JS |
| `js/core/markdown-renderer.js` | 浏览器端后处理：代码块、锚点、表格包装、脚注悬浮 |
| `js/utils/emojify.js` | Emoji 短码 → Unicode 映射表 |
| `js/utils/md-preprocessor.js` | `==` `~` `^` `====` 转换 + `$$` 提取/回插 |
| `css/reader.css` | 文章阅读器全格式 CSS（~1200 行） |
| `css/base.css` | 设计 tokens、主题变量、全局布局 |

---

## 五、注意事项

| 场景 | 建议 |
|------|------|
| `==高亮==` 在代码块附近 | 行内代码请用 `` ` `` 包裹；高亮文本用 `==` 或 `<mark>` |
| `~H~2~O` 连续下标 | 预处理器要求每个 `~` 对不紧邻；复杂情况用 `H<sub>2</sub>O` |
| 块级公式 `$$` | 必须独立成段（前后空行），预处理器提取后回插为独立 `<div>` |
| 脚注内容含多段落 | 后续段落需要缩进 4 空格对齐到 `[^label]:` 的行首 |
| 引用块内的代码块 | 需要 4 空格缩进（`> ` 后补 4 空格或 tab） |
| 预处理器在 Node.js 和浏览器两端行为 | 完全一致，共用同一 `md-preprocessor.js` |
| 静态 HTML 页面 vs SPA | 二者共用相同 CSS 和核心渲染逻辑，SPA 额外享受 MarkdownRenderer 后处理 |
