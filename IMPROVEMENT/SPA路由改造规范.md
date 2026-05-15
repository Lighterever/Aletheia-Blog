# SPA 路由改造规范文档

> 博客网站 Aletheia Blog（https://www.lighterever.com）
>
> **改造目标**：将 Hash 路由（`#home`、`#vault`、`#article/xxx`）改为 History API 路由，实现干净的 URL

---

## 一、改动概述

### 核心变更

| 变更项 | Hash 路由（旧） | History API 路由（新） |
|--------|-----------------|------------------------|
| 首页 | `lighterever.com/#home` | `lighterever.com/` |
| 密钥室 | `lighterever.com/#vault` | `lighterever.com/vault` |
| 文章列表 | `lighterever.com/#articles` | `lighterever.com/articles` |
| 文章详情 | `lighterever.com/#article/123` | `lighterever.com/article/123` |
| 路由监听 | `hashchange` 事件 | `popstate` 事件 |
| 路由获取 | `location.hash` | `location.pathname` |
| 路由设置 | `location.hash = '#xxx'` | `history.pushState()` |

### URL 对照表

| 页面 | 旧 URL | 新 URL |
|------|--------|--------|
| 首页 | `/#home` | `/` |
| 密钥室 | `/#vault` | `/vault` |
| 文章列表 | `/#articles` | `/articles` |
| 文章详情 | `/#article/{id}` | `/article/{id}` |
| README | `/#readme` | `/readme` |

### 改动文件清单

| 文件 | 改动内容 |
|------|----------|
| `vercel.json` | **新增**，配置 rewrite 规则 |
| `index.html` | 修改所有链接 href 属性 |
| `app.js` | 改造路由监听、解析、导航逻辑 |

---

## 二、vercel.json 配置

**文件路径**：`/app/data/blog/vercel.json`

**说明**：SPA 应用需要在 Vercel 部署时配置 rewrites 规则，将所有路径重写到 `index.html`，否则刷新页面或直接访问非根路径会返回 404。

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**完整 vercel.json 文件内容**：

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 三、index.html 链接修改

以下是需要修改的所有 `<a>` 标签链接，逐条列出原代码、新代码和所在行号。

### 3.1 导航栏 Logo

| 属性 | 值 |
|------|-----|
| 所在行 | 第 39 行 |
| 原代码 | `<a href="#home" class="nav-logo">` |
| 新代码 | `<a href="/" class="nav-logo">` |

### 3.2 导航栏首页链接

| 属性 | 值 |
|------|-----|
| 所在行 | 第 44 行 |
| 原代码 | `<a href="#home" class="nav-link" data-page="home">首页</a>` |
| 新代码 | `<a href="/" class="nav-link" data-page="home">首页</a>` |

### 3.3 导航栏密钥室链接

| 属性 | 值 |
|------|-----|
| 所在行 | 第 45 行 |
| 原代码 | `<a href="#vault" class="nav-link vault-link">` |
| 新代码 | `<a href="/vault" class="nav-link vault-link">` |

### 3.4 移动端首页链接

| 属性 | 值 |
|------|-----|
| 所在行 | 第 58 行 |
| 原代码 | `<a href="#home" class="mobile-nav-link" data-page="home">首页</a>` |
| 新代码 | `<a href="/" class="mobile-nav-link" data-page="home">首页</a>` |

### 3.5 移动端密钥室链接

| 属性 | 值 |
|------|-----|
| 所在行 | 第 59 行 |
| 原代码 | `<a href="#vault" class="mobile-nav-link" data-page="vault">密钥室</a>` |
| 新代码 | `<a href="/vault" class="mobile-nav-link" data-page="vault">密钥室</a>` |

### 3.6 主页密钥室入口按钮

| 属性 | 值 |
|------|-----|
| 所在行 | 第 79 行 |
| 原代码 | `<a href="#vault" class="vault-btn" id="vaultBtn">` |
| 新代码 | `<a href="/vault" class="vault-btn" id="vaultBtn">` |

---

## 四、app.js 路由改造

> **核心原则**：改动最小化，只改路由相关部分，不破坏密钥室解密、文章渲染、主题切换等功能。

