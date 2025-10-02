let game = new Chess();
let board = null;
let isHumanTurn = true;
let moveHistory = [];
let historyIndex = 0;

function initBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSquareClick: onSquareClick,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        moveSpeed: 'fast'
    };
    board = Chessboard('board', config);
    updateStatus();
    updateMoveHistory();
    updateTheme();

    // Theme toggle
    document.getElementById('darkTheme').addEventListener('change', updateTheme);

    // Promotion listeners
    document.querySelectorAll('#promotionModal img').forEach(img => {
        img.addEventListener('click', () => handlePromotion(img.dataset.piece));
    });
}

function onDragStart(source, piece) {
    if (!isHumanTurn || game.game_over()) return false;
    if (game.turn() === 'w' && piece.search(/^b/) !== -1) return false;
    const moves = game.moves({ square: source, verbose: true });
    moves.forEach(move => greySquare(move.to));
    return true;
}

function onDrop(source, target) {
    removeGreySquares();
    const piece = game.get(source);
    if (piece.type === 'p' && target[1] === '8') {
        pendingPromotion = { from: source, to: target };
        document.getElementById('promotionModal').style.display = 'flex';
        return 'snapback';
    }
    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    addToHistory(move);
    board.position(game.fen());
    updateStatus();
    isHumanTurn = false;
    setTimeout(makeAITurn, 500);
    updateUndo();
}

function onSquareClick(square) {
    if (!isHumanTurn || game.game_over()) return;
    const piece = game.get(square);
    if (!selectedSquare) {
        if (piece?.color === 'w') {
            selectedSquare = square;
            highlightSelected(square);
            showLegalMoves(square);
        }
    } else if (selectedSquare === square) {
        clearHighlights();
        selectedSquare = null;
    } else {
        const sourcePiece = game.get(selectedSquare);
        if (sourcePiece.type === 'p' && square[1] === '8') {
            pendingPromotion = { from: selectedSquare, to: square };
            document.getElementById('promotionModal').style.display = 'flex';
            clearHighlights();
            return;
        }
        let move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
        clearHighlights();
        selectedSquare = null;
        if (move) {
            addToHistory(move);
            board.position(game.fen());
            updateStatus();
            isHumanTurn = false;
            setTimeout(makeAITurn, 500);
            updateUndo();
        }
    }
}

let pendingPromotion = null;
let selectedSquare = null;

function handlePromotion(piece) {
    if (!pendingPromotion) return;
    let move = game.move({ ...pendingPromotion, promotion: piece });
    document.getElementById('promotionModal').style.display = 'none';
    pendingPromotion = null;
    if (move) {
        addToHistory(move);
        board.position(game.fen());
        updateStatus();
        isHumanTurn = false;
        setTimeout(makeAITurn, 500);
        updateUndo();
    }
}

function highlightSelected(square) {
    clearHighlights();
    document.getElementById(square)?.classList.add('selected');
}

function showLegalMoves(square) {
    const moves = game.moves({ square, verbose: true });
    moves.forEach(m => document.getElementById(m.to)?.classList.add('highlight-legal'));
}

function clearHighlights() {
    document.querySelectorAll('.highlight-legal, .selected').forEach(el => el.classList.remove('highlight-legal', 'selected'));
}

function greySquare(square) {
    document.getElementById(square)?.classList.add('highlight-legal');
}

function removeGreySquares() {
    document.querySelectorAll('.highlight-legal').forEach(el => el.classList.remove('highlight-legal'));
}

function addToHistory(move) {
    moveHistory.push(move.san);
    historyIndex = moveHistory.length;
    updateMoveHistory();
}

function updateMoveHistory() {
    const historyEl = document.getElementById('moveHistory');
    let html = '<ul>';
    for (let i = 0; i < Math.ceil(moveHistory.length / 2); i++) {
        const white = moveHistory[2 * i] || '';
        const black = moveHistory[2 * i + 1] || '';
        html += `<li onclick="goToMove(${i})">${i + 1}. ${white} ${black}</li>`;
    }
    html += '</ul>';
    historyEl.innerHTML = html;
}

function goToMove(index) {
    // Navigate to move (simplified; full replay would load FEN states)
    console.log('Navigate to move', index);
}

function updateUndo() {
    document.getElementById('undoBtn').disabled = !isHumanTurn || historyIndex <= 1;
}

function undoMove() {
    if (historyIndex > 1) {
        game.undo();
        game.undo();
        historyIndex -= 2;
        moveHistory.splice(-2);
        board.position(game.fen());
        isHumanTurn = true;
        updateMoveHistory();
        updateStatus();
        updateUndo();
    }
}

function updateStatus() {
    let status = '';
    if (game.in_checkmate()) {
        status = `Game over! ${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`;
        showGameOver(status);
    } else if (game.in_draw()) {
        status = 'Game over! Draw.';
        showGameOver(status);
    } else if (game.in_stalemate()) {
        status = 'Game over! Stalemate.';
        showGameOver(status);
    } else {
        status = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
        if (game.in_check()) status += ' (check)';
    }
    document.getElementById('status').innerHTML = status;
}

function showGameOver(text) {
    document.getElementById('gameOverText').innerHTML = text;
    document.getElementById('gameOver').style.display = 'block';
    updateUndo(); // Disable undo on game over
}

function makeAITurn() {
    if (game.game_over()) return;
    const moves = game.moves();
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    game.move(randomMove);
    addToHistory(randomMove);
    board.position(game.fen());
    updateMoveHistory();
    updateStatus();
    isHumanTurn = true;
    updateUndo();
}

function resetGame() {
    game.reset();
    board.start();
    isHumanTurn = true;
    moveHistory = [];
    historyIndex = 0;
    selectedSquare = null;
    pendingPromotion = null;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('promotionModal').style.display = 'none';
    clearHighlights();
    updateStatus();
    updateMoveHistory();
    updateUndo();
}

function updateTheme() {
    document.body.classList.toggle('dark', document.getElementById('darkTheme').checked);
}

window.onload = initBoard;
