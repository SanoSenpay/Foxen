// content/features/notes.js

let notesDebounceTimer;

/**
 * Инициализирует функциональность блокнота для заметок.
 */
function initializeNotes() {
    const notesArea = document.getElementById('foxenNotesArea');
    if (!notesArea || notesArea.dataset.initialized) return;

    // Загружаем существующие заметки при открытии
    chrome.storage.local.get('foxenUserNotes', ({ foxenUserNotes }) => {
        if (foxenUserNotes) {
            notesArea.value = foxenUserNotes;
        }
    });

    // Сохраняем заметки при вводе с небольшой задержкой, чтобы не нагружать систему
    notesArea.addEventListener('input', () => {
        clearTimeout(notesDebounceTimer);
        notesDebounceTimer = setTimeout(() => {
            chrome.storage.local.set({ foxenUserNotes: notesArea.value })
                .then(() => console.log("Foxen: Notes saved."))
                .catch(err => console.error("Foxen: Error saving notes:", err));
        }, 500); // Сохраняем через 500 мс после прекращения ввода
    });

    notesArea.dataset.initialized = 'true';
}