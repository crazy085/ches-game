// Game state
let game = new Chess();
let board = null;
let isHumanTurn = true; // Human starts as white

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
    isHumanTurn = true; // Back to human
}

// Reset the game
function resetGame() {
    game.reset();
    board.start();
    isHumanTurn = true;
    document.getElementById('gameOver').style.display = 'none';
    updateStatus();
}

// Initialize on load
window.onload = function() {
    initBoard();
};