### 4.1 路由监听改造

#### 旧代码（第 549-552 行）

```javascript
window.addEventListener('hashchange', () => {
    if (this.currentPage === 'article_reader') return;
    this.navigate((window.location.hash || '#home').replace('#', ''));
});
```

#### 新代码

```javascript
window.addEventListener('popstate', () => {
    if (this.currentPage === 'article_reader') return;
    this.handleRouteChange();
});
```

**说明**：将 `hashchange` 事件改为 `popstate` 事件。`popstate` 在浏览器历史记录变化时触发（后退/前进按钮）。

---

### 4.2 路由解析改造

#### 4.2.1 初始路由判断（第 546-547 行）

##### 旧代码

```javascript
const hash = (window.location.hash || '#home').replace('#', '');
this.navigate(hash);
```

##### 新代码

```javascript
const path = this.getPathFromUrl();
this.navigateToPath(path);
```

##### 新增辅助函数

在 `App` 类中添加以下两个辅助方法：

```javascript
getPathFromUrl() {
    const path = window.location.pathname;
    if (!path || path === '/') return 'home';
    return path.replace(/^\//, '') || 'home';
}

navigateToPath(path) {
    // 解析路径并导航
    if (path === 'readme') {
        this.navigate('readme');
        return;
    }
    if (path.startsWith('article/')) {
        if (!sessionStorage.getItem('vaultUnlocked')) {
            history.pushState(null, '', '/vault');
            this.navigate('vault');
            return;
        }
        const id = parseInt(path.replace('article/', ''), 10);
        if (!isNaN(id)) {
            this.openBlogArticle(id);
            return;
        }
    }

    const protectedPages = ['articles', 'encrypted_list'];
    if (protectedPages.includes(path) && !sessionStorage.getItem('vaultUnlocked')) {
        history.pushState(null, '', '/vault');
        this.navigate('vault');
        return;
    }

    this.navigate(path);
}
```

---

### 4.3 页面切换改造（navigate 函数）

#### 旧代码（第 563-626 行）中的 `window.location.hash` 设置

| 位置 | 旧代码 |
|------|--------|
| 第 570 行 | `window.location.hash = '#vault';` |
| 第 583 行 | `window.location.hash = '#vault';` |
| 第 596 行 | `window.location.hash = '#home';` |
| 第 603 行 | `window.location.hash = '#articles';` |
| 第 615 行 | `window.location.hash = '#vault';` |

#### 新 navigate 函数

```javascript
navigate(page) {
    if (page === 'readme') {
        this.openReadme();
        return;
    }
    if (page.startsWith('article/')) {
        if (!sessionStorage.getItem('vaultUnlocked')) {
            history.pushState(null, '', '/vault');
            this.navigate('vault');
            return;
        }
        const id = parseInt(page.replace('article/', ''), 10);
        if (!isNaN(id)) {
            this.openBlogArticle(id);
            return;
        }
    }

    const protectedPages = ['articles', 'encrypted_list'];
    if (protectedPages.includes(page) && !sessionStorage.getItem('vaultUnlocked')) {
        history.pushState(null, '', '/vault');
        this.navigate('vault');
        return;
    }

    this.hideAllPages();
    this.currentPage = page;

    // 更新 URL（不触发 popstate）
    this.updateBrowserUrl(page);

    switch (page) {
        case 'home':
            this.pages.home?.classList.remove('hidden');
            this.navbar.show();
            this.navbar.updateActive('home');
            break;
        case 'articles':
            this.pages.articles?.classList.remove('hidden');
            this.navbar.show();
            this.navbar.updateActive('vault');
            this.renderArticleRetrieval();
            break;
        case 'vault':
            this.pages.vault?.classList.remove('hidden');
            this.mainContainer?.classList.remove('hidden');
            this.navbar.show();
            this.navbar.updateActive('vault');
            this.matrixRain.start();
            if (this.vault.hintDisplay) {
                this.vault.hintDisplay.textContent = 'truth is an event';
            }
            setTimeout(() => this.vault.keyInput?.focus(), 100);
            break;
        case 'encrypted_list':
            this.pages.encrypted_list?.classList.remove('hidden');
            this.navbar.hide();
            break;
        case 'article_reader':
            this.pages.article_reader?.classList.remove('hidden');
            this.navbar.hide();
            break;
    }
}
```

