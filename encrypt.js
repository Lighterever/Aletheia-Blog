/**
 * 加密工具脚本
 * 用于加密新文章并添加到数据文件
 * 
 * 用法:
 *   node encrypt.js --key "密钥" --title "标题" --content "内容" [--category "分类名称"]
 *   node encrypt.js --key "密钥" --title "标题" --file "文章文件.md" [--category "分类名称"]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 简单的AES加密函数（与网页端CryptoJS兼容）
function encrypt(plaintext, password) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 格式: SALT:IV:ENCRYPTED (均为hex)
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
}

// 解密函数
function decrypt(encrypted, password) {
    try {
        const parts = encrypted.split(':');
        if (parts.length !== 3) throw new Error('Invalid format');
        
        const salt = Buffer.from(parts[0], 'hex');
        const iv = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];
        
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return null;
    }
}

// 命令行参数解析
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {};
    
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            const value = args[i + 1];
            if (!value || value.startsWith('--')) {
                result[key] = true;
            } else {
                result[key] = value;
                i++;
            }
        }
    }
    
    return result;
}

// 主函数
function main() {
    const args = parseArgs();
    
    if (!args.key || !args.title || (!args.content && !args.file)) {
        console.log(`
🔐 加密博客 - 文章加密工具
═══════════════════════════════════════

用法:
  node encrypt.js --key "密钥" --title "标题" --content "内容"
  node encrypt.js --key "密钥" --title "标题" --file "文章.md"

参数说明:
  --key      分类密钥 (必填)
  --title    文章标题 (必填)
  --content  文章内容，直接在命令行输入
  --file     文章文件路径，从文件读取内容
  --category 分类显示名称 (可选，默认从密钥推断)

示例:
  # 直接输入内容加密
  node encrypt.js --key "math2026" --title "关于素数的思考" --content "# 素数..."

  # 从文件加密
  node encrypt.js --key "math2026" --title "欧拉函数研究" --file "article.md"
`);
        return;
    }
    
    // 获取内容
    let content = args.content;
    if (args.file) {
        try {
            content = fs.readFileSync(args.file, 'utf8');
        } catch (e) {
            console.error('❌ 无法读取文件:', args.file);
            return;
        }
    }
    
    // 构建文章JSON
    const article = {
        title: args.title,
        content: content,
        date: new Date().toISOString().split('T')[0]
    };
    
    // 加密
    const encrypted = encrypt(JSON.stringify(article), args.key);
    
    // 输出结果
    console.log(`
✅ 加密成功！
═══════════════════════════════════════

标题: ${args.title}
密钥: ${args.key}
日期: ${article.date}

加密后的数据:
───────────────────────────────────────`);
    console.log(encrypted);
    console.log(`
───────────────────────────────────────

使用说明:
1. 将上述加密数据添加到 data.js 中对应分类的 articles 数组
2. 确保分类的 key 字段值与 --key 参数一致
`);
    
    // 如果需要追加到文件
    if (args.append) {
        console.log('正在追加到数据文件...');
        // 这里可以添加自动追加逻辑
    }
}

// 导出函数供外部使用
module.exports = { encrypt, decrypt };

// 如果直接运行此脚本
if (require.main === module) {
    main();
}
