const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EDITOR_DIR = path.join(ROOT, 'editor');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const POSTS_DIR = path.join(ROOT, 'posts');
const PORT = 3333;
const MAX_BODY_SIZE = 5 * 1024 * 1024;

const EDITOR_TOKEN = process.env.EDITOR_TOKEN || '';

function resolveSafe(baseDir, userPath) {
    const resolved = path.resolve(baseDir, userPath);
    const base = path.resolve(baseDir);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
        return null;
    }
    return resolved;
}

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
        if (!resolveSafe(ROOT, filePath)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Forbidden');
            return;
        }
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain; charset=utf-8' });
        res.end(data);
    } catch (e) {
        if (e.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
        } else {
            console.error('serveFile error:', e.message);
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Internal server error');
        }
    }
}

function json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                req.destroy();
                reject(new Error('Request body too large'));
                return;
            }
            body += chunk;
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
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

    function checkAuth() {
        if (!EDITOR_TOKEN) return true;
        const auth = req.headers['authorization'] || '';
        return auth === `Bearer ${EDITOR_TOKEN}` || url.searchParams.get('token') === EDITOR_TOKEN;
    }

    // API: list articles
    if (reqPath === '/api/list' && req.method === 'GET') {
        if (!checkAuth()) return json(res, { error: 'Unauthorized' }, 401);
        return json(res, listArticles());
    }

    // API: load article
    if (reqPath === '/api/load' && req.method === 'GET') {
        if (!checkAuth()) return json(res, { error: 'Unauthorized' }, 401);
        const file = url.searchParams.get('file');
        if (!file) return json(res, { error: 'Missing file' }, 400);
        const fp = resolveSafe(ARTICLES_DIR, file);
        if (!fp || !fs.existsSync(fp)) return json(res, { error: 'Not found' }, 404);
        return json(res, { file, content: fs.readFileSync(fp, 'utf-8') });
    }

    // API: save article
    if (reqPath === '/api/save' && req.method === 'POST') {
        if (!checkAuth()) return json(res, { error: 'Unauthorized' }, 401);
        let body;
        try { body = await readBody(req); } catch (e) { return json(res, { error: e.message }, 413); }
        let data;
        try { data = JSON.parse(body); } catch (e) { return json(res, { error: 'Invalid JSON' }, 400); }
        if (!data.content && typeof data.content !== 'string') return json(res, { error: 'Missing content' }, 400);
        let fileName = data.file || (data.title ? data.title.replace(/[/\\?%*:|"<>]/g, '-') + '.md' : 'untitled.md');
        fileName = path.basename(fileName);
        if (!fileName.endsWith('.md')) fileName += '.md';
        const fp = resolveSafe(ARTICLES_DIR, fileName);
        if (!fp) return json(res, { error: 'Invalid file path' }, 400);
        if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true });
        fs.writeFileSync(fp, data.content, 'utf-8');
        return json(res, { ok: true, file: fileName });
    }

    // API: delete article
    if (reqPath === '/api/delete' && req.method === 'POST') {
        if (!checkAuth()) return json(res, { error: 'Unauthorized' }, 401);
        let body;
        try { body = await readBody(req); } catch (e) { return json(res, { error: e.message }, 413); }
        let data;
        try { data = JSON.parse(body); } catch (e) { return json(res, { error: 'Invalid JSON' }, 400); }
        if (!data.file) return json(res, { error: 'Missing file' }, 400);
        const fileName = path.basename(data.file);
        const fp = resolveSafe(ARTICLES_DIR, fileName);
        if (!fp) return json(res, { error: 'Invalid file path' }, 400);
        if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
            const slug = fileName.replace(/\.md$/, '');
            const postDir = path.join(POSTS_DIR, slug);
            if (fs.existsSync(postDir)) fs.rmSync(postDir, { recursive: true });
        }
        return json(res, { ok: true });
    }

    // API: build
    if (reqPath === '/api/build' && req.method === 'POST') {
        if (!checkAuth()) return json(res, { error: 'Unauthorized' }, 401);
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
    const cleanPath = reqPath.replace(/^\/+/, '');
    const localPath = path.join(ROOT, cleanPath);
    if (resolveSafe(ROOT, localPath) && fs.existsSync(localPath) && !fs.statSync(localPath).isDirectory()) {
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