#### 新增 updateBrowserUrl 方法

```javascript
updateBrowserUrl(page) {
    const urlMap = {
        'home': '/',
        'vault': '/vault',
        'articles': '/articles',
        'encrypted_list': '/articles',
        'article_reader': window.location.pathname // 保持当前路径
    };
    const url = urlMap[page] || '/';
    history.replaceState(null, '', url);
}
```

---

### 4.4 文章打开时的 URL 设置

#### 旧代码（第 713 行）

```javascript
window.location.hash = idx >= 0 ? '#article/' + idx : '#readme';
```

#### 新代码

```javascript
history.pushState({ articleId: idx }, '', '/article/' + idx);
```

---

### 4.5 密钥室解锁后导航

#### 旧代码（第 353 行，在 Vault 类的 submit 方法中）

```javascript
this.app.navigate('articles');
```

#### 新代码

保持不变，因为 `navigate('articles')` 会通过 `updateBrowserUrl` 自动更新 URL。

---

### 4.6 导航链接点击处理

#### 方案：全局事件委托

在 `bindEvents` 方法中添加链接点击拦截：

```javascript
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="/"]');
    if (!link) return;
    
    // 阻止默认行为，使用 pushState
    e.preventDefault();
    
    const href = link.getAttribute('href');
    const path = href.replace(/^\//, '') || 'home';
    
    // 处理根路径
    if (href === '/' || href === '') {
        this.navigate('home');
        return;
    }
    
    // 根据路径导航
    if (path === 'vault') {
        this.navigate('vault');
    } else if (path === 'articles') {
        this.navigate('articles');
    }
});
```

---

### 4.7 后退/前进处理（popstate 事件）

#### 新增 handleRouteChange 方法

```javascript
handleRouteChange() {
    const path = this.getPathFromUrl();
    
    // 解析路径
    if (path === 'home') {
        this.navigate('home');
    } else if (path === 'vault') {
        this.navigate('vault');
    } else if (path === 'articles' || path === '') {
        if (sessionStorage.getItem('vaultUnlocked')) {
            this.navigate('articles');
        } else {
            this.navigate('vault');
        }
    } else if (path.startsWith('article/')) {
        const id = parseInt(path.replace('article/', ''), 10);
        if (!isNaN(id) && typeof articles !== 'undefined' && articles[id]) {
            if (sessionStorage.getItem('vaultUnlocked')) {
                this.readerReturnPage = 'articles';
                this.openBlogArticle(id);
            } else {
                this.navigate('vault');
            }
        }
    } else if (path === 'readme') {
        this.openReadme();
    } else {
        // 未知路径，回首页
        this.navigate('home');
    }
}
```

---

### 4.8 初始化的完整修改

#### 旧 init 方法（第 540-555 行）

```javascript
init() {
    this.generateBinaryBackground();
    this.initCaesarWheels();
    this.bindEvents();
    marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

    const hash = (window.location.hash || '#home').replace('#', '');
    this.navigate(hash);

    window.addEventListener('hashchange', () => {
        if (this.currentPage === 'article_reader') return;
        this.navigate((window.location.hash || '#home').replace('#', ''));
    });
    window.addEventListener('scroll', () => this.updateReadingProgress(), { passive: true });
    window.addEventListener('resize', () => this.generateBinaryBackground());
}
```

#### 新 init 方法

```javascript
init() {
    this.generateBinaryBackground();
    this.initCaesarWheels();
    this.bindEvents();
    marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

    // 初始化路由
    const path = this.getPathFromUrl();
    this.navigateToPath(path);

    // 监听浏览器前进/后退
    window.addEventListener('popstate', () => {
        if (this.currentPage === 'article_reader') return;
        this.handleRouteChange();
    });

    window.addEventListener('scroll', () => this.updateReadingProgress(), { passive: true });
    window.addEventListener('resize', () => this.generateBinaryBackground());
}
```

---

## 五、完整修改汇总

### 5.1 需要新增的方法（添加到 App 类）

