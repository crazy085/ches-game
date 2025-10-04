// script.js (ES module)
import { Chess } from './lib/chess.min.js'; // if you use a chess lib; otherwise adapt
// If you don't have such lib, your own move logic would go here

// --- Engine loader (Stockfish) ---
async function loadStockfish(url = './stockfish.js') {
  // Try to create a worker for stockfish
  try {
    const worker = new Worker(url);
    // Simple handshake
    worker.postMessage('uci');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Stockfish load timeout')), 5000);
      function onMessage(e) {
        if (typeof e.data === 'string' && e.data.toLowerCase().includes('uciok')) {
          clearTimeout(timer);
          worker.removeEventListener('message', onMessage);
          resolve(worker);
        }
      }
      worker.addEventListener('message', onMessage);
    });
  } catch (err) {
    console.warn('Worker not available, falling back to inline Stockfish', err);
    throw err;
  }
}

// --- Audio manager (Web Audio API) ---
class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
  }
  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
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
    if (!this.ctx || !this.buffers.has(name)) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.get(name);
    src.connect(this.ctx.destination);
    src.start();
  }
}

// --- UI manager (minimal) ---
class UI {
  constructor({ onUserMove, audioManager }) {
    this.boardEl = document.getElementById('board');
    this.onUserMove = onUserMove;
    this.audio = audioManager;
    this.init();
  }
  init() {
    // Create a simple grid or integrate with a chessboard library
    this.boardEl.textContent = ''; // clear
    this.boardEl.style.minHeight = '320px';
    // keyboard support example
    this.boardEl.addEventListener('keydown', (e) => {
      // shortcut: n = new game, u = undo
      if (e.key === 'n') document.getElementById('newGameBtn').click();
      if (e.key === 'u') document.getElementById('undoBtn').click();
    });
    document.getElementById('newGameBtn').addEventListener('click', () => {
      if (typeof this.onUserMove === 'function') this.onUserMove('new');
    });
  }
  playMoveSound() {
    this.audio.play('move');
  }
}

// --- App bootstrap ---
(async function initApp() {
  const audio = new AudioManager();
  // defer loading audio until user gesture:
  document.addEventListener('click', async function unlockOnce() {
    document.removeEventListener('click', unlockOnce);
    try {
      await audio.init();
      await audio.load('move', 'sounds/move.wav');
    } catch (e) { console.warn('Audio init failed', e); }
  });

  // load stockfish in background (not blocking UI)
  let engineWorker = null;
  loadStockfish('./stockfish.js').then(w => {
    engineWorker = w;
  }).catch(err => console.warn('Stockfish load failed:', err));

  const ui = new UI({
    onUserMove: (action) => {
      if (action === 'new') {
        // start a new game
        console.log('New game requested');
      }
    },
    audioManager: audio
  });

  // Example: when user makes a move call ui.playMoveSound()
  // ui.playMoveSound();

})();
