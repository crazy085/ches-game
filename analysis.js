function startAnalysis() {
    const stockfish = new Worker('https://unpkg.com/@stockfish/14.1.0/stockfish.min.js');
    stockfish.postMessage('uci');
    stockfish.postMessage(`position fen ${game.fen()}`);
    stockfish.postMessage('go depth 10');
    let analysisOutput = '';
    stockfish.onmessage = (e) => {
        if (e.data.startsWith('info depth')) {
            const scoreMatch = e.data.match(/score (cp|mate) (-?\d+)/);
            const pvMatch = e.data.match(/pv (\S+)/);
            if (scoreMatch && pvMatch) {
                const scoreType = scoreMatch[1];
                const scoreValue = parseInt(scoreMatch[2]);
                const bestMove = pvMatch[1];
                let scoreText = scoreType === 'cp' ? `${scoreValue / 100}` : `Mate in ${scoreValue}`;
                analysisOutput = `Best move: ${bestMove.substring(0, 4)} (Score: ${scoreText})`;
            }
        } else if (e.data.startsWith('bestmove')) {
            document.getElementById('analysisResult').style.display = 'block';
            document.getElementById('analysisResult').textContent = analysisOutput || 'Analysis complete';
            stockfish.terminate();
        }
    };
}