在 `App` 类中按顺序添加以下方法：

```javascript
// 4.2.1 新增 - 从 URL 获取路径
getPathFromUrl() {
    const path = window.location.pathname;
    if (!path || path === '/') return 'home';
    return path.replace(/^\//, '') || 'home';
}

// 4.3 新增 - 更新浏览器 URL（不触发 popstate）
updateBrowserUrl(page) {
    const urlMap = {
        'home': '/',
        'vault': '/vault',
        'articles': '/articles',
        'encrypted_list': '/articles',
        'article_reader': window.location.pathname
    };
    const url = urlMap[page] || '/';
    history.replaceState(null, '', url);
}

// 4.2.1 新增 - 根据路径导航
navigateToPath(path) {
    if (path === 'readme') {
        this.navigate('readme');
        return;
    }
    if (path.startsWith('article/')) {
        if (!sessionStorage.getItem('vaultUnlocked')) {
            history.pushState(null, '', '/vault');
            this.navigate('vault');
            return;
        }
        const id = parseInt(path.replace('article/', ''), 10);
        if (!isNaN(id)) {
            this.openBlogArticle(id);
            return;
        }
    }
    const protectedPages = ['articles', 'encrypted_list'];
    if (protectedPages.includes(path) && !sessionStorage.getItem('vaultUnlocked')) {
        history.pushState(null, '', '/vault');
        this.navigate('vault');
        return;
    }
    this.navigate(path);
}

// 4.7 新增 - 处理 popstate 事件
handleRouteChange() {
    const path = this.getPathFromUrl();
    if (path === 'home') {
        this.navigate('home');
    } else if (path === 'vault') {
        this.navigate('vault');
    } else if (path === 'articles' || path === '') {
        if (sessionStorage.getItem('vaultUnlocked')) {
            this.navigate('articles');
        } else {
            this.navigate('vault');
        }
    } else if (path.startsWith('article/')) {
        const id = parseInt(path.replace('article/', ''), 10);
        if (!isNaN(id) && typeof articles !== 'undefined' && articles[id]) {
            if (sessionStorage.getItem('vaultUnlocked')) {
                this.readerReturnPage = 'articles';
                this.openBlogArticle(id);
            } else {
                this.navigate('vault');
            }
        }
    } else if (path === 'readme') {
        this.openReadme();
    } else {
        this.navigate('home');
    }
}
```

### 5.2 需要修改的方法

#### 5.2.1 init 方法（App 类）

**修改位置**：第 540-555 行

```javascript
// 旧代码 → 新代码
init() {
    this.generateBinaryBackground();
    this.initCaesarWheels();
    this.bindEvents();
    marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

    // 旧：
    // const hash = (window.location.hash || '#home').replace('#', '');
    // this.navigate(hash);
    // window.addEventListener('hashchange', () => { ... });

    // 新：
    const path = this.getPathFromUrl();
    this.navigateToPath(path);
    window.addEventListener('popstate', () => {
        if (this.currentPage === 'article_reader') return;
        this.handleRouteChange();
    });

    window.addEventListener('scroll', () => this.updateReadingProgress(), { passive: true });
    window.addEventListener('resize', () => this.generateBinaryBackground());
}
```

#### 5.2.2 navigate 方法（App 类）

**修改位置**：第 563-626 行

**主要变更**：
1. 移除所有 `window.location.hash = 'xxx'` 语句
2. 在 switch 语句前添加 `this.updateBrowserUrl(page);`
3. 移除 article_reader case 中的 hash 设置

