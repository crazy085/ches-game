function startAnalysis() {
    const stockfish = new Worker('https://unpkg.com/@stockfish/14.1.0/stockfish.min.js');
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
