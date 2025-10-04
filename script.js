// script.js (ES Module)
import { Chess } from './lib/chess.min.js'; // This will work if chess.min.js is ESM

this.board = Chessboard('board', config);

class AudioManager {
    constructor() {
        this.ctx = null;
        this.buffers = new Map();
    }

    async init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    async load(name, url) {
        await this.init();
        if (this.buffers.has(name)) return;
        const res = await fetch(url);
        const ab = await res.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(ab);
        this.buffers.set(name, buf);
    }

    play(name) {
        if (!this.buffers.has(name)) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.buffers.get(name);
        src.connect(this.ctx.destination);
        src.start();
    }
}

class GameManager {
    constructor(audioManager) {
        this.game = new Chess();
        this.audio = audioManager;
        this.isHumanTurn = true;
        this.moveHistory = [];
        this.fenHistory = [this.game.fen()];
        this.historyIndex = 0;
        this.selectedSquare = null;
        this.pendingPromotion = null;
        this.premove = null;
        this.board = null;
        this.coordinatesAdded = false;
    }

    async initBoard() {
        const config = {
            draggable: true,
            position: 'start',
            onDragStart: this.onDragStart.bind(this),
            onDrop: this.onDrop.bind(this),
            onSquareClick: this.onSquareClick.bind(this),
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
            moveSpeed: 'fast'
        };
        this.board = Chessboard('board', config);
        this.updateStatus();
        this.updateMoveHistory();
        this.addCoordinates();
        this.coordinatesAdded = true;

        document.addEventListener('click', (e) => {
            if (e.target.dataset.piece) this.handlePromotion(e.target.dataset.piece);
        });
    }

    onDragStart(source, piece) {
        if (!this.isHumanTurn || this.game.game_over()) return false;
        if (this.game.turn() === 'w' && piece.startsWith('b')) return false;
        const moves = this.game.moves({ square: source, verbose: true });
        moves.forEach(m => this.highlightSquare(m.to));
        return true;
    }

    onDrop(source, target) {
        this.clearHighlights();
        const sourcePiece = this.game.get(source);

        if (sourcePiece.type === 'p' && target[1] === '8' && !document.getElementById('autoQueen').checked) {
            this.pendingPromotion = { from: source, to: target };
            document.getElementById('promotionModal').style.display = 'flex';
            return 'snapback';
        }

        const move = this.game.move({ from: source, to: target, promotion: 'q' });
        if (!move) return 'snapback';
        this.afterMove(move);
    }

    onSquareClick(square, e) {
        e.preventDefault(); e.stopPropagation();
        if (!this.isHumanTurn || this.game.game_over()) return;

        const piece = this.game.get(square);
        if (!this.selectedSquare) {
            if (piece && piece.color === 'w') {
                this.selectedSquare = square;
                this.highlightSelected(square);
                this.showLegalMoves(square);
            }
        } else {
            if (this.selectedSquare === square) {
                this.clearHighlights();
                this.selectedSquare = null;
                return;
            }

            if (this.game.get(this.selectedSquare).type === 'p' && square[1] === '8' && !document.getElementById('autoQueen').checked) {
                this.pendingPromotion = { from: this.selectedSquare, to: square };
                document.getElementById('promotionModal').style.display = 'flex';
                this.clearHighlights();
                this.selectedSquare = null;
                return;
            }

            const move = this.game.move({ from: this.selectedSquare, to: square, promotion: 'q' });
            this.clearHighlights();
            this.selectedSquare = null;
            if (move) this.afterMove(move);
        }
    }

    handlePromotion(piece) {
        if (!this.pendingPromotion) return;
        const move = this.game.move({ ...this.pendingPromotion, promotion: piece });
        document.getElementById('promotionModal').style.display = 'none';
        this.pendingPromotion = null;
        if (move) this.afterMove(move);
    }

    afterMove(move) {
        if (document.getElementById('soundToggle').checked) {
            const soundName = move.captured ? 'capture' : this.game.in_check() ? 'check' : 'move';
            this.audio.play(soundName);
        }

        this.addToHistory(move);
        this.board.position(this.game.fen());
        if (this.coordinatesAdded) { this.clearCoordinates(); this.addCoordinates(); }
        this.updateStatus();
        this.isHumanTurn = false;
        this.updateUndo();
        setTimeout(() => this.makeAITurn(), 500);
    }

