# VERSION

## v0.2 (2026-05-16)

### 学习轨迹时间轴
- 新增 `/timeline` 路由，横向画布时间轴页面
- `TimelineCanvas` 类：支持平移（右键拖拽/双指滑动）、缩放（⌘+滚轮/Ctrl+滚轮/双指捏合）
- 三级信息密度：概览（主题条+年份）→ 卡片（完整日期+可展开卡片）→ 放大（大号节点+宽卡片）
- 缩放公式 `pixelsPerDay = 50 × scale^1.3`，支持 25%-120%+ 缩放范围
- 彩色主题条（`renderTopicBar`）、节点渲染（`renderNode`）、详情卡片（`renderCard`）
- 主题筛选（`applyTopicFilter`）、定位今天（`locateToToday`）
- 💡 灵感时刻节点脉冲高亮效果
- 终端风格控制栏（`.timeline-search-bar`）+ 使用指南弹窗（`.tips-overlay`）
- `timeline/` 目录存放学习记录 Markdown 文件，YAML frontmatter 定义主题 ID/标题/标签/日期

### 构建系统重构
- `scripts/build-articles.js` → `scripts/build.js`，合并文章与时间轴数据生成
- 新增 `parseTimelineContent()` / `parseTimelineFile()` / `generateTimelineJs()` 函数
- 输出 `data.js` + `timeline-data.js` 两个数据文件
- `package.json` 构建命令更新为 `node scripts/build.js`

### 样式系统扩展
- 新增 ~1760 行时间轴 CSS：画布视口（`.canvas-viewport`/`.canvas-content`）、节点、主题条
- 新增 CSS 变量：`--canvas-bg`、`--node-default`、`--node-insight`、`--node-milestone`、`--node-current`
- 导航栏毛玻璃效果增强（`blur(24px)` → `blur(28px)`），新增 `slide-up` 动画
- 404 页面（`404.html`）：密码学风格设计、ASCII 艺术、扫描线效果、点击彩蛋

### 路由与导航
- 新增 `/timeline`（轨迹）、`/letters`（来信）导航链接
- 时间轴页面使用终端式顶栏，不显示常规导航

### 其他改进
- Python 开发服务器 `serve.py`：SPA 路由支持、禁用缓存、端口 3000
- 文章阅读器字数统计：中英文分开统计（CJK 正则），阅读时间 `中文/400 + 英文/250`
- 复制功能增强：添加错误处理和用户反馈
- README 文案微调："那些想完就没了的念头" → "那些想了又想的念头"

### 破坏性变更
- 构建脚本重命名：`build-articles.js` → `build.js`，需更新 CI/CD 配置
- 删除旧功能规划文档（`IMPROVEMENT/` 目录下 4 个 `.md` 文件）

---

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
