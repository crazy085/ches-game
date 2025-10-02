function updateTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.body.className = '';
    document.body.classList.add(theme);
}
function playSound(move) {
    if (!document.getElementById('soundToggle').checked) return;
    const audio = new Audio(move.captured ? 'sounds/capture.wav' : (game.in_check() ? 'sounds/check.wav' : 'sounds/move.wav'));
    audio.play().catch(err => console.log('Audio error:', err));
}
function initUI() {
    document.getElementById('themeSelect').addEventListener('change', updateTheme);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && historyIndex > 1) {
            goToMove(Math.floor((historyIndex - 2) / 2));
        } else if (e.key === 'ArrowRight' && historyIndex < moveHistory.length) {
            goToMove(Math.floor(historyIndex / 2));
        }
    });
}
window.addEventListener('load', initUI);
