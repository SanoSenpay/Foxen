// content/utils.js

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function createElement(tag, attributes = {}, styles = {}, innerHTML = '') {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    for (const [key, value] of Object.entries(styles)) {
        element.style[key] = value;
    }
    element.innerHTML = innerHTML;
    return element;
}

function waitForElementToBeEnabled(element, timeout = 2000) {
    return new Promise((resolve) => {
        if (!element.disabled) {
            return resolve();
        }
        const interval = 50;
        let elapsedTime = 0;
        const checker = setInterval(() => {
            elapsedTime += interval;
            if (!element.disabled || elapsedTime >= timeout) {
                clearInterval(checker);
                resolve();
            }
        }, interval);
    });
}

/**
 * --- НОВАЯ ВЕРСИЯ УВЕДОМЛЕНИЙ V4 (Более масштабная анимация) ---
 * Показывает уведомление с предварительной анимацией частиц.
 * @param {string} message - Текст для отображения.
 * @param {boolean} isError - Если true, уведомление будет в стиле ошибки.
 */
function showNotification(message, isError = false) {
    const NOTIFICATION_DURATION = 7000;
    const PARTICLE_ANIMATION_DURATION = 1000;
    const NOTIFICATION_APPEAR_DELAY = 500;
    const PARTICLE_COUNT = 25;

    const particleContainer = createElement('div', { 'aria-hidden': 'true' });
    const animationId = `fpToolsParticleAnimation-${Date.now()}`;
    const styleTagId = `fp-tools-particle-style-${Date.now()}`;

    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;
    const targetX = window.innerWidth - 150;
    const targetY = window.innerHeight - 60;

    const keyframes = `
        @keyframes ${animationId} {
            0% {
                transform: translate(var(--startX), var(--startY)) scale(var(--startScale));
                opacity: 1;
            }
            70% {
                opacity: 1;
            }
            100% {
                transform: translate(${targetX - startX}px, ${targetY - startY}px) scale(0);
                opacity: 0;
            }
        }
    `;

    const styleTag = createElement('style', { id: styleTagId }, {}, keyframes);
    document.head.appendChild(styleTag);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 150 + 50;
        const particleSize = Math.random() * 8 + 6;

        const particle = createElement('div', {}, {
            '--startX': `${Math.cos(angle) * radius}px`,
            '--startY': `${Math.sin(angle) * radius}px`,
            '--startScale': `${Math.random() * 0.5 + 0.8}`,
            position: 'fixed',
            top: `${startY}px`,
            left: `${startX}px`,
            width: `${particleSize}px`,
            height: `${particleSize}px`,
            background: isError ? '#FF8A80' : '#A259FF',
            borderRadius: '50%',
            zIndex: '20001',
            pointerEvents: 'none',
            opacity: '0',
            transform: `translate(var(--startX), var(--startY)) scale(0)`,
            animation: `${animationId} ${PARTICLE_ANIMATION_DURATION}ms cubic-bezier(0.5, 0.05, 0.6, 1) forwards`,
            animationDelay: `${Math.random() * 200}ms`,
        });
        
        const tail = createElement('div', {}, {
             width: '150%', height: '150%', position: 'absolute', top: '-25%', left: '-25%',
             borderRadius: '50%', background: isError ? '#FF8A80' : '#A259FF',
             filter: 'blur(8px)', opacity: '0.7'
        });
        particle.appendChild(tail);

        particleContainer.appendChild(particle);
    }
    document.body.appendChild(particleContainer);
    
    requestAnimationFrame(() => {
        Array.from(particleContainer.children).forEach(p => {
            p.style.transition = 'transform 0.4s cubic-bezier(0.1, 0.8, 0.7, 1), opacity 0.3s ease';
            p.style.transform = `translate(var(--startX), var(--startY)) scale(var(--startScale))`;
            p.style.opacity = '1';
        });
    });

    setTimeout(() => {
        const FADE_OUT_DELAY = NOTIFICATION_DURATION - 500;

        const notification = createElement('div', {}, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: isError ? 'rgba(194, 57, 42, 0.9)' : 'rgba(44, 47, 51, 0.9)',
            color: isError ? '#FF8A80' : '#A259FF',
            padding: '14px 22px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '500',
            boxShadow: '0 5px 25px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            webkitBackdropFilter: 'blur(8px)',
            zIndex: '20000',
            transform: 'scale(0.8)',
            opacity: '0',
            animation: `fpToolsEmerge 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards, fpToolsFadeOut 0.5s ${FADE_OUT_DELAY / 1000}s forwards`
        }, message);

        if (!document.querySelector('style[data-fp-tools-notify-keyframes]')) {
            const keyframesStyle = `
                @keyframes fpToolsEmerge {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes fpToolsFadeOut {
                    from { opacity: 1; transform: scale(1); } 
                    to { opacity: 0; transform: scale(0.9); }
                }
            `;
            const keyframesStyleSheet = createElement("style", { 'data-fp-tools-notify-keyframes': 'true' }, {}, keyframesStyle);
            document.head.appendChild(keyframesStyleSheet);
        }

        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, NOTIFICATION_DURATION);

    }, NOTIFICATION_APPEAR_DELAY);


    setTimeout(() => {
        if (document.body.contains(particleContainer)) {
            document.body.removeChild(particleContainer);
        }
        if (document.head.contains(styleTag)) {
            document.head.removeChild(styleTag);
        }
    }, PARTICLE_ANIMATION_DURATION + 300);
}

// === НОВАЯ ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ИЗОБРАЖЕНИЙ ===
function handleImageAddClick(targetTextarea) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg, image/gif, image/webp';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            document.body.removeChild(fileInput);
            return;
        }

        if (file.size > 1 * 1024 * 1024) { // 1 MB
            showNotification('Файл слишком большой. Выберите изображение до 1 МБ.', true);
            document.body.removeChild(fileInput);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const imageTag = `[image:${dataUrl}]`;
            
            const currentText = targetTextarea.value;
            if (currentText && !currentText.endsWith('\n') && !currentText.endsWith(' ')) {
                targetTextarea.value += ' ';
            }
            targetTextarea.value += imageTag;

            targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            targetTextarea.focus();

            document.body.removeChild(fileInput);
        };

        reader.onerror = () => {
            showNotification('Не удалось прочитать файл.', true);
            document.body.removeChild(fileInput);
        };

        reader.readAsDataURL(file);
    });

    document.body.appendChild(fileInput);
    fileInput.click();
}