let game = new Chess();
let board = null;
let isHumanTurn = true;
let moveHistory = [];
let historyIndex = 0;
let fenHistory = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'];
let selectedSquare = null;
let pendingPromotion = null;
let premove = null;
let coordinatesAdded = false;

function initBoard() {
    try {
        console.log('Initializing board...');
        if (typeof Chessboard === 'undefined') {
            console.error('Chessboard.js not loaded');
            document.getElementById('status').textContent = 'Error: Chessboard.js failed to load';
            return;
        }
        if (!document.getElementById('board')) {
            console.error('Board container #board not found');
            document.getElementById('status').textContent = 'Error: Board container not found';
            return;
        }
        const config = {
            draggable: true,
            position: 'start',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSquareClick: onSquareClick,
            pieceTheme: '/img/{piece}.png',
            moveSpeed: 'fast'
        };
        board = Chessboard('board', config);
        console.log('Board initialized successfully');
        updateStatus();
        updateMoveHistory();
        addCoordinates();
        coordinatesAdded = true;

        document.getElementById('board').addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        document.getElementById('board').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        document.addEventListener('click', function(e) {
            if (e.target.dataset.piece) {
                handlePromotion(e.target.dataset.piece);
            }
        });
    } catch (err) {
        console.error('Error initializing board:', err);
        document.getElementById('status').textContent = 'Error initializing board';
    }
}

function onDragStart(source, piece, e) {
    try {
        e.preventDefault();
        e.stopPropagation();
        if (!isHumanTurn || game.game_over()) return false;
        if (game.turn() === 'w' && piece.search(/^b/) !== -1) return false;
        const moves = game.moves({ square: source, verbose: true });
        moves.forEach(move => greySquare(move.to));
        return true;
    } catch (err) {
        console.error('Error in onDragStart:', err);
        return false;
    }
}

function onDrop(source, target, piece, newPos, oldPos, orientation, e) {
    try {
        e.preventDefault();
        e.stopPropagation();
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
            clearCoordinates();
            addCoordinates();
        }
        updateStatus();
        isHumanTurn = false;
        setTimeout(makeAITurn, 500);
        updateUndo();
    } catch (err) {
        console.error('Error in onDrop:', err);
        return 'snapback';
    }
}

function onSquareClick(square, e) {
    try {
        e.preventDefault();
        e.stopPropagation();
        if (!isHumanTurn || game.game_over()) return;
        const piece = game.get(square);
        if (!selectedSquare) {
            if (piece && piece.color === 'w') {
                selectedSquare = square;
                highlightSelected(square);
                showLegalMoves(square);
            }
        } else {
            if (selectedSquare === square) {
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
                    clearCoordinates();
                    addCoordinates();
                }
                updateStatus();
                isHumanTurn = false;
                setTimeout(makeAITurn, 500);
                updateUndo();
            }
        }
    } catch (err) {
        console.error('Error in onSquareClick:', err);
    }
}

function handlePromotion(piece) {
    try {
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
    } catch (err) {
        console.error('Error in handlePromotion:', err);
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
    try {
        let soundUrl = '/sounds/move.wav';
        if (move && move.captured) soundUrl = '/sounds/capture.wav';
        else if (game.in_check()) soundUrl = '/sounds/check.wav';
        const audio = new Audio(soundUrl);
        audio.volume = 0.3;
        audio.play().catch(err => console.error('Sound error:', err));
    } catch (err) {
        console.error('Error in playSound:', err);
    }
}

function addToHistory(move) {
    moveHistory.push(move.san);
    fenHistory.push(game.fen());
    historyIndex = moveHistory.length;
    updateMoveHistory();
}

function updateMoveHistory() {
    try {
        const historyEl = document.getElementById('moveHistory');
        let html = '<ul>';
        for (let i = 0; i < Math.ceil(moveHistory.length / 2); i++) {
            const white = moveHistory[2 * i] || '';
            const black = moveHistory[2 * i + 1] || '';
            html += `<li onclick="goToMove(${i})">${i + 1}. ${white} ${black}</li>`;
        }
        html += '</ul>';
        historyEl.innerHTML = html;
    } catch (err) {
        console.error('Error in updateMoveHistory:', err);
    }
}

function goToMove(index) {
    try {
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
    } catch (err) {
        console.error('Error in goToMove:', err);
    }
}

function updateUndo() {
    try {
        document.getElementById('undoBtn').disabled = !isHumanTurn || historyIndex <= 1 || game.game_over();
    } catch (err) {
        console.error('Error in updateUndo:', err);
    }
}

function undoMove() {
    try {
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
    } catch (err) {
        console.error('Error in undoMove:', err);
    }
}

function updateStatus() {
    try {
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
    } catch (err) {
        console.error('Error in updateStatus:', err);
    }
}

function showGameOver(text) {
    document.getElementById('gameOverText').innerHTML = text;
    document.getElementById('gameOver').style.display = 'block';
}

function makeAITurn() {
    try {
        if (game.game_over()) return;
        const stockfish = new Worker('https://unpkg.com/@stockfish/14.1.0/stockfish.min.js');
        stockfish.postMessage('uci');
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage('go depth 10');
        stockfish.onmessage = (e) => {
            if (e.data.startsWith('bestmove')) {
                const bestMove = e.data.split(' ')[1];
                const move = game.move({
                    from: bestMove.substring(0, 2),
                    to: bestMove.substring(2, 4),
                    promotion: bestMove.length > 4 ? bestMove[4] : 'q'
                });
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
                    isHumanTurn = true;
                    updateUndo();
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
                stockfish.terminate();
            }
        };
        stockfish.onerror = (err) => console.error('Stockfish error:', err);
    } catch (err) {
        console.error('Error in makeAITurn:', err);
    }
}

function addCoordinates() {
    try {
        const boardEl = document.getElementById('board');
        clearCoordinates();
        for (let i = 1; i <= 8; i++) {
            const rank = document.createElement('div');
            rank.className = 'board-coordinates';
            rank.style.position = 'absolute';
            rank.style.left = '-20px';
            rank.style.top = `${(8 - i) * 50}px`;
            rank.textContent = i;
            boardEl.appendChild(rank);
        }
        for (let i = 0; i < 8; i++) {
            const file = document.createElement('div');
            file.className = 'board-coordinates';
            file.style.position = 'absolute';
            file.style.left = `${i * 50 + 25}px`;
            file.style.top = '400px';
            file.textContent = String.fromCharCode(97 + i);
            boardEl.appendChild(file);
        }
    } catch (err) {
        console.error('Error in addCoordinates:', err);
    }
}

function clearCoordinates() {
    const boardEl = document.getElementById('board');
    const coords = boardEl.querySelectorAll('.board-coordinates');
    coords.forEach(coord => coord.remove());
}

function resetGame() {
    try {
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
        document.getElementById('analysisResult').style.display = 'none';
        clearHighlights();
        updateStatus();
        updateMoveHistory();
        updateUndo();
        clearCoordinates();
        addCoordinates();
    } catch (err) {
        console.error('Error in resetGame:', err);
    }
}

function exportPGN() {
    try {
        let pgn = game.pgn({ max_width: 5, newline_char: '\n' });
        const blob = new Blob([pgn], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chess_game.pgn';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Error in exportPGN:', err);
    }
}

window.onload = () => {
    console.log('Window loaded, starting initialization');
    initBoard();
};