```javascript
navigate(page) {
    if (page === 'readme') {
        this.openReadme();
        return;
    }
    if (page.startsWith('article/')) {
        if (!sessionStorage.getItem('vaultUnlocked')) {
            history.pushState(null, '', '/vault');
            this.navigate('vault');
            return;
        }
        const id = parseInt(page.replace('article/', ''), 10);
        if (!isNaN(id)) {
            this.openBlogArticle(id);
            return;
        }
    }
    const protectedPages = ['articles', 'encrypted_list'];
    if (protectedPages.includes(page) && !sessionStorage.getItem('vaultUnlocked')) {
        history.pushState(null, '', '/vault');
        this.navigate('vault');
        return;
    }

    this.hideAllPages();
    this.currentPage = page;

    // 新增：更新 URL
    this.updateBrowserUrl(page);

    switch (page) {
        case 'home':
            this.pages.home?.classList.remove('hidden');
            this.navbar.show();
            this.navbar.updateActive('home');
            // 移除 window.location.hash = '#home';
            break;
        case 'articles':
            this.pages.articles?.classList.remove('hidden');
            this.navbar.show();
            this.navbar.updateActive('vault');
            this.renderArticleRetrieval();
            // 移除 window.location.hash = '#articles';
            break;
        case 'vault':
            this.pages.vault?.classList.remove('hidden');
            this.mainContainer?.classList.remove('hidden');
            this.navbar.show();
            this.navbar.updateActive('vault');
            this.matrixRain.start();
            if (this.vault.hintDisplay) {
                this.vault.hintDisplay.textContent = 'truth is an event';
            }
            setTimeout(() => this.vault.keyInput?.focus(), 100);
            // 移除 window.location.hash = '#vault';
            break;
        case 'encrypted_list':
            this.pages.encrypted_list?.classList.remove('hidden');
            this.navbar.hide();
            break;
        case 'article_reader':
            this.pages.article_reader?.classList.remove('hidden');
            this.navbar.hide();
            break;
    }
}
```

#### 5.2.3 openArticle 方法（App 类）

**修改位置**：第 705-715 行

```javascript
// 旧代码
openArticle(article) {
    this.navbar.hide();
    this.typewriter.play(article.title, () => {
        this.hideAllPages();
        this.articleReader.render(article);
        this.articleReader.show();
        this.currentPage = 'article_reader';
        const idx = articles.indexOf(article);
        window.location.hash = idx >= 0 ? '#article/' + idx : '#readme';  // 移除此行
    });
}

// 新代码
openArticle(article) {
    this.navbar.hide();
    this.typewriter.play(article.title, () => {
        this.hideAllPages();
        this.articleReader.render(article);
        this.articleReader.show();
        this.currentPage = 'article_reader';
        const idx = articles.indexOf(article);
        if (idx >= 0) {
            history.pushState({ articleId: idx }, '', '/article/' + idx);
        }
    });
}
```

#### 5.2.4 bindEvents 方法（App 类）

**修改位置**：第 737-807 行

在方法末尾添加全局链接点击拦截：

```javascript
// 在 bindEvents 方法末尾添加
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="/"]');
    if (!link) return;
    
    e.preventDefault();
    
    const href = link.getAttribute('href');
    const path = href.replace(/^\//, '') || 'home';
    
    if (href === '/' || href === '') {
        this.navigate('home');
        return;
    }
    
    if (path === 'vault') {
        this.navigate('vault');
    } else if (path === 'articles') {
        if (sessionStorage.getItem('vaultUnlocked')) {
            this.navigate('articles');
        } else {
            this.navigate('vault');
        }
    }
});
```

---

## 六、测试清单

### 6.1 URL 直接访问测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 首页 | 访问 `lighterever.com/` | 显示首页内容 |
| 密钥室 | 访问 `lighterever.com/vault` | 显示密钥室（未解锁状态） |
| 文章列表 | 访问 `lighterever.com/articles` | 已解锁时显示文章列表，未解锁时跳转密钥室 |
| 文章详情 | 访问 `lighterever.com/article/123` | 已解锁时显示文章，未解锁时跳转密钥室 |
| README | 访问 `lighterever.com/readme` | 显示 README 文章 |

### 6.2 页面刷新测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 首页刷新 | 在首页按 F5 | 保持首页不变 |
| 密钥室刷新 | 在密钥室按 F5 | 保持密钥室不变 |
| 文章页刷新 | 在文章页按 F5 | 保持文章页不变（需保持解锁状态） |

### 6.3 页面切换测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 首页→密钥室 | 点击导航"密钥室" | URL 变为 `/vault`，显示密钥室 |
| 密钥室→首页 | 点击导航"首页" | URL 变为 `/`，显示首页 |
| 首页→文章列表 | 解锁后点击"文章" | URL 变为 `/articles` |
| 文章列表→文章 | 点击文章标题 | URL 变为 `/article/{id}` |
| 文章→返回 | 点击返回按钮 | URL 变回 `/articles` |

