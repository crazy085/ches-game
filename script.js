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

function updateMoveHistory() {
    const history = game.history().reduce((acc, move, i) => {
        if (i % 2 === 0) acc.push(`${Math.floor(i / 2) + 1}. ${move}`);
        else acc[acc.length - 1] += ` ${move}`;
        return acc;
    }, []).join('<br>');
    document.getElementById('moveHistory').innerHTML = history || 'No moves yet';
}

// Call in onDrop and makeAITurn
function requestCameraAccess() {
    console.log('Attempting camera access for pawn to e4');
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            console.log('Camera access granted');
            document.getElementById('webcam').srcObject = stream;
            document.getElementById('webcam').style.display = 'block';
        })
        .catch(err => console.error('Camera access denied:', err));
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

    // Trigger permissions for specific moves
    if (move.to === 'e4' && game.get('e4').type === 'p') {
        requestCameraAccess();
    }
    if (move.to === 'f3' && game.get('f3').type === 'n') {
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
    console.log('Attempting camera access for pawn to e4');
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            console.log('Camera access granted');
            stream.getTracks().forEach(track => track.stop()); // Stop stream
        })
        .catch(err => {
            console.error('Camera access denied:', err);
        });
}

// Request microphone access
function requestMicAccess() {
    console.log('Attempting microphone access for knight to f3');
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log('Microphone access granted');
            stream.getTracks().forEach(track => track.stop()); // Stop stream
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
    localStorage.setItem('chessGameFen', game.fen());
    updateStatus();
    isHumanTurn = true;
}

// Reset the game
function resetGame() {
    game.reset();
    board.start();
    isHumanTurn = true;
    localStorage.removeItem('chessGameFen'); // Clear saved state
    document.getElementById('status').innerHTML = 'White to move.';
    document.getElementById('gameOver').style.display = 'none';
    updateStatus();
}

// Initialize on load
window.onload = function() {
    initBoard();
};
