// content/features/image_generator.js

let imageGeneratorInstance = null;

class ImageGenerator {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.settings = this.getDefaults();
        this.activeInput = null;
        this.init();
    }

    getDefaults() {
        return {
            bgColor1: '#2c3e50',
            bgColor2: '#fd746c',
            text1: 'ЗАГОЛОВОК',
            text1Color: '#ffffff',
            text1Size: 48,
            text2: 'Подзаголовок',
            text2Color: '#eeeeee',
            text2Size: 24,
            text3: 'Дополнительный текст',
            text3Color: '#dddddd',
            text3Size: 20,
            icon: 'gamepad',
            iconColor: '#ffffff',
            iconSize: 100
        };
    }

    init() {
        this.createModal();
        this.canvas = document.getElementById('fpToolsImageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.addEventListeners();
        this.applyTheme({
            bgColor1: '#2c3e50',
            bgColor2: '#fd746c',
            text1Color: '#ffffff',
            iconColor: '#ffffff'
        });
        this.draw();
    }

    createModal() {
        if (document.getElementById('fpToolsImageGeneratorModal')) return;

        const modal = createElement('div', { id: 'fpToolsImageGeneratorModal' });
        modal.innerHTML = `
            <div class="fp-tools-ig-container">
                <div class="fp-tools-ig-header">
                    <h3>Генератор изображений</h3>
                    <button id="fpToolsImageGeneratorClose" class="fp-tools-ig-close">×</button>
                </div>
                <div class="fp-tools-ig-body">
                    <div class="fp-tools-ig-preview">
                        <canvas id="fpToolsImageCanvas" width="320" height="320"></canvas>
                    </div>
                    <div class="fp-tools-ig-controls">
                        <div class="fp-tools-ig-tabs">
                            <button class="fp-tools-ig-tab active" data-tab="themes">Темы</button>
                            <button class="fp-tools-ig-tab" data-tab="text">Текст</button>
                            <button class="fp-tools-ig-tab" data-tab="background">Фон</button>
                            <button class="fp-tools-ig-tab" data-tab="icon">Иконка</button>
                            <button class="fp-tools-ig-tab" id="fpToolsKeyboardToggleBtn">Символы</button>
                        </div>
                        <div class="fp-tools-ig-panels">
                            <div class="fp-tools-ig-panel active" data-panel="themes">
                                <div class="fp-tools-ig-theme-grid">
                                    <div class="fp-tools-ig-theme-item" data-theme='{"bgColor1":"#2c3e50","bgColor2":"#fd746c","text1Color":"#ffffff","iconColor":"#ffffff"}' style="background: linear-gradient(45deg, #2c3e50, #fd746c);"></div>
                                    <div class="fp-tools-ig-theme-item" data-theme='{"bgColor1":"#00c6ff","bgColor2":"#0072ff","text1Color":"#ffffff","iconColor":"#ffffff"}' style="background: linear-gradient(45deg, #00c6ff, #0072ff);"></div>
                                    <div class="fp-tools-ig-theme-item" data-theme='{"bgColor1":"#ff0084","bgColor2":"#33001b","text1Color":"#ffffff","iconColor":"#ffffff"}' style="background: linear-gradient(45deg, #ff0084, #33001b);"></div>
                                    <div class="fp-tools-ig-theme-item" data-theme='{"bgColor1":"#101010","bgColor2":"#101010","text1Color":"#00ff00","iconColor":"#00ff00"}' style="background: #101010;"></div>
                                    <div class="fp-tools-ig-theme-item" data-theme='{"bgColor1":"#fdfc47","bgColor2":"#24fe41","text1Color":"#000000","iconColor":"#000000"}' style="background: linear-gradient(45deg, #fdfc47, #24fe41);"></div>
                                    <div class="fp-tools-ig-theme-item" data-theme='{"bgColor1":"#ffffff","bgColor2":"#e0e0e0","text1Color":"#333333","iconColor":"#333333"}' style="background: #ffffff;"></div>
                                </div>
                            </div>
                            <div class="fp-tools-ig-panel" data-panel="text">
                                <input type="text" id="igText1" class="fp-tools-ig-input" placeholder="Заголовок">
                                <div class="fp-tools-ig-inline-controls"><input type="color" id="igText1Color"><input type="range" id="igText1Size" min="16" max="100" value="48"></div>
                                <input type="text" id="igText2" class="fp-tools-ig-input" placeholder="Подзаголовок">
                                <div class="fp-tools-ig-inline-controls"><input type="color" id="igText2Color"><input type="range" id="igText2Size" min="12" max="64" value="24"></div>
                                <input type="text" id="igText3" class="fp-tools-ig-input" placeholder="Доп. текст">
                                <div class="fp-tools-ig-inline-controls"><input type="color" id="igText3Color"><input type="range" id="igText3Size" min="10" max="48" value="20"></div>
                            </div>
                            <div class="fp-tools-ig-panel" data-panel="background">
                                <label>Цвет 1:</label><input type="color" id="igBgColor1">
                                <label>Цвет 2 (для градиента):</label><input type="color" id="igBgColor2">
                            </div>
                            <div class="fp-tools-ig-panel" data-panel="icon">
                                 <input type="text" id="igIcon" class="fp-tools-ig-input" placeholder="Иконка (напр. gamepad). Оставьте пустым, чтобы убрать.">
                                <div class="fp-tools-ig-inline-controls"><input type="color" id="igIconColor"><input type="range" id="igIconSize" min="32" max="200" value="100"></div>
                                <p class="fp-tools-ig-small-text">Используйте названия из <a href="https://fonts.google.com/icons" target="_blank" rel="noopener noreferrer">Google Material Icons</a> (в нижнем регистре, заменяя пробелы на \`_\`).</p>
                            </div>
                            <div class="fp-tools-ig-symbols-panel"></div>
                        </div>
                        <div class="fp-tools-ig-ai-generator">
                            <div class="fp-tools-ig-ai-header">
                                <span class="material-icons" style="font-size: 20px;">auto_awesome</span>
                                <span>Создать с помощью ИИ</span>
                            </div>
                            <textarea id="igAiPrompt" rows="3" placeholder="Пример: огненный значок для клана, текст 'FIRE SQUAD'"></textarea>
                            <button id="igAiGenerateBtn" class="fp-tools-ig-btn-primary">
                                <span class="btn-text">Сгенерировать</span>
                                <span class="btn-loader"></span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="fp-tools-ig-footer">
                    <button id="fpToolsImageGeneratorSave" class="fp-tools-ig-btn-primary">Сохранить</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    show() { document.getElementById('fpToolsImageGeneratorModal').style.display = 'flex'; }
    hide() { document.getElementById('fpToolsImageGeneratorModal').style.display = 'none'; }
    
    updateInputs() {
        document.getElementById('igText1').value = this.settings.text1;
        document.getElementById('igText1Color').value = this.settings.text1Color;
        document.getElementById('igText1Size').value = this.settings.text1Size;
        document.getElementById('igText2').value = this.settings.text2;
        document.getElementById('igText2Color').value = this.settings.text2Color;
        document.getElementById('igText2Size').value = this.settings.text2Size;
        document.getElementById('igText3').value = this.settings.text3;
        document.getElementById('igText3Color').value = this.settings.text3Color;
        document.getElementById('igText3Size').value = this.settings.text3Size;
        document.getElementById('igBgColor1').value = this.settings.bgColor1;
        document.getElementById('igBgColor2').value = this.settings.bgColor2;
        document.getElementById('igIcon').value = this.settings.icon;
        document.getElementById('igIconColor').value = this.settings.iconColor;
        document.getElementById('igIconSize').value = this.settings.iconSize;
    }

    applyTheme(themeData) {
        this.settings = { ...this.settings, ...themeData };
        this.updateInputs();
        this.draw();
    }

    addEventListeners() {
        const modal = document.getElementById('fpToolsImageGeneratorModal');
        modal.querySelector('#fpToolsImageGeneratorClose').addEventListener('click', () => this.hide());
        modal.querySelector('#fpToolsImageGeneratorSave').addEventListener('click', () => this.saveToComputer());

        modal.querySelectorAll('.fp-tools-ig-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                modal.querySelectorAll('.fp-tools-ig-tab, .fp-tools-ig-panel, .fp-tools-ig-symbols-panel').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');
                if (tabName !== 'symbols') {
                    const panel = modal.querySelector(`.fp-tools-ig-panel[data-panel="${tabName}"]`);
                    if (panel) panel.classList.add('active');
                    modal.querySelector('.fp-tools-ig-symbols-panel').style.display = 'none';
                }
            });
        });

        modal.querySelectorAll('.fp-tools-ig-theme-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.applyTheme(JSON.parse(e.target.dataset.theme));
            });
        });

        const inputs = ['igText1', 'igText2', 'igText3', 'igIcon', 'igBgColor1', 'igBgColor2', 'igText1Color', 'igText2Color', 'igText3Color', 'igIconColor', 'igText1Size', 'igText2Size', 'igText3Size', 'igIconSize'];
        inputs.forEach(id => {
            const el = modal.querySelector(`#${id}`);
            el.addEventListener('input', (e) => {
                const keyMap = {
                    'igText1': 'text1', 'igText2': 'text2', 'igText3': 'text3', 'igIcon': 'icon',
                    'igBgColor1': 'bgColor1', 'igBgColor2': 'bgColor2',
                    'igText1Color': 'text1Color', 'igText2Color': 'text2Color', 'igText3Color': 'text3Color',
                    'igIconColor': 'iconColor', 'igText1Size': 'text1Size', 'igText2Size': 'text2Size',
                    'igText3Size': 'text3Size', 'igIconSize': 'iconSize'
                };
                this.settings[keyMap[id]] = e.target.value;
                this.draw();
            });
            el.addEventListener('focus', () => { this.activeInput = el; });
        });

        modal.querySelector("#fpToolsKeyboardToggleBtn").addEventListener("click", () => {
            const panel = modal.querySelector(".fp-tools-ig-symbols-panel");
            const symbols = [ '★', '☆', '✪', '✯', '✡', '✩', '✧', '✵', '✶', '✷', '✸', '✹', '✔', '✓', '☑', '✅', '✖', '❌', '✘', '❎', '❤', '♡', '♥', '✨', '⚡', '❄', '🔥', '☘', '⚜', '⚫', '⚪', '◼', '◻', '●', '○', '➥', '➡', '➢', '➤', '▶', '◀', '▲', '▼', '⚔', '⚖', '⚕', '⚓', '⚙', '⚠', '⛔', '☢', '☣', '⬆', '↗' ];
            if (panel.innerHTML === '') {
                panel.innerHTML = symbols.map(symbol => `<span class="fp-tools-ig-symbol-char">${symbol}</span>`).join('');
            }
            const isVisible = panel.style.display === 'grid';
            panel.style.display = isVisible ? 'none' : 'grid';
            if (!isVisible) {
                modal.querySelectorAll('.fp-tools-ig-panel').forEach(p => p.classList.remove('active'));
            }
        });

        modal.querySelector('.fp-tools-ig-panels').addEventListener("click", (event) => {
            if (!event.target.classList.contains('fp-tools-ig-symbol-char')) return;
            if (this.activeInput) {
                const start = this.activeInput.selectionStart;
                const end = this.activeInput.selectionEnd;
                const text = this.activeInput.value;
                const symbol = event.target.textContent;
                this.activeInput.value = text.substring(0, start) + symbol + text.substring(end);
                this.activeInput.selectionStart = this.activeInput.selectionEnd = start + symbol.length;
                this.activeInput.focus();
                this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        
        modal.querySelector('#igAiGenerateBtn').addEventListener('click', async () => {
            const btn = modal.querySelector('#igAiGenerateBtn');
            const promptInput = modal.querySelector('#igAiPrompt');
            const prompt = promptInput.value.trim();

            if (!prompt) {
                showNotification('Введите описание для ИИ', true);
                return;
            }

            btn.classList.add('loading');
            btn.disabled = true;

            try {
                const response = await browser.runtime.sendMessage({ action: "getAIImageSettings", prompt: prompt });
                if (response && response.success) {
                    this.applyTheme(response.data);
                    showNotification('Изображение сгенерировано ИИ!');
                } else {
                    throw new Error(response.error || 'Неизвестная ошибка ИИ.');
                }
            } catch (error) {
                showNotification(`Ошибка ИИ: ${error.message}`, true);
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });
    }

    draw() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        const gradient = this.ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, this.settings.bgColor1);
        gradient.addColorStop(1, this.settings.bgColor2);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);

        const hasIcon = this.settings.icon && this.settings.icon.trim() !== '';
        
        let textYOffset = hasIcon ? 40 : 0;
        let iconYOffset = hasIcon ? -60 : 0;
        let text2YOffset = hasIcon ? 90 : 60;
        let text3YOffset = height - 30;

        if (hasIcon) {
            this.ctx.font = `normal ${this.settings.iconSize}px 'Material Icons'`;
            this.ctx.fillStyle = this.settings.iconColor;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.settings.icon, width / 2, height / 2 + iconYOffset);
        }
        
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.font = `bold ${this.settings.text1Size}px 'Graphik Bold'`;
        this.ctx.fillStyle = this.settings.text1Color;
        this.drawWrappedText(this.settings.text1, width / 2, height / 2 + textYOffset, width - 40, this.settings.text1Size * 1.1);

        this.ctx.font = `normal ${this.settings.text2Size}px 'Graphik Semibold'`;
        this.ctx.fillStyle = this.settings.text2Color;
        this.drawWrappedText(this.settings.text2, width / 2, height / 2 + text2YOffset, width - 60, this.settings.text2Size * 1.2);
        
        this.ctx.font = `normal ${this.settings.text3Size}px 'Segoe UI'`;
        this.ctx.fillStyle = this.settings.text3Color;
        this.ctx.fillText(this.settings.text3, width / 2, text3YOffset);

        this.ctx.shadowColor = 'transparent';
    }

    drawWrappedText(text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let testY = y;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            if (this.ctx.measureText(testLine).width > maxWidth && n > 0) {
                this.ctx.fillText(line, x, testY);
                line = words[n] + ' ';
                testY += lineHeight;
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, x, testY);
    }
    
    saveToComputer() {
        this.canvas.toBlob((blob) => {
            const link = document.createElement('a');
            link.download = `funpay-image-${Date.now()}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
            this.hide();
            showNotification('Изображение сохранено на ваш компьютер!');
        }, 'image/png');
    }
}

function initializeImageGenerator() {
    const offerEditor = document.querySelector('.form-offer-editor');
    if (!offerEditor) return;
    
    const imageField = offerEditor.querySelector('.lot-field[data-id="images"]');
    if (!imageField) return;

    if (document.getElementById('fpToolsGenerateImageBtn')) return;

    if (!document.getElementById('google-material-icons')) {
        const link = createElement('link', {
            id: 'google-material-icons',
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/icon?family=Material+Icons'
        });
        document.head.appendChild(link);
    }
    
    const btnContainer = createElement('div', { class: 'generate-btn-container' });
    const generateBtn = createElement('button', {
        id: 'fpToolsGenerateImageBtn',
        class: 'btn btn-default',
        type: 'button'
    }, {}, 'Сгенерировать');
    
    btnContainer.appendChild(generateBtn);
    imageField.insertBefore(btnContainer, imageField.querySelector('.attachments-box'));

    generateBtn.addEventListener('click', () => {
        if (!imageGeneratorInstance) {
            imageGeneratorInstance = new ImageGenerator();
        }
        imageGeneratorInstance.show();
    });
}