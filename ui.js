function updateTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.body.className = '';
    document.body.classList.add(theme);
}

function playSound(move) {
    if (!document.getElementById('soundToggle').checked) return;
    let soundUrl = 'https://cdn.pixabay.com/audio/2022/05/26/audio_4f6f7d6b84.mp3';
    if (move.captured) soundUrl = 'https://cdn.pixabay.com/audio/2022/05/26/audio_4f6f7d6b84.mp3';
    else if (game.in_check()) soundUrl = 'https://cdn.pixabay.com/audio/2022/05/26/audio_4f6f7d6b84.mp3';
    const audio = new Audio(soundUrl);
    audio.volume = 0.3;
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
