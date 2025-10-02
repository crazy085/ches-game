// Game state
let game = new Chess();
let board = null;
let isHumanTurn = true; // Human starts as White
let cameraGranted = false; // Track camera permission
let micGranted = false; // Track mic permission

// Initialize the board
function initBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('board', config);
    
    // Load saved game state if available
    const savedFen = localStorage.getItem('chessGameFen');
    if (savedFen && game.load(savedFen)) {
        board.position(savedFen);
    }
    updateStatus();
}

// Validate drag start
function onDragStart(source, piece) {
    if (!isHumanTurn || game.game_over()) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

// Handle drop and trigger permissions
function onDrop(source, target) {
    let promotion = 'q';
    if (game.get(source).type === 'p' && target[1] === '8') {
        promotion = prompt('Promote to (q, r, b, n):', 'q') || 'q';
        if (!['q', 'r', 'b', 'n'].includes(promotion)) return 'snapback';
    }
    
    let move = game.move({
        from: source,
        to: target,
        promotion: promotion
    });

    if (move === null) return 'snapback';

    // Check for specific moves to trigger permissions
    if (move.from === 'e2' && move.to === 'e4' && !cameraGranted) {
        requestCameraAccess();
    }
    if ((move.from === 'g1' || move.from === 'b1') && move.to === 'f3' && !micGranted) {
        requestMicAccess();
    }

    // Save game state
    localStorage.setItem('chessGameFen', game.fen());

    updateStatus();
    isHumanTurn = false;
    setTimeout(makeAITurn, 500);
}

// Request camera access
function requestCameraAccess() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            console.log('Camera access granted');
            cameraGranted = true;
            stream.getTracks().forEach(track => track.stop()); // Stop stream after granting
        })
        .catch(err => {
            console.error('Camera access denied:', err);
        });
}

// Request microphone access
function requestMicAccess() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log('Microphone access granted');
            micGranted = true;
            stream.getTracks().forEach(track => track.stop()); // Stop stream after granting
        })
        .catch(err => {
            console.error('Microphone access denied:', err);
        });
}

// Update board position
function onSnapEnd() {
    board.position(game.fen());
}

// Update status message
function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'b' ? 'Black' : 'White';

    if (game.in_checkmate()) {
        status = `Game over! ${moveColor} is in checkmate.`;
        showGameOver(status);
        return;
    } else if (game.in_draw()) {
        status = 'Game over! Draw.';
        showGameOver(status);
        return;
    } else if (game.in_stalemate()) {
        status = 'Game over! Stalemate.';
        showGameOver(status);
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
    isHumanTurn = false;
}

// AI makes a random legal move
function makeAITurn() {
    if (game.game_over()) return;
    let possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;
    let randomIdx = Math.floor(Math.random() * possibleMoves.length);
    let move = game.move(possibleMoves[randomIdx]);
    console.log('AI moved:', move.san);
    board.position(game.fen());
    localStorage.setItem('chessGameFen', game.fen()); // Save AI move
    updateStatus();
    isHumanTurn = true;
}

// Reset the game
function resetGame() {
    game.reset();
    board.start();
    isHumanTurn = true;
    cameraGranted = false; // Reset permissions
    micGranted = false;
    localStorage.removeItem('chessGameFen'); // Clear saved state
    document.getElementById('gameOver').style.display = 'none';
    updateStatus();
}

// Initialize on load
window.onload = function() {
    initBoard();
};
