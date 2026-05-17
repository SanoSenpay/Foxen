// background/remake.js — Foxen 3.0
// ИСПРАВЛЕНО: автовыдача больше не попадает в "сообщение после оплаты".
// Cardinal answer → в order_msg, secrets остаются товарами для автовыдачи.

const dropZone    = document.getElementById('drop-zone');
const fileInput   = document.getElementById('file-input');
const logElement  = document.getElementById('log');
const downloadBtn = document.getElementById('download-btn');
const clearBtn    = document.getElementById('clear-btn');
let allConvertedLots = [];

function log(message, type = 'normal') {
    const entry = document.createElement('div');
    if (type) entry.classList.add(`log-${type}`);
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
}

function resetState() {
    allConvertedLots = [];
    logElement.innerHTML = '';
    downloadBtn.disabled = true;
    fileInput.value = '';
    log('Готов к работе...', 'info');
}
resetState();

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles(fileInput.files));
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});
clearBtn.addEventListener('click', resetState);
downloadBtn.addEventListener('click', () => {
    if (!allConvertedLots.length) { log('Нет данных для скачивания.', 'error'); return; }
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(allConvertedLots, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `FP_Tools_Import_${dateStr}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    log('Файл скачан!', 'success');
});

async function handleFiles(files) {
    if (!files?.length) return;
    logElement.innerHTML = '';
    log(`Обрабатываю ${files.length} файл(ов)...`, 'info');

    const results = await Promise.all(Array.from(files).map(file => new Promise(resolve => {
        if (!file.name.endsWith('.json')) {
            log(`Пропущен: "${file.name}" — нужен .json.`, 'error');
            resolve([]); return;
        }
        const reader = new FileReader();
        reader.onerror = () => { log(`Ошибка чтения "${file.name}".`, 'error'); resolve([]); };
        reader.onload = e => {
            try {
                let raw = JSON.parse(e.target.result.replace(/^\uFEFF/, ''));
                // Поддержка форматов: массив, { lots: [] }, { data: [] } или одиночный объект
                if (!Array.isArray(raw)) {
                    raw = raw?.lots || raw?.data || raw?.items || (raw?.offer_id !== undefined ? [raw] : null);
                    if (!raw) throw new Error('Неизвестный формат. Ожидается массив лотов Cardinal.');
                }
                if (!raw.length) { log(`"${file.name}": лотов не найдено.`, 'error'); resolve([]); return; }
                const converted = convertFormat(raw);
                log(`✓ "${file.name}" — ${converted.length} лот(ов).`, 'success');
                resolve(converted);
            } catch (err) {
                log(`Ошибка в "${file.name}": ${err.message}`, 'error');
                resolve([]);
            }
        };
        reader.readAsText(file, 'utf-8');
    })));

    allConvertedLots = results.flat();
    if (allConvertedLots.length > 0) {
        log(`Итого: ${allConvertedLots.length} лот(ов) готово к импорту.`, 'info');
        downloadBtn.disabled = false;
    } else {
        log('Подходящих лотов не найдено.', 'error');
        downloadBtn.disabled = true;
    }
}

function convertFormat(cardinalLots) {
    const metaKeys = ['query', 'location'];
    return cardinalLots.map((lot, idx) => {
        const data = {};
        for (const key in lot) {
            if (!metaKeys.includes(key)) data[key] = lot[key];
        }

        // Сбрасываем offer_id, чтобы FunPay создал новый лот при импорте
        if (data.offer_id !== undefined) data.offer_id = '0';

        // ── Маппинг полей Cardinal ──────────────────────────────────
        // secrets = массив товаров для автовыдачи → оставляем как secrets
        // answer  = сообщение после оплаты заказа → маппим в order_msg
        //
        // РАНЕЕ БЫЛА ОШИБКА: answer попадал в раздел автовыдачи в FP Tools,
        // так как оба использовали один и тот же путь сохранения.
        const hasSecrets = Array.isArray(data.secrets) && data.secrets.length > 0;
        const hasAnswer  = typeof data.answer === 'string' && data.answer.trim() !== '';

        // Автовыдача: включаем флаг, если есть секреты, иначе выключаем
        data.auto_delivery = hasSecrets ? 'on' : '';

        // Сообщение после оплаты: маппим answer в order_msg, НЕ кладем в секреты
        if (hasAnswer) {
            if (!data.order_msg) data.order_msg = data.answer;
            delete data.answer; // удаляем исходный ключ, чтобы избежать двойной обработки
        }

        const title =
            data['fields[summary][ru]'] ||
            data['fields[summary][en]'] ||
            data.title ||
            `Лот #${idx + 1}`;

        return {
            sourceTitle:    title,
            sourceCategory: data.nodeId ? String(data.nodeId) : '',
            data
        };
    });
}
