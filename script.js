let game = new Chess();
let board = null;
let isHumanTurn = true;
let moveHistory = [];
let historyIndex = 0;
let fenHistory = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'];
let selectedSquare = null;
let pendingPromotion = null;
let premove = null;
let coordinatesAdded = false; // Track if coordinates are added to avoid duplicates

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
    addCoordinates(); // Add coordinates once
    coordinatesAdded = true;

    // Event delegation for promotion images (dynamic modal)
    document.addEventListener('click', function(e) {
        if (e.target.dataset.piece) {
            handlePromotion(e.target.dataset.piece);
        }
    });
}

function onDragStart(source, piece, position, orientation) {
    if (!isHumanTurn || game.game_over()) return false;
    if (game.turn() === 'w' && piece.search(/^b/) !== -1) return false;
    const moves = game.moves({ square: source, verbose: true });
    moves.forEach(move => greySquare(move.to));
    return true;
}

function onDrop(source, target, piece, newPos, oldPos, orientation) {
    removeGreySquares();
    const sourcePiece = game.get(source);
    if (sourcePiece.type === 'p' && target[1] === '8' && !document.getElementById('autoQueen').checked) {
        pendingPromotion = { from: source, to: target };
        document.getElementById('promotionModal').style.display = 'flex';
        return 'snapback';
    }
    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    playSound(move);
    addToHistory(move);
    board.position(game.fen());
    if (coordinatesAdded) {
        clearCoordinates(); // Clear before re-adding to avoid duplicates
        addCoordinates();
    }
    updateStatus();
    isHumanTurn = false;
    setTimeout(makeAITurn, 500);
    updateUndo();
}

function onSquareClick(square, e) {
    e.preventDefault(); // Prevent page scroll on click
    e.stopPropagation();
    if (!isHumanTurn || game.game_over()) return;
    const piece = game.get(square);
    if (!selectedSquare) {
        // First click: Select piece if White's turn
        if (piece && piece.color === 'w') {
            selectedSquare = square;
            highlightSelected(square);
            showLegalMoves(square);
        }
    } else {
        // Second click: Attempt move
        if (selectedSquare === square) {
            // Deselect
            clearHighlights();
            selectedSquare = null;
            return;
        }
        const sourcePiece = game.get(selectedSquare);
        if (sourcePiece.type === 'p' && square[1] === '8' && !document.getElementById('autoQueen').checked) {
            pendingPromotion = { from: selectedSquare, to: square };
            document.getElementById('promotionModal').style.display = 'flex';
            clearHighlights();
            selectedSquare = null;
            return;
        }
        let move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
        clearHighlights();
        selectedSquare = null;
        if (move) {
            playSound(move);
            addToHistory(move);
            board.position(game.fen());
            if (coordinatesAdded) {
                clearCoordinates(); // Clear before re-adding
                addCoordinates();
            }
            updateStatus();
            isHumanTurn = false;
            setTimeout(makeAITurn, 500);
            updateUndo();
        }
    }
}

function handlePromotion(piece) {
    if (!pendingPromotion) return;
    let move = game.move({ ...pendingPromotion, promotion: piece });
    document.getElementById('promotionModal').style.display = 'none';
    pendingPromotion = null;
    if (move) {
        playSound(move);
        addToHistory(move);
        board.position(game.fen());
        if (coordinatesAdded) {
            clearCoordinates();
            addCoordinates();
        }
        updateStatus();
        isHumanTurn = false;
        setTimeout(makeAITurn, 500);
        updateUndo();
    }
}

function highlightSelected(square) {
    clearHighlights();
    const squareEl = document.getElementById(square);
    if (squareEl) squareEl.classList.add('selected');
}

function showLegalMoves(square) {
    const moves = game.moves({ square, verbose: true });
    moves.forEach(m => {
        const targetEl = document.getElementById(m.to);
        if (targetEl) targetEl.classList.add('highlight-legal');
    });
}

function clearHighlights() {
    document.querySelectorAll('.highlight-legal, .selected').forEach(el => {
        el.classList.remove('highlight-legal', 'selected');
    });
}

function greySquare(square) {
    const squareEl = document.getElementById(square);
    if (squareEl) squareEl.classList.add('highlight-legal');
}

