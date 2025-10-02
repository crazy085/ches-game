const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = [];

wss.on('connection', (ws) => {
    if (players.length < 2) {
        const color = players.length === 0 ? 'w' : 'b';
        players.push({ ws, color });
        ws.send(JSON.stringify({ type: 'assignColor', color }));
    } else {
        ws.close();
        return;
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'move') {
            players.forEach(player => {
                if (player.ws !== ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify(data));
                }
            });
        }
    });

    ws.on('close', () => {
        players = players.filter(player => player.ws !== ws);
    });
});

console.log('WebSocket server running on ws://localhost:8080');