### 6.4 浏览器后退/前进测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 后退按钮 | 访问文章后点击浏览器后退 | URL 回退到 `/articles`，显示文章列表 |
| 前进按钮 | 后退后再前进 | URL 前进到 `/article/{id}`，显示文章 |
| 多次切换后退 | 首页→密钥室→首页→文章→后退 | 逐级返回，页面状态正确 |

### 6.5 URL 可分享性测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 文章链接分享 | 复制 `lighterever.com/article/123` 分享 | 他人打开需先解锁，解锁后可正常阅读 |
| 直接分享密钥室 | 复制 `lighterever.com/vault` 分享 | 他人打开显示密钥室 |

### 6.6 导航高亮测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 首页高亮 | 在首页 | 导航"首页"链接有 `active` 类 |
| 密钥室高亮 | 在密钥室 | 导航"密钥室"链接有 `active` 类 |
| 文章页高亮 | 在文章页 | 导航"密钥室"链接有 `active` 类 |

### 6.7 功能回归测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 密钥室解密 | 输入正确密钥 `aletheia` | 解密动画播放，解锁后跳转到文章列表 |
| 主题切换 | 点击主题切换按钮 | 主题正确切换，Matrix Rain 颜色更新 |
| 文章渲染 | 打开包含数学公式的文章 | LaTeX 公式正确渲染 |
| 目录功能 | 在文章页点击目录按钮 | 目录面板正常显示和跳转 |

---

## 七、注意事项

### 7.1 部署前检查

- [ ] 已创建 `vercel.json` 文件
- [ ] `vercel.json` 中包含 rewrite 规则
- [ ] 所有 `index.html` 中的链接已修改
- [ ] `app.js` 中已移除所有 `location.hash` 相关代码

### 7.2 兼容性

- History API 在 IE10+ 支持
- popstate 事件在所有现代浏览器支持
- 确保服务器端配置了 SPA fallback

### 7.3 SEO 注意事项

- Googlebot 支持 SPA 抓取（带 hash 的旧 URL 需做 301 重定向）
- 建议在 `vercel.json` 中添加旧 URL 到新 URL 的重定向：

```json
{
  "redirects": [
    { "source": "/#home", "destination": "/", "permanent": true },
    { "source": "/#vault", "destination": "/vault", "permanent": true },
    { "source": "/#articles", "destination": "/articles", "permanent": true },
    { "source": "/#article/:id", "destination": "/article/:id", "permanent": true }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 7.4 性能优化

- 使用 `history.replaceState()` 更新 URL（不创建历史记录）
- 使用 `history.pushState()` 导航到新页面（创建历史记录）
- 文章阅读页使用 `replaceState` 保持当前路径

---

## 八、改动速查表

### 文件：index.html

| 行号 | 旧代码 | 新代码 |
|------|--------|--------|
| 39 | `href="#home"` | `href="/"` |
| 44 | `href="#home"` | `href="/"` |
| 45 | `href="#vault"` | `href="/vault"` |
| 58 | `href="#home"` | `href="/"` |
| 59 | `href="#vault"` | `href="/vault"` |
| 79 | `href="#vault"` | `href="/vault"` |

### 文件：app.js

| 行号/方法 | 改动类型 | 说明 |
|-----------|----------|------|
| init() | 修改 | hashchange → popstate |
| init() | 修改 | hash 解析 → pathname 解析 |
| navigate() | 修改 | 移除所有 location.hash |
| navigate() | 修改 | 添加 updateBrowserUrl() 调用 |
| openArticle() | 修改 | hash → pushState |
| bindEvents() | 新增 | 添加全局链接拦截 |
| getPathFromUrl() | 新增 | 从 pathname 获取路由 |
| updateBrowserUrl() | 新增 | 更新浏览器 URL |
| navigateToPath() | 新增 | 根据路径导航 |
| handleRouteChange() | 新增 | 处理 popstate 事件 |

---

*文档版本：v1.0*
*更新日期：2024*
