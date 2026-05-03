// content/features/custom_sound.js

const soundMap = {
    vk: 'vk.mp3',
    tg: 'tg.mp3',
    iphone: 'iphone.mp3',
    discord: 'discord.mp3',
    whatsapp: 'whatsapp.mp3'
};

async function applyNotificationSound() {
    const { notificationSound, notificationSoundDataUrl } = await browser.storage.local.get([
        'notificationSound',
        'notificationSoundDataUrl'
    ]);
    const selectedSound = notificationSound || 'default';

    const audioSource = document.querySelector("source[src='/audio/chat_loud.mp3'], source[src^='browser-extension://']");
    const audioPlayer = document.querySelector("audio.loud");

    if (!audioSource || !audioPlayer) {
        return;
    }

    if (selectedSound === 'default') {
        const originalSrc = 'https://funpay.com/audio/chat_loud.mp3';
        // Проверяем, нужно ли возвращать стандартный звук
        if (audioSource.src !== originalSrc) {
            audioSource.src = originalSrc;
            audioPlayer.load(); // <-- ВАЖНОЕ ИСПРАВЛЕНИЕ
        }
    } else if (selectedSound === 'custom') {
        const dataUrl = (notificationSoundDataUrl || '').trim();
        if (dataUrl.startsWith('data:audio/') && dataUrl.length < 900000) {
            if (audioSource.src !== dataUrl) {
                audioSource.src = dataUrl;
                audioPlayer.load();
            }
            return;
        }
        // If custom selected but no uploaded file is set — fall back to default
        const originalSrc = 'https://funpay.com/audio/chat_loud.mp3';
        if (audioSource.src !== originalSrc) {
            audioSource.src = originalSrc;
            audioPlayer.load();
        }
    } else {
        const soundFile = soundMap[selectedSound];
        if (soundFile) {
            const newSrc = browser.runtime.getURL(`sounds/${soundFile}`);
            // Проверяем, нужно ли устанавливать новый звук
            if (audioSource.src !== newSrc) {
                audioSource.src = newSrc;
                audioPlayer.load(); // <-- ВАЖНОЕ ИСПРАВЛЕНИЕ
            }
        }
    }
}

function initializeCustomSound() {
    // Первоначальное применение звука
    applyNotificationSound();

    // Наблюдатель на случай, если FunPay динамически пересоздаст плеер
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.addedNodes) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1 && (node.matches("audio.loud") || node.querySelector("audio.loud"))) {
                        applyNotificationSound();
                        return;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}