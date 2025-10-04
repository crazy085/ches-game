// ui.js (ES Module)
import { gameManager, audioManager } from './script.js';

export function updateTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.body.className = '';
    document.body.classList.add(theme);
}

export function initUI() {
    // Theme selection
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.addEventListener('change', updateTheme);

    // Keyboard navigation for move history
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && gameManager.historyIndex > 1) {
            gameManager.goToMove(Math.floor((gameManager.historyIndex - 2) / 2));
        } else if (e.key === 'ArrowRight' && gameManager.historyIndex < gameManager.moveHistory.length) {
            gameManager.goToMove(Math.floor(gameManager.historyIndex / 2));
        }
    });

    // Optional: button controls (if exist in HTML)
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', () => gameManager.undoMove());

    const flipBtn = document.getElementById('flipBtn');
    if (flipBtn) flipBtn.addEventListener('click', () => gameManager.flipBoard());

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => gameManager.resetGame());

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => gameManager.exportPgn());
}

// Modernized playSound integrated with AudioManager
export function playMoveSound(move) {
    if (!document.getElementById('soundToggle').checked) return;
    let soundName = 'move';
    if (move && move.captured) soundName = 'capture';
    else if (gameManager.game.in_check()) soundName = 'check';
    audioManager.play(soundName);
}

// Initialize UI on page load
window.addEventListener('load', initUI);
