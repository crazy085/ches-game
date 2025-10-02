function startAnalysis() {
    // Use local copy of Stockfish (add stockfish.min.js to your repo!)
    const stockfish = new Worker('stockfish.min.js');
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