function removeGreySquares() {
    document.querySelectorAll('.highlight-legal').forEach(el => el.classList.remove('highlight-legal'));
}

function playSound(move) {
    if (!document.getElementById('soundToggle').checked) return;
    let soundFile = 'sounds/move.mp3';
    if (move && move.captured) soundFile = 'sounds/capture.mp3';
    else if (game.in_check()) soundFile = 'sounds/check.mp3';
    const audio = new Audio(soundFile);
    audio.volume = 0.3;
    audio.play().catch(err => console.error('Sound error:', err));
}

function addToHistory(move) {
    moveHistory.push(move.san);
    fenHistory.push(game.fen());
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
    const targetIndex = (index + 1) * 2 - 1;
    if (targetIndex >= fenHistory.length - 1) return;
    game.load(fenHistory[targetIndex]);
    board.position(game.fen());
    if (coordinatesAdded) {
        clearCoordinates();
        addCoordinates();
    }
    isHumanTurn = true;
    updateStatus();
    updateUndo();
}

function updateUndo() {
    document.getElementById('undoBtn').disabled = !isHumanTurn || historyIndex <= 1 || game.game_over();
}

function undoMove() {
    if (historyIndex > 1) {
        game.undo();
        game.undo();
        historyIndex -= 2;
        moveHistory.splice(-2);
        fenHistory.splice(-2);
        board.position(game.fen());
        if (coordinatesAdded) {
            clearCoordinates();
            addCoordinates();
        }
        isHumanTurn = true;
        updateMoveHistory();
        updateStatus();
        updateUndo();
    }
}

function flipBoard() {
    if (board) board.flip();
}

function exportPgn() {
    alert(game.pgn());
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
}

function makeAITurn() {
    if (game.game_over()) return;
    const moves = game.moves();
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    game.move(randomMove);
    playSound({ captured: randomMove.captured });
    addToHistory(randomMove);
    board.position(game.fen());
    if (coordinatesAdded) {
        clearCoordinates();
        addCoordinates();
    }
    updateMoveHistory();
    updateStatus();
    isHumanTurn = true;
    updateUndo();
    // Handle premove if queued
    if (premove) {
        let move = game.move(premove);
        if (move) {
            playSound(move);
            addToHistory(move);
            board.position(game.fen());
            if (coordinatesAdded) {
                clearCoordinates();
                addCoordinates();
            }
            updateMoveHistory();
            updateStatus();
            isHumanTurn = false;
            premove = null;
            setTimeout(makeAITurn, 500);
        } else {
            premove = null;
        }
    }
}

function addCoordinates() {
    const boardEl = document.getElementById('board');
    // Clear existing coordinates
    clearCoordinates();
    // Add rank numbers (1-8 on left)
    for (let i = 1; i <= 8; i++) {
        const rank = document.createElement('div');
        rank.className = 'board-coordinates';
        rank.style.position = 'absolute';
        rank.style.left = '-20px';
        rank.style.top = `${(8 - i) * 50}px`;
        rank.textContent = i;
        boardEl.appendChild(rank);
    }
    // Add file letters (a-h on bottom)
    for (let i = 0; i < 8; i++) {
        const file = document.createElement('div');
        file.className = 'board-coordinates';
        file.style.position = 'absolute';
        file.style.left = `${i * 50 + 25}px`;
        file.style.top = '400px';
        file.textContent = String.fromCharCode(97 + i);
        boardEl.appendChild(file);
    }
}

function clearCoordinates() {
    const boardEl = document.getElementById('board');
    const coords = boardEl.querySelectorAll('.board-coordinates');
    coords.forEach(coord => coord.remove());
}

function resetGame() {
    game.reset();
    board.start();
    isHumanTurn = true;
    moveHistory = [];
    fenHistory = [game.fen()];
    historyIndex = 0;
    selectedSquare = null;
    pendingPromotion = null;
    premove = null;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('promotionModal').style.display = 'none';
    clearHighlights();
    updateStatus();
    updateMoveHistory();
    updateUndo();
    clearCoordinates();
    addCoordinates(); // Re-add after reset
}

window.onload = initBoard;
