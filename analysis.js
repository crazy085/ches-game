// analysis.js (ES Module)
import { gameManager } from './script.js';

let stockfishWorker = null;

// Initialize or reuse Stockfish worker
function initStockfish() {
    if (!stockfishWorker) {
        stockfishWorker = new Worker('stockfish.js');
        stockfishWorker.postMessage('uci');
    }
    return stockfishWorker;
}

/**
 * Start analysis for the current game position.
 * @param {number} depth - optional search depth (default: 10)
 */
export function startAnalysis(depth = 10) {
    const worker = initStockfish();
    const fen = gameManager.game.fen();

    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);

    worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.startsWith('bestmove')) {
            const bestMove = msg.split(' ')[1];
            const resultEl = document.getElementById('analysisResult');
            if (resultEl) {
                resultEl.style.display = 'block';
                resultEl.textContent = `Best move: ${bestMove}`;
            }
            // Do NOT terminate worker: reuse for future analysis
        }
    };
}

/**
 * Optional: terminate worker if no longer needed
 */
export function stopAnalysis() {
    if (stockfishWorker) {
        stockfishWorker.terminate();
        stockfishWorker = null;
    }
}

// Auto-bind analysis button (if exists)
window.addEventListener('load', () => {
    const btn = document.getElementById('analyzeBtn');
    if (btn) btn.addEventListener('click', () => startAnalysis());
});
