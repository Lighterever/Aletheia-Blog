const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EDITOR_DIR = path.join(ROOT, 'editor');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const POSTS_DIR = path.join(ROOT, 'posts');
const PORT = 3333;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
};

function serveFile(res, filePath) {
    try {
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
        res.end(data);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
}

function json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => resolve(body));
    });
}

function listArticles() {
    if (!fs.existsSync(ARTICLES_DIR)) return [];
    return fs.readdirSync(ARTICLES_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
            const raw = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf-8');
            const meta = {};
            if (raw.startsWith('---')) {
                const end = raw.indexOf('---', 3);
                if (end !== -1) {
                    const fm = raw.slice(3, end).trim();
                    fm.split('\n').forEach((line) => {
                        const i = line.indexOf(':');
                        if (i === -1) return;
                        meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
                    });
                }
            }
            return { file: f, title: meta.title || f, date: meta.date || '', tags: meta.tags || '' };
        })
        .sort((a, b) => b.file.localeCompare(a.file));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const reqPath = url.pathname;

    // API: list articles
    if (reqPath === '/api/list' && req.method === 'GET') {
        return json(res, listArticles());
    }

    // API: load article
    if (reqPath === '/api/load' && req.method === 'GET') {
        const file = url.searchParams.get('file');
        if (!file) return json(res, { error: 'Missing file' }, 400);
        const fp = path.join(ARTICLES_DIR, file);
        if (!fs.existsSync(fp)) return json(res, { error: 'Not found' }, 404);
        return json(res, { file, content: fs.readFileSync(fp, 'utf-8') });
    }

    // API: save article
    if (reqPath === '/api/save' && req.method === 'POST') {
        const body = await readBody(req);
        const data = JSON.parse(body);
        let fileName = data.file || (data.title ? data.title.replace(/[/\\?%*:|"<>]/g, '-') + '.md' : 'untitled.md');
        if (!fileName.endsWith('.md')) fileName += '.md';
        const fp = path.join(ARTICLES_DIR, fileName);
        if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true });
        fs.writeFileSync(fp, data.content, 'utf-8');
        return json(res, { ok: true, file: fileName });
    }

    // API: delete article
    if (reqPath === '/api/delete' && req.method === 'POST') {
        const body = await readBody(req);
        const { file } = JSON.parse(body);
        const fp = path.join(ARTICLES_DIR, file);
        if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
            // Also delete generated post
            const slug = file.replace(/\.md$/, '');
            const postDir = path.join(POSTS_DIR, slug);
            if (fs.existsSync(postDir)) fs.rmSync(postDir, { recursive: true });
        }
        return json(res, { ok: true });
    }

    // API: build
    if (reqPath === '/api/build' && req.method === 'POST') {
        try {
            const out = execSync('node scripts/build.js', { cwd: ROOT, encoding: 'utf-8' });
            return json(res, { ok: true, output: out });
        } catch (e) {
            return json(res, { ok: false, output: e.stdout + '\n' + e.stderr });
        }
    }

    // Serve editor page
    if (reqPath === '/' || reqPath === '/editor') {
        return serveFile(res, path.join(EDITOR_DIR, 'index.html'));
    }

    // Serve static files from project root (for CSS/JS preview)
    const localPath = path.join(ROOT, reqPath.replace(/^\/+/, ''));
    if (fs.existsSync(localPath) && !fs.statSync(localPath).isDirectory()) {
        return serveFile(res, localPath);
    }

    // Fallback to editor
    serveFile(res, path.join(EDITOR_DIR, 'index.html'));
});

server.listen(PORT, () => {
    const { exec } = require('child_process');
    const url = `http://localhost:${PORT}`;
    console.log(`\n  ✏️  编辑器已启动 → ${url}`);
    console.log(`  📂 文章目录 → ${ARTICLES_DIR}`);
    console.log(`  ⌨️  按 Ctrl+C 停止\n`);
    exec(`open "${url}"`);
});