    makeAITurn() {
        if (this.game.game_over()) return;
        const moves = this.game.moves();
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        this.game.move(randomMove);
        this.audio.play('move');
        this.addToHistory(randomMove);
        this.board.position(this.game.fen());
        if (this.coordinatesAdded) { this.clearCoordinates(); this.addCoordinates(); }
        this.updateMoveHistory();
        this.updateStatus();
        this.isHumanTurn = true;
        this.updateUndo();

        if (this.premove) {
            const move = this.game.move(this.premove);
            if (move) {
                this.afterMove(move);
                this.premove = null;
            } else this.premove = null;
        }
    }

    addToHistory(move) {
        this.moveHistory.push(move.san);
        this.fenHistory.push(this.game.fen());
        this.historyIndex = this.moveHistory.length;
        this.updateMoveHistory();
    }

    updateMoveHistory() {
        const historyEl = document.getElementById('moveHistory');
        let html = '<ul>';
        for (let i = 0; i < Math.ceil(this.moveHistory.length / 2); i++) {
            const white = this.moveHistory[2 * i] || '';
            const black = this.moveHistory[2 * i + 1] || '';
            html += `<li onclick="gameManager.goToMove(${i})">${i + 1}. ${white} ${black}</li>`;
        }
        html += '</ul>';
        historyEl.innerHTML = html;
    }

    goToMove(index) {
        const targetIndex = (index + 1) * 2 - 1;
        if (targetIndex >= this.fenHistory.length - 1) return;
        this.game.load(this.fenHistory[targetIndex]);
        this.board.position(this.game.fen());
        if (this.coordinatesAdded) { this.clearCoordinates(); this.addCoordinates(); }
        this.isHumanTurn = true;
        this.updateStatus();
        this.updateUndo();
    }

    undoMove() {
        if (this.historyIndex <= 1) return;
        this.game.undo(); this.game.undo();
        this.historyIndex -= 2;
        this.moveHistory.splice(-2); this.fenHistory.splice(-2);
        this.board.position(this.game.fen());
        if (this.coordinatesAdded) { this.clearCoordinates(); this.addCoordinates(); }
        this.isHumanTurn = true;
        this.updateMoveHistory();
        this.updateStatus();
        this.updateUndo();
    }

    flipBoard() { if (this.board) this.board.flip(); }
    exportPgn() { alert(this.game.pgn()); }

    updateStatus() {
        let status = '';
        if (this.game.in_checkmate()) status = `Game over! ${this.game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`;
        else if (this.game.in_draw()) status = 'Game over! Draw.';
        else if (this.game.in_stalemate()) status = 'Game over! Stalemate.';
        else {
            status = `${this.game.turn() === 'w' ? 'White' : 'Black'} to move`;
            if (this.game.in_check()) status += ' (check)';
        }
        document.getElementById('status').textContent = status;
        if (status.startsWith('Game over')) document.getElementById('gameOver').style.display = 'block';
    }

    highlightSelected(square) {
        this.clearHighlights();
        const el = document.getElementById(square);
        if (el) el.classList.add('selected');
    }

    showLegalMoves(square) {
        const moves = this.game.moves({ square, verbose: true });
        moves.forEach(m => {
            const el = document.getElementById(m.to);
            if (el) el.classList.add('highlight-legal');
        });
    }

    highlightSquare(square) { this.showLegalMoves(square); }
    clearHighlights() { document.querySelectorAll('.highlight-legal, .selected').forEach(el => el.classList.remove('highlight-legal', 'selected')); }

    addCoordinates() {
        const boardEl = document.getElementById('board');
        this.clearCoordinates();
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
    }

    clearCoordinates() { document.querySelectorAll('.board-coordinates').forEach(el => el.remove()); }

    resetGame() {
        this.game.reset();
        this.board.start();
        this.isHumanTurn = true;
        this.moveHistory = [];
        this.fenHistory = [this.game.fen()];
        this.historyIndex = 0;
        this.selectedSquare = null;
        this.pendingPromotion = null;
        this.premove = null;
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('promotionModal').style.display = 'none';
        this.clearHighlights();
        this.updateStatus();
        this.updateMoveHistory();
        this.updateUndo();
        this.clearCoordinates();
        this.addCoordinates();
    }

    updateUndo() {
        document.getElementById('undoBtn').disabled = !this.isHumanTurn || this.historyIndex <= 1 || this.game.game_over();
    }
}

export const audioManager = new AudioManager();
export const gameManager = new GameManager(audioManager);

window.onload = async () => {
    await audioManager.init();
    await audioManager.load('move', 'sounds/move.wav');
    await audioManager.load('capture', 'sounds/capture.wav');
    await audioManager.load('check', 'sounds/check.wav');
    await gameManager.initBoard();
};
