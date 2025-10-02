let game = new Chess();
let board = null;
let isHumanTurn = true;

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
            pieceTheme: './img/{piece}.png'
        };
        board = Chessboard('board', config);
        console.log('Board initialized successfully');
        updateStatus();
    } catch (err) {
        console.error('Error initializing board:', err);
        document.getElementById('status').textContent = 'Error initializing board';
    }
}

function onDragStart(source, piece) {
    try {
        if (!isHumanTurn || game.game_over()) return false;
        if (game.turn() === 'w' && piece.search(/^b/) !== -1) return false;
        return true;
    } catch (err) {
        console.error('Error in onDragStart:', err);
        return false;
    }
}

function onDrop(source, target) {
    try {
        let move = game.move({ from: source, to: target, promotion: 'q' });
        if (move === null) return 'snapback';
        playSound(move);
        board.position(game.fen());
        updateStatus();
        isHumanTurn = false;
        setTimeout(makeAITurn, 500);
    } catch (err) {
        console.error('Error in onDrop:', err);
        return 'snapback';
    }
}

function playSound(move) {
    if (!document.getElementById('soundToggle').checked) return;
    try {
        let soundUrl = './sounds/move.wav';
        if (move.captured) soundUrl = './sounds/capture.wav';
        else if (game.in_check()) soundUrl = './sounds/check.wav';
        const audio = new Audio(soundUrl);
        audio.volume = 0.3;
        audio.play().catch(err => console.error('Sound error:', err));
    } catch (err) {
        console.error('Error in playSound:', err);
    }
}

function updateStatus() {
    try {
        let status = '';
        if (game.in_checkmate()) {
            status = `Game over! ${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`;
        } else if (game.in_draw()) {
            status = 'Game over! Draw.';
        } else if (game.in_stalemate()) {
            status = 'Game over! Stalemate.';
        } else {
            status = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
            if (game.in_check()) status += ' (check)';
        }
        document.getElementById('status').innerHTML = status;
    } catch (err) {
        console.error('Error in updateStatus:', err);
    }
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
                    to: BestMove.substring(2, 4),
                    promotion: bestMove.length > 4 ? bestMove[4] : 'q'
                });
                if (move) {
                    playSound(move);
                    board.position(game.fen());
                    updateStatus();
                    isHumanTurn = true;
                }
                stockfish.terminate();
            }
        };
        stockfish.onerror = (err) => console.error('Stockfish error:', err);
    } catch (err) {
        console.error('Error in makeAITurn:', err);
    }
}

function resetGame() {
    try {
        game.reset();
        board.start();
        isHumanTurn = true;
        updateStatus();
    } catch (err) {
        console.error('Error in resetGame:', err);
    }
}

window.onload = () => {
    console.log('Window loaded, starting initialization');
    initBoard();
};
