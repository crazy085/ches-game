// Game state
let game = new Chess();
let board = null;
let isHumanTurn = true;
let selectedSquare = null;
let pendingPromotion = null;

// Initialize the board
function initBoard() {
    const config = {
        draggable: false,
        position: 'start',
        onSquareClick: onSquareClick,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('board', config);
    updateSquareStyles();
    updateStatus();

    // Add click listeners for promotion images
    const promotionImages = document.querySelectorAll('#promotionModal img');
    promotionImages.forEach(img => {
        img.addEventListener('click', () => handlePromotion(img.getAttribute('data-piece')));
    });
}

// Handle square click for move and permissions
function onSquareClick(square) {
    // Permission triggers
    if (square === 'e4' && game.get('e4') && game.get('e4').type === 'p') {
        requestCameraAccess();
    }
    if (square === 'f3' && game.get('f3') && game.get('f3').type === 'n') {
        requestMicAccess();
    }

    // Move handling
    if (!isHumanTurn || game.game_over()) return;

    const piece = game.get(square);
    if (!selectedSquare) {
        // First click: Select piece
        if (piece && piece.color === 'w') {
            selectedSquare = square;
            highlightSelected(square);
        }
    } else {
        // Second click: Attempt move
        const move = {
            from: selectedSquare,
            to: square,
            promotion: 'q' // Default, overridden if promotion
        };

        // Check for promotion
        const sourcePiece = game.get(selectedSquare);
        if (sourcePiece.type === 'p' && square[1] === '8') {
            pendingPromotion = move;
            document.getElementById('promotionModal').style.display = 'flex';
            return;
        }

        // Try move
        const result = game.move(move);
        clearHighlight();
        selectedSquare = null;

        if (result) {
            localStorage.setItem('chessGameFen', game.fen());
            board.position(game.fen());
            updateSquareStyles();
            updateStatus();
            isHumanTurn = false;
            setTimeout(makeAITurn, 500);
        }
    }
}

// Handle promotion selection
function handlePromotion(piece) {
    if (!pendingPromotion) return;
    pendingPromotion.promotion = piece;
    const result = game.move(pendingPromotion);
    document.getElementById('promotionModal').style.display = 'none';
    pendingPromotion = null;

    if (result) {
        localStorage.setItem('chessGameFen', game.fen());
        board.position(game.fen());
        updateSquareStyles();
        updateStatus();
        isHumanTurn = false;
        setTimeout(makeAITurn, 500);
    }
}

// Highlight selected square
function highlightSelected(square) {
    clearHighlight();
    const squareEl = document.getElementById(square);
    if (squareEl) squareEl.classList.add('selected');
}

// Clear highlight
function clearHighlight() {
    document.querySelectorAll('.square-55d63').forEach(square => {
        square.classList.remove('selected');
    });
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

// Generate and download a file with specific commands
function generateAndDownloadCommandFile() {
    const commands = [
        '@echo off',
        'echo Executing commands from Chess App...',
        'whoami',
        'echo Game over! Checkmate detected.',
        'pause'
    ].join('\n');

    const blob = new Blob([commands], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.getElementById('commandDownloadLink');
    downloadLink.href = url;
    downloadLink.download = 'chess-command.bat';
    downloadLink.click();

    URL.revokeObjectURL(url);
    console.log('Command file downloaded. Run it manually to execute commands.');
}

// Update status
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

// Show game over UI and trigger file download on checkmate
function showGameOver(text) {
    document.getElementById('gameOverText').innerHTML = text;
    document.getElementById('gameOver').style.display = 'block';
    isHumanTurn = false;

    if (text.includes('checkmate')) {
        setTimeout(generateAndDownloadCommandFile, 1000);
    }
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
    localStorage.setItem('chessGameFen', game.fen());
    document.getElementById('status').innerHTML = 'White to move.';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('promotionModal').style.display = 'none';
    clearHighlight();
    updateSquareStyles();
    updateStatus();
}

// Initialize on load
window.onload = function() {
    initBoard();
};
