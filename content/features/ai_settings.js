// content/features/ai_settings.js
// Handles the "AI Provider / API Key" settings page

async function initializeAISettings() {
    const page = document.querySelector('.fp-tools-page-content[data-page="ai_settings"]');
    if (!page || page.dataset.initialized) return;
    page.dataset.initialized = 'true';

    const storage = typeof browser !== 'undefined' ? browser : chrome;

    // Elements
    const providerBtns  = page.querySelectorAll('.fpt-ai-provider-btn');
    const apiKeyInput   = page.getElementById ? page.getElementById('fptAIApiKey') : document.getElementById('fptAIApiKey');
    const modelInput    = document.getElementById('fptAIModel');
    const toggleKeyBtn  = document.getElementById('fptAIToggleKey');
    const testBtn       = document.getElementById('fptAITestBtn');
    const testStatus    = document.getElementById('fptAITestStatus');
    const clearBtn      = document.getElementById('fptAIClearBtn');
    const modelHint     = document.getElementById('fptAIModelHint');
    const activeLabel   = document.getElementById('fptAIActiveLabel');

    // Default models per provider
    const DEFAULT_MODELS = {
        gemini:     'gemini-2.0-flash',
        openai:     'gpt-4o-mini',
        openrouter: 'google/gemini-2.0-flash-exp:free'
    };

    const MODEL_HINTS = {
        gemini:     'Бесплатно: gemini-2.0-flash, gemini-1.5-flash',
        openai:     'Дешевле: gpt-4o-mini · Лучше: gpt-4o',
        openrouter: 'Примеры: google/gemini-2.0-flash-exp:free · deepseek/deepseek-chat-v3-5:free · meta-llama/llama-3.3-8b-instruct:free'
    };

    let currentProvider = '';

    // Load saved settings
    const { fpToolsAIProvider = {} } = await storage.storage.local.get('fpToolsAIProvider');
    currentProvider = fpToolsAIProvider.provider || '';
    if (apiKeyInput)  apiKeyInput.value  = fpToolsAIProvider.apiKey  || '';
    if (modelInput)   modelInput.value   = fpToolsAIProvider.model   || '';

    // Highlight active provider button
    function selectProvider(p) {
        currentProvider = p;
        providerBtns.forEach(b => {
            b.classList.toggle('fpt-ai-provider-btn--active', b.dataset.provider === p);
        });
        if (modelHint) {
            modelHint.textContent = MODEL_HINTS[p] || '';
        }
        if (modelInput && !modelInput.value) {
            modelInput.placeholder = DEFAULT_MODELS[p] || '';
        }
        updateActiveLabel();
    }

    providerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectProvider(btn.dataset.provider);
            save();
        });
    });

    if (currentProvider) selectProvider(currentProvider);

    // Show/hide key
    if (toggleKeyBtn && apiKeyInput) {
        toggleKeyBtn.addEventListener('click', () => {
            const isHidden = apiKeyInput.type === 'password';
            apiKeyInput.type = isHidden ? 'text' : 'password';
            const eyeOpen = toggleKeyBtn.querySelector('.eye-open');
            const eyeClosed = toggleKeyBtn.querySelector('.eye-closed');
            if (eyeOpen && eyeClosed) {
                eyeOpen.style.display = isHidden ? 'none' : 'inline-block';
                eyeClosed.style.display = isHidden ? 'inline-block' : 'none';
            }
        });
    }

    // Auto-save on any change
    function save() {
        storage.storage.local.set({
            fpToolsAIProvider: {
                provider: currentProvider,
                apiKey:   apiKeyInput  ? apiKeyInput.value.trim()  : '',
                model:    modelInput   ? modelInput.value.trim()   : ''
            }
        });
        updateActiveLabel();
    }

    if (apiKeyInput) apiKeyInput.addEventListener('input', save);
    if (modelInput)  modelInput.addEventListener('input',  save);

    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            currentProvider = '';
            if (apiKeyInput) apiKeyInput.value = '';
            if (modelInput)  modelInput.value  = '';
            providerBtns.forEach(b => b.classList.remove('fpt-ai-provider-btn--active'));
            if (modelHint) modelHint.textContent = '';
            await storage.storage.local.set({ fpToolsAIProvider: {} });
            updateActiveLabel();
            if (testStatus) { testStatus.textContent = ''; testStatus.className = 'fpt-ai-test-status'; }
        });
    }

    // Test button
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            const key   = apiKeyInput ? apiKeyInput.value.trim()  : '';
            const model = modelInput  ? modelInput.value.trim()   : '';
            if (!currentProvider || !key) {
                setStatus('⚠️ Выберите провайдера и введите ключ', 'warn');
                return;
            }
            testBtn.disabled = true;
            setStatus('Проверяю...', 'loading');
            const resp = await chrome.runtime.sendMessage({
                action: 'testAIProviderKey',
                provider: currentProvider,
                apiKey: key,
                model: model
            });
            testBtn.disabled = false;
            if (resp && resp.success) {
                setStatus('✓ Ключ работает!', 'ok');
            } else {
                setStatus('✗ ' + (resp?.error || 'Ошибка подключения'), 'err');
            }
        });
    }

    function setStatus(msg, type) {
        if (!testStatus) return;
        testStatus.textContent = msg;
        testStatus.className = 'fpt-ai-test-status fpt-ai-test-status--' + type;
    }

    function updateActiveLabel() {
        if (!activeLabel) return;
        if (currentProvider && apiKeyInput && apiKeyInput.value.trim()) {
            const names = { gemini: 'Gemini', openai: 'OpenAI', openrouter: 'OpenRouter' };
            activeLabel.textContent = '⚡ Активен: ' + (names[currentProvider] || currentProvider);
            activeLabel.style.display = 'inline-block';
        } else {
            activeLabel.textContent = '🦊 Foxen сервер (резерв)';
            activeLabel.style.display = 'inline-block';
        }
    }

    updateActiveLabel();
}
