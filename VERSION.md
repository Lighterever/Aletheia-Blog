# VERSION

## v0.1 (2026-05-15)

### SPA 路由改造
- Hash 路由（`#home`、`#vault`）升级为 History API 路由（`/`、`/vault`）
- `vercel.json` SPA rewrite 配置
- 所有 `<a>` 标签 href 更新
- 全局链接点击拦截 + popstate 事件
- 密钥室保护重定向
- 本地 `file://` 协议兼容

### 全站美化
- 浅色主题色彩系统精确化（`#fafafa` 微暖白、`#0a7d4f` 沉稳深绿）
- 导航栏毛玻璃效果 + 滚动态阴影增强
- Caesar 密码轮 hover 脉冲发光动画
- 噪点纹理背景（SVG turbulence）
- 三级阴影系统（`.shadow-flat` / `-elevated` / `-floating`）
- KaTeX 公式块美化
- 引用块左绿条 + 斜体、列表 `›` 标记、hr 渐变分割线
- 响应式增强（平板 680px、大屏 800px + 72ch、`clamp()` 字体）

### 文章检索页筛选升级
- 终端风格列表头（DATE / TITLE / TAGS），列头可点击排序
- 多标签同时筛选（toggle 选中/取消）
- OR / AND 筛选逻辑切换
- 活跃筛选计数 + 一键清除
- Exit 按钮移至顶栏紧凑红色 pill
- 文章列表 `data-id` 改为文章 slug（不再用数字索引）
- URL 从 `/article/0` 升级为 `/article/{slug}`

### 文章阅读增强
- 阅读页标签 pill 显示（日期 + 标签 badges）
- 检索页标签 pill 增强（强调色背景 + 描边 + 圆角）
- 标签按钮微光边框 + hover/active 发光动画

### 技术改进
- `build-articles.js` frontmatter 标签解析改用 `split(',')`，支持中文标签
- `escapeStringLiteral` 和 `escapeTemplateLiteral` 转义完整性修复
- 返回检索页时清空筛选状态和 OR/AND 模式

---

## v0.0 (2026-05-14)

### 初始开发

- 纯前端极简博客 SPA 架构
- 主页 + 密钥室 + 文章检索页 + 文章阅读页
- Hash 路由（`#home`、`#vault`、`#articles`、`#article/{id}`）
- 密钥验证 `aletheia`，sessionStorage 持久化
- Matrix Rain 背景动画 + 环形扩散解锁特效
- 文章管理：`articles/` 目录 `.md` + frontmatter → `data.js` 构建脚本

### Markdown 渲染升级

- `MarkdownRenderer` 静态类渲染管线
- `marked.js` 统一配置（GFM + breaks + headerIds: false）
- `highlight.js` 语法高亮 + 深浅主题切换
- `github-markdown-css` 排版基线
- 代码块语言标签 + 复制按钮（Clipboard API）
- 标题锚点（hover § 符号）
- 表格横向滚动包装
- 液态玻璃阅读器（毛玻璃 + 边缘渐变过渡）
- TOC 目录面板 + FAB 悬浮按钮
- 打字机标题动画 + 阅读进度条
