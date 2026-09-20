#!/usr/bin/env node

/**
 * Git Hygiene & Leak Prevention Checker for Foxen
 * 
 * Проверяет репозиторий на:
 * 1. Ошибочно отслеживаемые файлы (tracked files in git):
 *    - node_modules (тяжелые зависимости)
 *    - .wrangler / кэши воркеров
 *    - Секреты, токены, .env файлы
 *    - Архивы сборок (.zip, .xpi, .crx)
 *    - Системный мусор (desktop.ini, .DS_Store, Thumbs.db)
 *    - Временные файлы линтеров (errors.txt, черновики планов)
 * 2. Неотслеживаемые файлы (untracked), которые случайно не покрыты .gitignore
 * 
 * Поддерживает флаг:
 *    node check-git.js --fix   (автоматически убирает лишние файлы из индекса Git)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Список запрещенных шаблонов для отслеживания в Git
const FORBIDDEN_RULES = [
    {
        name: 'Зависимости пакетов (node_modules)',
        regex: /(^|\/)node_modules\//i,
        severity: 'CRITICAL',
        fixable: true
    },
    {
        name: 'Кэш и временные файлы Cloudflare / Wrangler',
        regex: /(^|\/)\.wrangler\//i,
        severity: 'HIGH',
        fixable: true
    },
    {
        name: 'Файлы секретов и переменных окружения',
        regex: /(secrets\.js|\.env(\..+)?|\.dev\.vars|credentials.*\.json|\.pem|\.key)$/i,
        severity: 'CRITICAL',
        fixable: true
    },
    {
        name: 'Архивы и сборки (.zip, .xpi, .crx, dist, web-ext-artifacts)',
        regex: /(\.(zip|xpi|crx|tar(\.gz)?)$|(^|\/)(dist|build|web-ext-artifacts)\/)/i,
        severity: 'HIGH',
        fixable: true
    },
    {
        name: 'Системный мусор ОС и IDE',
        regex: /(desktop\.ini|\.DS_Store|Thumbs\.db|\.vscode\/|\.idea\/)$/i,
        severity: 'MEDIUM',
        fixable: true
    },
    {
        name: 'Логи и дампы ошибок',
        regex: /(\.log$|npm-debug|yarn-error|errors\.txt$)/i,
        severity: 'MEDIUM',
        fixable: true
    },
    {
        name: 'Черновики и временные планы агента',
        regex: /(AI_IMPLEMENTATION_PLAN\.md$)/i,
        severity: 'LOW',
        fixable: true
    }
];

function runGit(cmd) {
    try {
        return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch (e) {
        return null;
    }
}

function checkGit() {
    console.log('\n=============================================');
    console.log('       FOXEN GIT REPOSITORY AUDIT            ');
    console.log('=============================================\n');

    const args = process.argv.slice(2);
    const autoFix = args.includes('--fix');

    // Проверяем, инициализирован ли git
    const isGit = runGit('rev-parse --is-inside-work-tree');
    if (isGit !== 'true') {
        console.error('\x1b[31m[✖] Директория не является Git-репозиторием.\x1b[0m');
        process.exit(1);
    }

    // 1. Получаем список всех отслеживаемых файлов в Git индексе
    const trackedOutput = runGit('ls-files');
    const trackedFiles = trackedOutput ? trackedOutput.split(/\r?\n/).filter(Boolean) : [];

    console.log(`[ℹ] Всего файлов отслеживается в Git: ${trackedFiles.length}`);

    const violations = [];

    for (const file of trackedFiles) {
        const normalized = file.replace(/\\/g, '/');
        for (const rule of FORBIDDEN_RULES) {
            if (rule.regex.test(normalized)) {
                violations.push({
                    file: normalized,
                    rule: rule.name,
                    severity: rule.severity,
                    fixable: rule.fixable
                });
                break;
            }
        }
    }

    // 2. Проверяем статус рабочих файлов (untracked)
    const statusOutput = runGit('status --porcelain');
    const statusLines = statusOutput ? statusOutput.split(/\r?\n/).filter(Boolean) : [];
    const untrackedViolations = [];

    for (const line of statusLines) {
        if (line.startsWith('?? ')) {
            const file = line.slice(3).replace(/\\/g, '/');
            for (const rule of FORBIDDEN_RULES) {
                if (rule.regex.test(file)) {
                    untrackedViolations.push({
                        file,
                        rule: rule.name,
                        severity: rule.severity
                    });
                    break;
                }
            }
        }
    }

    // ВЫВОД РЕЗУЛЬТАТОВ
    if (violations.length === 0 && untrackedViolations.length === 0) {
        console.log('\x1b[32m[✔] Отлично! Никаких запрещенных или опасных файлов в Git не обнаружено.\x1b[0m');
        console.log('\x1b[32m[✔] Репозиторий чист и готов к коммитам/пушу.\x1b[0m\n');
        return;
    }

    if (violations.length > 0) {
        console.log(`\n\x1b[31m[✖] ОБНАРУЖЕНО ${violations.length} ФАЙЛОВ, КОТОРЫЕ УЖЕ ОТСЛЕЖИВАЮТСЯ В GIT, НО НЕ ДОЛЖНЫ ТАМ БЫТЬ:\x1b[0m`);
        
        // Группируем по правилам
        const byRule = {};
        for (const v of violations) {
            byRule[v.rule] = byRule[v.rule] || [];
            byRule[v.rule].push(v.file);
        }

        for (const [ruleName, files] of Object.entries(byRule)) {
            console.log(`\n  \x1b[33m• ${ruleName} (${files.length} шт.):\x1b[0m`);
            const sample = files.slice(0, 5);
            sample.forEach(f => console.log(`      - ${f}`));
            if (files.length > 5) {
                console.log(`      ... и ещё ${files.length - 5} файлов`);
            }
        }

        if (autoFix) {
            console.log('\n\x1b[36m[i] Выполняется автоматическая очистка индекса Git (--fix)...\x1b[0m');
            // Удаляем группы файлов из индекса
            const uniqueDirs = new Set();
            const uniqueIndividualFiles = [];

            for (const v of violations) {
                if (v.file.includes('node_modules/')) {
                    const baseDir = v.file.split('node_modules/')[0] + 'node_modules';
                    uniqueDirs.add(baseDir);
                } else if (v.file.includes('.wrangler/')) {
                    const baseDir = v.file.split('.wrangler/')[0] + '.wrangler';
                    uniqueDirs.add(baseDir);
                } else {
                    uniqueIndividualFiles.push(v.file);
                }
            }

            for (const dir of uniqueDirs) {
                try {
                    execSync(`git rm -r --cached "${dir}"`, { stdio: 'ignore' });
                    console.log(`  \x1b[32m✔ Убрано из индекса: ${dir}\x1b[0m`);
                } catch (_) {}
            }

            for (const f of uniqueIndividualFiles) {
                try {
                    execSync(`git rm --cached "${f}"`, { stdio: 'ignore' });
                    console.log(`  \x1b[32m✔ Убрано из индекса: ${f}\x1b[0m`);
                } catch (_) {}
            }

            console.log('\n\x1b[32m[✔] Очистка индекса Git завершена. Файлы остались на диске, но больше не отслеживаются Git.\x1b[0m\n');
        } else {
            console.log('\n\x1b[36mСовет по исправлению:\x1b[0m');
            console.log('  Запустите проверку с флагом исправления:');
            console.log('  \x1b[32mnpm run check:git -- --fix\x1b[0m');
            console.log('  (или напрямую: \x1b[32mnode check-git.js --fix\x1b[0m)\n');
        }
    }

    if (untrackedViolations.length > 0) {
        console.log(`\x1b[33m[!] Неотслеживаемые файлы, требующие внимания (${untrackedViolations.length} шт.):\x1b[0m`);
        untrackedViolations.forEach(u => console.log(`      - ${u.file} (${u.rule})`));
        console.log('  Убедитесь, что они внесены в .gitignore или удалены перед коммитом.\n');
    }

    if (!autoFix && violations.length > 0) {
        process.exit(1);
    }
}

checkGit();
