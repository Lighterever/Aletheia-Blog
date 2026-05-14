const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '..', 'articles');
const OUTPUT_FILE = path.join(__dirname, '..', 'data.js');
const VAULT_KEY = 'aletheia';

function parseFrontmatter(text) {
    const lines = text.split('\n');
    const result = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                result[key] = JSON.parse(value);
            } catch {
                result[key] = [];
            }
        } else {
            result[key] = value;
        }
    }
    return result;
}

function parseMdFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const trimmed = raw.trim();

    if (!trimmed.startsWith('---')) {
        throw new Error(`Missing frontmatter in ${filePath}`);
    }

    const secondDelim = trimmed.indexOf('---', 3);
    if (secondDelim === -1) {
        throw new Error(`Unclosed frontmatter in ${filePath}`);
    }

    const frontmatterText = trimmed.slice(3, secondDelim).trim();
    const content = trimmed.slice(secondDelim + 3).trim();
    const meta = parseFrontmatter(frontmatterText);

    const basename = path.basename(filePath, '.md');

    return {
        id: meta.id || basename,
        title: meta.title || basename,
        date: meta.date || '',
        tags: meta.tags || [],
        content: content,
    };
}

function escapeStringLiteral(str) {
    return str.replace(/[\\']/g, '\\$&');
}

function escapeTemplateLiteral(str) {
    return str.replace(/[\\`]/g, '\\$&').replace(/\$\{/g, '\\${');
}

function generateDataJs(articles) {
    const entries = articles.map((a) => {
        const escapedContent = escapeTemplateLiteral(a.content);
        const tagsStr = JSON.stringify(a.tags);
        return `    {
        id: '${escapeStringLiteral(a.id)}',
        title: '${escapeStringLiteral(a.title)}',
        date: '${escapeStringLiteral(a.date)}',
        tags: ${tagsStr},
        content: \`${escapedContent}\`
    }`;
    });

    return `/**
 * 加密博客数据文件（由 scripts/build-articles.js 自动生成）
 * 请勿手动编辑此文件，在 articles/ 目录下添加 .md 文件后运行 node scripts/build-articles.js
 */

const VAULT_KEY = '${VAULT_KEY}';
const articles = [
${entries.join(',\n')}
];
`;
}

function main() {
    if (!fs.existsSync(ARTICLES_DIR)) {
        console.error('articles/ directory not found');
        process.exit(1);
    }

    const files = fs.readdirSync(ARTICLES_DIR)
        .filter((f) => f.endsWith('.md'))
        .sort();

    if (files.length === 0) {
        console.log('No .md files found in articles/');
        return;
    }

    const articles = files.map((f) => {
        const filePath = path.join(ARTICLES_DIR, f);
        console.log(`  parsing: ${f}`);
        return parseMdFile(filePath);
    });

    const output = generateDataJs(articles);
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
    console.log(`\nGenerated data.js with ${articles.length} article(s)`);
}

main();
