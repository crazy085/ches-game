function updateTheme() {
    try {
        const theme = document.getElementById('themeSelect').value;
        document.body.className = '';
        document.body.classList.add(theme);
    } catch (err) {
        console.error('Error in updateTheme:', err);
    }
}

function playSound(move) {
    if (!document.getElementById('soundToggle').checked) return;
    try {
        let soundUrl = '/sounds/move.wav';
        if (move.captured) soundUrl = '/sounds/capture.wav';
        else if (game.in_check()) soundUrl = '/sounds/check.wav';
        const audio = new Audio(soundUrl);
        audio.volume = 0.3;
        audio.play().catch(err => console.error('Sound error:', err));
    } catch (err) {
        console.error('Error in playSound:', err);
    }
}

function initUI() {
    try {
        document.getElementById('themeSelect').addEventListener('change', updateTheme);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && historyIndex > 1) {
                goToMove(Math.floor((historyIndex - 2) / 2));
            } else if (e.key === 'ArrowRight' && historyIndex < moveHistory.length) {
                goToMove(Math.floor(historyIndex / 2));
            }
        });
    } catch (err) {
        console.error('Error in initUI:', err);
    }
}

window.addEventListener('load', initUI);
