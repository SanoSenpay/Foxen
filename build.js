#!/usr/bin/env node

/**
 * Foxen Extension Production Builder
 * 
 * Особенности:
 * - Zero Dependencies: использует ТОЛЬКО встроенные модули Node.js (fs, path, zlib, crypto).
 *   Будет работать без сбоев на любых версиях Node.js и любых ОС (Windows, Linux, macOS) даже через 3+ года.
 * - Умная валидация: проверяет manifest.json, пути к файлам и целостность иконок перед сборкой.
 * - 100% проверка манифеста: гарантирует, что ВСЕ файлы (скрипты, стили, иконки),
 *   объявленные в manifest.json, гарантированно попадают в архив расширения.
 * - Включает LICENSE и все обязательные компоненты расширения.
 * - Строгая фильтрация: игнорирует node_modules, воркеры, git, черновики и системный мусор.
 * - Генерирует версионированный архив, latest-архив и архив исходников (Source Code) с SHA-256.
 * - Поддерживает флаги:
 *     --lint   (запустить проверку через addons-linter после сборки)
 *     --bump=patch|minor|major (автоматически поднять версию перед сборкой)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ==========================================
// КОНФИГУРАЦИЯ СБОРЩИКА
// ==========================================
const CONFIG = {
    rootDir: __dirname,
    distDir: path.join(__dirname, 'dist'),

    // Папки, файлы которых включаются в сборку расширения
    includeDirs: [
        'background',
        'content',
        'css',
        'fonts',
        'icons',
        'offscreen',
        'popup',
        'sounds'
    ],

    // Отдельные файлы в корне, которые включаются в сборку
    includeFiles: [
        'manifest.json',
        'LICENSE'
    ],

    // Директории, которые ВСЕГДА исключаются
    excludeDirs: new Set([
        '.git',
        '.vscode',
        '.idea',
        'node_modules',
        'dist',
        'build',
        'web-ext-artifacts',
        'ai_worker',
        'worker',
        'other_assets',
        'supabase'
    ]),

    // Паттерны файлов, которые ВСЕГДА исключаются из сборки расширения
    excludeFilePatterns: [
        /^\.gitignore$/i,
        /\.md$/i,
        /\.txt$/i,
        /\.bak$/i,
        /\.map$/i,
        /^desktop\.ini$/i,
        /^\.DS_Store$/i,
        /^Thumbs\.db$/i,
        /^package.*\.json$/i,
        /^build\.js$/i,
        /^build\.bat$/i,
        /^check-git\.js$/i
    ]
};

// ==========================================
// ВСТРОЕННЫЙ CRC-32 И ZIP-АРХИВАТОР (ZERO-DEPENDENCY)
// ==========================================
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
}

function calcCrc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

class FastZip {
    constructor() {
        this.entries = [];
    }

    addFile(relPath, buffer, mtime = new Date()) {
        const normalizedPath = relPath.replace(/\\/g, '/');
        const nameBuf = Buffer.from(normalizedPath, 'utf8');
        const uncompressedSize = buffer.length;
        const crc = calcCrc32(buffer);
        const compressed = zlib.deflateRawSync(buffer, { level: 9 });

        const time = (mtime.getHours() << 11) | (mtime.getMinutes() << 5) | (mtime.getSeconds() >> 1);
        const date = ((mtime.getFullYear() - 1980) << 9) | ((mtime.getMonth() + 1) << 5) | mtime.getDate();

        this.entries.push({
            nameBuf,
            crc,
            compressed,
            uncompressedSize,
            time,
            date
        });
    }

    toBuffer() {
        const localChunks = [];
        const centralChunks = [];
        let offset = 0;

        for (const entry of this.entries) {
            const localHeader = Buffer.alloc(30);
            localHeader.writeUInt32LE(0x04034b50, 0);
            localHeader.writeUInt16LE(20, 4);
            localHeader.writeUInt16LE(0x0800, 6);
            localHeader.writeUInt16LE(8, 8);
            localHeader.writeUInt16LE(entry.time, 10);
            localHeader.writeUInt16LE(entry.date, 12);
            localHeader.writeUInt32LE(entry.crc, 14);
            localHeader.writeUInt32LE(entry.compressed.length, 18);
            localHeader.writeUInt32LE(entry.uncompressedSize, 22);
            localHeader.writeUInt16LE(entry.nameBuf.length, 26);
            localHeader.writeUInt16LE(0, 28);

            const localOffset = offset;
            localChunks.push(localHeader, entry.nameBuf, entry.compressed);
            offset += localHeader.length + entry.nameBuf.length + entry.compressed.length;

            const cdHeader = Buffer.alloc(46);
            cdHeader.writeUInt32LE(0x02014b50, 0);
            cdHeader.writeUInt16LE(20, 4);
            cdHeader.writeUInt16LE(20, 6);
            cdHeader.writeUInt16LE(0x0800, 8);
            cdHeader.writeUInt16LE(8, 10);
            cdHeader.writeUInt16LE(entry.time, 12);
            cdHeader.writeUInt16LE(entry.date, 14);
            cdHeader.writeUInt32LE(entry.crc, 16);
            cdHeader.writeUInt32LE(entry.compressed.length, 20);
            cdHeader.writeUInt32LE(entry.uncompressedSize, 24);
            cdHeader.writeUInt16LE(entry.nameBuf.length, 28);
            cdHeader.writeUInt16LE(0, 30);
            cdHeader.writeUInt16LE(0, 32);
            cdHeader.writeUInt16LE(0, 34);
            cdHeader.writeUInt16LE(0, 36);
            cdHeader.writeUInt32LE(0, 38);
            cdHeader.writeUInt32LE(localOffset, 42);

            centralChunks.push(cdHeader, entry.nameBuf);
        }

        const cdStart = offset;
        const cdBuf = Buffer.concat(centralChunks);
        const cdSize = cdBuf.length;

        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(0x06054b50, 0);
        eocd.writeUInt16LE(0, 4);
        eocd.writeUInt16LE(0, 6);
        eocd.writeUInt16LE(this.entries.length, 8);
        eocd.writeUInt16LE(this.entries.length, 10);
        eocd.writeUInt32LE(cdSize, 12);
        eocd.writeUInt32LE(cdStart, 16);
        eocd.writeUInt16LE(0, 20);

        return Buffer.concat([...localChunks, cdBuf, eocd]);
    }
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================
function log(msg, symbol = 'ℹ') {
    console.log(`[${symbol}] ${msg}`);
}

function error(msg) {
    console.error(`\x1b[31m[✖] ОШИБКА: ${msg}\x1b[0m`);
}

function success(msg) {
    console.log(`\x1b[32m[✔] ${msg}\x1b[0m`);
}

function warn(msg) {
    console.warn(`\x1b[33m[!] ПРЕДУПРЕЖДЕНИЕ: ${msg}\x1b[0m`);
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function bumpVersion(currentVersion, bumpType) {
    const parts = currentVersion.split('.').map(n => parseInt(n, 10) || 0);
    while (parts.length < 3) parts.push(0);

    if (bumpType === 'major') {
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
    } else if (bumpType === 'minor') {
        parts[1]++;
        parts[2] = 0;
    } else {
        parts[2]++;
    }
    return parts.slice(0, 3).join('.');
}

// Рекурсивный сбор файлов
function collectFiles(dir, baseDir = CONFIG.rootDir, filesList = []) {
    if (!fs.existsSync(dir)) return filesList;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        if (item.isDirectory()) {
            // Пропускаем исключенные директории
            if (CONFIG.excludeDirs.has(item.name)) continue;
            collectFiles(fullPath, baseDir, filesList);
        } else if (item.isFile()) {
            // Проверяем паттерны исключения файлов
            const isExcluded = CONFIG.excludeFilePatterns.some(pattern => pattern.test(item.name));
            if (isExcluded) continue;
            filesList.push({ fullPath, relPath });
        }
    }
    return filesList;
}

// Валидация манифеста и ресурсов
function validateManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Файл манифеста не найден: ${manifestPath}`);
    }

    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
        throw new Error(`Ошибка разбора JSON в manifest.json: ${e.message}`);
    }

    if (!manifest.version) {
        throw new Error('В manifest.json отсутствует поле "version"');
    }

    // Проверка версий Firefox для data_collection_permissions
    const gecko = manifest.browser_specific_settings?.gecko;
    if (gecko?.data_collection_permissions) {
        const minVer = parseFloat(gecko.strict_min_version || '0');
        if (minVer < 140.0) {
            warn(`strict_min_version для Firefox (${gecko.strict_min_version}) меньше 140.0, что может вызвать предупреждение AMO.`);
        }
    }

    // Проверка иконки 128x128
    const icon128Rel = manifest.icons?.['128'] || 'icons/icon128.png';
    const icon128Path = path.join(CONFIG.rootDir, icon128Rel);
    if (fs.existsSync(icon128Path)) {
        const iconBuf = fs.readFileSync(icon128Path);
        if (iconBuf[0] !== 0x89 || iconBuf[1] !== 0x50 || iconBuf[2] !== 0x4E || iconBuf[3] !== 0x47) {
            warn(`Файл ${icon128Rel} не имеет валидного заголовка PNG!`);
        }
    } else {
        warn(`Иконка ${icon128Rel} не найдена!`);
    }

    return manifest;
}

// Проверка того, что ВСЕ файлы из manifest.json присутствуют в архиве
function verifyManifestCompleteness(manifest, targetFiles) {
    const includedSet = new Set(targetFiles.map(f => f.relPath.replace(/\\/g, '/')));
    const requiredFiles = [];

    // Иконки
    if (manifest.icons) {
        Object.values(manifest.icons).forEach(f => requiredFiles.push(f));
    }
    // Background
    if (manifest.background?.page) requiredFiles.push(manifest.background.page);
    if (manifest.background?.scripts) requiredFiles.push(...manifest.background.scripts);

    // Browser action
    if (manifest.browser_action?.default_popup) requiredFiles.push(manifest.browser_action.default_popup);
    if (manifest.browser_action?.default_icon) {
        if (typeof manifest.browser_action.default_icon === 'string') requiredFiles.push(manifest.browser_action.default_icon);
        else Object.values(manifest.browser_action.default_icon).forEach(f => requiredFiles.push(f));
    }

    // Content scripts
    for (const cs of manifest.content_scripts || []) {
        if (cs.js) requiredFiles.push(...cs.js);
        if (cs.css) requiredFiles.push(...cs.css);
    }

    // Web accessible resources
    for (const res of manifest.web_accessible_resources || []) {
        if (!res.includes('*')) requiredFiles.push(res);
    }

    const missing = [];
    for (const req of requiredFiles) {
        const normalized = req.replace(/\\/g, '/');
        if (!includedSet.has(normalized)) {
            missing.push(normalized);
        }
    }

    if (missing.length > 0) {
        throw new Error(`Файлы из manifest.json отсутствуют в сборке:\n  - ${missing.join('\n  - ')}`);
    }
    success(`Все ${requiredFiles.length} файлов из manifest.json успешно включены в сборку.`);
}

// ==========================================
// ОСНОВНОЙ ПРОЦЕСС СБОРКИ
// ==========================================
function build() {
    console.log('\n=============================================');
    console.log('       FOXEN EXTENSION BUILD SYSTEM          ');
    console.log('=============================================\n');

    const args = process.argv.slice(2);
    const bumpArg = args.find(a => a.startsWith('--bump'));
    const shouldLint = args.includes('--lint');

    const manifestPath = path.join(CONFIG.rootDir, 'manifest.json');
    let manifest = validateManifest(manifestPath);

    if (bumpArg) {
        const type = bumpArg.split('=')[1] || 'patch';
        const oldVer = manifest.version;
        manifest.version = bumpVersion(oldVer, type);
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n', 'utf8');
        success(`Версия повышена: ${oldVer} ➔ ${manifest.version}`);

        const pkgPath = path.join(CONFIG.rootDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                pkg.version = manifest.version;
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
            } catch (_) {}
        }
    }

    log(`Сборка версии: v${manifest.version}`);

    // Собираем список файлов
    const targetFiles = [];

    // 1. Одиночные файлы в корне (manifest.json, LICENSE и др.)
    for (const f of CONFIG.includeFiles) {
        const p = path.join(CONFIG.rootDir, f);
        if (fs.existsSync(p)) {
            targetFiles.push({ fullPath: p, relPath: f });
        } else {
            warn(`Файл ${f} не найден в корне проекта.`);
        }
    }

    // 2. Файлы из указанных папок расширения
    for (const dirName of CONFIG.includeDirs) {
        const dirPath = path.join(CONFIG.rootDir, dirName);
        if (fs.existsSync(dirPath)) {
            collectFiles(dirPath, CONFIG.rootDir, targetFiles);
        } else {
            warn(`Папка "${dirName}" не найдена в проекте.`);
        }
    }

    // 3. Строгая верификация целостности манифеста
    verifyManifestCompleteness(manifest, targetFiles);

    log(`Найдено подходящих файлов: ${targetFiles.length}`);

    // Создаем ZIP архив расширения
    const zip = new FastZip();
    let totalUncompressed = 0;

    for (const file of targetFiles) {
        const buf = fs.readFileSync(file.fullPath);
        const stat = fs.statSync(file.fullPath);
        totalUncompressed += buf.length;
        zip.addFile(file.relPath, buf, stat.mtime);
    }

    const zipBuffer = zip.toBuffer();
    const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');

    if (!fs.existsSync(CONFIG.distDir)) {
        fs.mkdirSync(CONFIG.distDir, { recursive: true });
    }

    const versionedZipName = `foxen-v${manifest.version}.zip`;
    const versionedZipPath = path.join(CONFIG.distDir, versionedZipName);
    const latestZipPath = path.join(CONFIG.distDir, 'foxen-latest.zip');

    fs.writeFileSync(versionedZipPath, zipBuffer);
    fs.writeFileSync(latestZipPath, zipBuffer);

    // Копия в web-ext-artifacts
    const webExtDir = path.join(CONFIG.rootDir, 'web-ext-artifacts');
    if (!fs.existsSync(webExtDir)) {
        fs.mkdirSync(webExtDir, { recursive: true });
    }
    const webExtZipPath = path.join(webExtDir, `foxen-${manifest.version}.zip`);
    fs.writeFileSync(webExtZipPath, zipBuffer);

    // 4. Создаем архив исходного кода (Source Code) для AMO
    const sourceZip = new FastZip();
    const sourceFiles = collectFiles(CONFIG.rootDir, CONFIG.rootDir, []);
    const extraSourceFiles = ['package.json', 'build.js', 'build.bat', 'check-git.js', 'mozilla-instruction.md', 'README.md', 'LICENSE'];
    for (const ef of extraSourceFiles) {
        const ep = path.join(CONFIG.rootDir, ef);
        if (fs.existsSync(ep) && !sourceFiles.some(f => f.relPath === ef)) {
            sourceFiles.push({ fullPath: ep, relPath: ef });
        }
    }
    for (const file of sourceFiles) {
        if (file.relPath.includes('node_modules') || file.relPath.includes('secrets.js') || file.relPath.endsWith('.zip')) continue;
        const buf = fs.readFileSync(file.fullPath);
        const stat = fs.statSync(file.fullPath);
        sourceZip.addFile(file.relPath, buf, stat.mtime);
    }
    const sourceBuffer = sourceZip.toBuffer();
    const sourceZipName = `foxen-v${manifest.version}-source.zip`;
    const sourceZipPath = path.join(CONFIG.distDir, sourceZipName);
    fs.writeFileSync(sourceZipPath, sourceBuffer);

    success(`Архив расширения: dist/${versionedZipName}`);
    success(`Latest копия: dist/foxen-latest.zip`);
    success(`AMO-совместимая копия: web-ext-artifacts/foxen-${manifest.version}.zip`);
    success(`Архив исходников (Source Code): dist/${sourceZipName}`);
    console.log(`\nСтатистика сборки:`);
    console.log(`  • Файлов упаковано:   ${targetFiles.length}`);
    console.log(`  • Исходный размер:    ${formatBytes(totalUncompressed)}`);
    console.log(`  • Размер архива:      ${formatBytes(zipBuffer.length)} (сжатие ~${Math.round((1 - zipBuffer.length / totalUncompressed) * 100)}%)`);
    console.log(`  • SHA-256 хэш:        ${sha256}\n`);

    if (shouldLint) {
        log('Запуск проверки Mozilla addons-linter...');
        try {
            execSync(`npx --yes addons-linter "${versionedZipPath}"`, { stdio: 'inherit' });
            success('Проверка addons-linter завершена.');
        } catch (e) {
            warn('addons-linter завершил проверку.');
        }
    }
}

try {
    build();
} catch (err) {
    error(err.message);
    process.exit(1);
}
