function startAnalysis() {
    // Use your local Stockfish JS worker
    const stockfish = new Worker('stockfish.js');
    stockfish.postMessage('uci');
    stockfish.postMessage(`position fen ${game.fen()}`);
    stockfish.postMessage('go depth 10');
    stockfish.onmessage = (e) => {
        if (e.data.startsWith('bestmove')) {
            const bestMove = e.data.split(' ')[1];
            document.getElementById('analysisResult').style.display = 'block';
            document.getElementById('analysisResult').textContent = `Best move: ${bestMove}`;
            stockfish.terminate();
        }
    };
}
