// Game state
let game = new Chess();
let board = null;
let isHumanTurn = true; // Human starts as white
let storageEnabled = false;
let mediaStream = null; // For camera/mic if granted

// Initialize the board
function initBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png' // Use Wikipedia piece images
    };
    board = Chessboard('board', config);
    updateStatus();
    checkStoragePermission(); // Auto-check storage on load
}

// Validate drag start (only human's turn, own pieces)
function onDragStart(source, piece) {
    if (!isHumanTurn || game.game_over()) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

// Handle drop (validate move)
function onDrop(source, target) {
    // See if the move is legal
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Promote to queen if pawn reaches end
    });

    // Illegal move
    if (move === null) return 'snapback';

    updateStatus();
    if (storageEnabled) {
        saveGameState(); // Save after human move if storage enabled
    }
    isHumanTurn = false; // Switch to AI turn
    setTimeout(makeAITurn, 500); // Delay for realism
}

// Update board position after move
function onSnapEnd() {
    board.position(game.fen());
}

// Update status message
function updateStatus() {
    let status = '';
    let moveColor = 'White';

    if (game.turn() === 'b') {
        moveColor = 'Black';
    }

    if (game.in_checkmate()) {
        status = `Game over! ${moveColor} is in checkmate.`;
        showGameOver(status);
        if (storageEnabled) {
            saveGameState(); // Save final state
        }
        return;
    } else if (game.in_draw()) {
        status = 'Game over! Draw.';
        showGameOver(status);
        if (storageEnabled) {
            saveGameState();
        }
        return;
    } else if (game.in_stalemate()) {
        status = 'Game over! Stalemate.';
        showGameOver(status);
        if (storageEnabled) {
            saveGameState();
        }
        return;
    } else if (game.in_check()) {
        status = `${moveColor} is in check.`;
    } else {
        status = `${moveColor} to move.`;
    }

    document.getElementById('status').innerHTML = status;
}

// Show game over UI
function showGameOver(text) {
    document.getElementById('gameOverText').innerHTML = text;
    document.getElementById('gameOver').style.display = 'block';
    isHumanTurn = false; // Prevent further moves
}

// AI makes a random legal move
function makeAITurn() {
    if (game.game_over()) return;

    // Get all legal moves
    let possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;

    // Pick a random move
    let randomIdx = Math.floor(Math.random() * possibleMoves.length);
    let move = game.move(possibleMoves[randomIdx]);

    // Update board
    board.position(game.fen());
    updateStatus();
    if (storageEnabled) {
        saveGameState(); // Save after AI move
    }
    isHumanTurn = true; // Back to human
}

// Reset the game
function resetGame() {
    game.reset();
    board.start();
    isHumanTurn = true;
    document.getElementById('gameOver').style.display = 'none';
    updateStatus();
    if (storageEnabled) {
        saveGameState(); // Save reset state
    }
}

// Save current game state to localStorage (if enabled)
function saveGameState() {
    try {
        localStorage.setItem('chessGameState', game.fen());
        localStorage.setItem('chessMoveHistory', JSON.stringify(game.history()));
        console.log('Game state saved!');
    } catch (error) {
        console.error('Failed to save game state:', error);
        updatePermissionStatus('Storage save failed. Check quota.');
    }
}

// Load game state from localStorage (example usage)
function loadGameState() {
    try {
        const fen = localStorage.getItem('chessGameState');
        if (fen) {
            game.load(fen);
            board.position(fen);
            updateStatus();
            console.log('Game state loaded!');
        }
    } catch (error) {
        console.error('Failed to load game state:', error);
    }
}

// Request storage persistence (allows unlimited localStorage in some browsers)
async function requestStoragePermission() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
            const persistent = await navigator.storage.persist();
            if (persistent) {
                storageEnabled = true;
                saveGameState(); // Test save
                updatePermissionStatus('Storage access granted! Games will be saved automatically.');
            } else {
                updatePermissionStatus('Storage access denied. Using basic localStorage.');
                storageEnabled = false; // Fallback to basic localStorage
            }
        } catch (error) {
            console.error('Storage permission error:', error);
            updatePermissionStatus('Storage request failed: ' + error.message);
        }
    } else {
        // Fallback: Basic localStorage doesn't need permission
        storageEnabled = true;
        saveGameState();
        updatePermissionStatus('Storage ready (no permission needed in this browser).');
    }
}

// Auto-check storage on init (no prompt, just enable if possible)
function checkStoragePermission() {
    if (localStorage) {
        storageEnabled = true;
        updatePermissionStatus('Storage available (games can be saved).');
    }
}

// Request camera and microphone permissions (for potential recording/voice features)
async function requestMediaPermissions() {
    try {
        // Request camera
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        if (cameraPermission.state === 'granted') {
            updatePermissionStatus('Camera already granted.');
        } else {
            const stream = await navigator.mediaDevices.getUser Media({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately after grant
            updatePermissionStatus('Camera access granted (stream stopped).');
        }

        // Request microphone (separately or combined)
        const micPermission = await navigator.permissions.query({ name: 'microphone' });
        if (micPermission.state === 'granted') {
            updatePermissionStatus('Microphone already granted.');
        } else {
            const audioStream = await navigator.mediaDevices.getUser Media({ audio: true });
            audioStream.getTracks().forEach(track => track.stop()); // Stop immediately
            updatePermissionStatus('Microphone access granted (stream stopped). Ready for voice features.');
        }

        // If you want to use the streams later, store them or reinitialize
        // Example: mediaStream = await navigator.mediaDevices.getUser Media({ video: true, audio: true });

    } catch (error) {
        console.error('Media permission error:', error);
        updatePermissionStatus('Media access denied or failed: ' + error.message + '. User denied or no HTTPS.');
    }
}

// Update permission status display
function updatePermissionStatus(message) {
    document.getElementById('permissionStatus').innerHTML = `<p style="color: #666; font-size: 14px;">${message}</p>`;
}

// Initialize on load
window.onload = function() {
    initBoard();
};
