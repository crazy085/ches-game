// Game state
let game = new Chess();
let board = null;
let isHumanTurn = true; // Human starts as White

// Initialize the board
function initBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        onSquareClick: onSquareClick,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('board', config);
    updateSquareStyles();
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

// Handle drop
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

    // Save game state
    localStorage.setItem('chessGameFen', game.fen());

    updateSquareStyles();
    updateStatus();
    isHumanTurn = false;
    setTimeout(makeAITurn, 500);
}

// Handle square click for permissions
function onSquareClick(square) {
    if (square === 'e4' && game.get('e4') && game.get('e4').type === 'p') {
        requestCameraAccess();
    }
    if (square === 'f3' && game.get('f3') && game.get('f3').type === 'n') {
        requestMicAccess();
    }
}

// Request camera access
function requestCameraAccess() {
    console.log('Attempting camera access for pawn on e4');
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            console.log('Camera access granted');
            stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
            console.error('Camera access denied:', err);
        });
}

// Request microphone access
function requestMicAccess() {
    console.log('Attempting microphone access for knight on f3');
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log('Microphone access granted');
            stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
            console.error('Microphone access denied:', err);
        });
}

// Update square styles for permission triggers
function updateSquareStyles() {
    const e4 = document.getElementById('e4');
    const f3 = document.getElementById('f3');
    if (e4) {
        e4.classList.toggle('permission-active', game.get('e4') && game.get('e4').type === 'p');
    }
    if (f3) {
        f3.classList.toggle('permission-active', game.get('f3') && game.get('f3').type === 'n');
    }
}

// Update board position
function onSnapEnd() {
    board.position(game.fen());
    updateSquareStyles();
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
    localStorage.setItem('chessGameFen', game.fen());
    updateSquareStyles();
    updateStatus();
    isHumanTurn = true;
}

// Reset the game
function resetGame() {
    game.reset();
    board.start();
    isHumanTurn = true;
    localStorage.setItem('chessGameFen', game.fen()); // Save initial state
    document.getElementById('status').innerHTML = 'White to move.';
    document.getElementById('gameOver').style.display = 'none';
    updateSquareStyles();
    updateStatus();
}

// Initialize on load
window.onload = function() {
    initBoard();
};
