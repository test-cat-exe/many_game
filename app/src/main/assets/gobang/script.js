class GobangGame {
    constructor() {
        this.boardSize = 15;
        this.board = [];
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 30;
        this.offset = 20;

        // AI 相关
        this.gameMode = null;    // 'pvp' or 'ai'
        this.aiDifficulty = null; // 'easy', 'normal', 'hard'
        this.aiThinking = false;

        this.setupCanvas();
        this.bindEvents();
    }

    // ========== 游戏模式控制 ==========

    startGame(mode, difficulty) {
        this.gameMode = mode;
        this.aiDifficulty = difficulty || null;
        document.getElementById('modeSelect').classList.add('hidden');
        document.getElementById('gameArea').classList.remove('hidden');
        this.restart();
    }

    backToMenu() {
        this.gameOver = true;
        this.aiThinking = false;
        document.getElementById('modeSelect').classList.remove('hidden');
        document.getElementById('gameArea').classList.add('hidden');
    }

    // ========== 画布与绘制 ==========

    setupCanvas() {
        const gridWidth = (this.boardSize - 1) * this.cellSize;
        const width = gridWidth + 2 * this.offset;
        this.canvas.width = width;
        this.canvas.height = width;
    }

    drawBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.boardSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.offset, this.offset + i * this.cellSize);
            this.ctx.lineTo(this.offset + (this.boardSize - 1) * this.cellSize, this.offset + i * this.cellSize);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(this.offset + i * this.cellSize, this.offset);
            this.ctx.lineTo(this.offset + i * this.cellSize, this.offset + (this.boardSize - 1) * this.cellSize);
            this.ctx.stroke();
        }

        const starPoints = [3, 7, 11];
        this.ctx.fillStyle = '#000';
        for (let i of starPoints) {
            for (let j of starPoints) {
                this.ctx.beginPath();
                this.ctx.arc(this.offset + i * this.cellSize, this.offset + j * this.cellSize, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] !== 0) {
                    this.drawPiece(row, col, this.board[row][col]);
                }
            }
        }
    }

    drawPiece(row, col, player) {
        const x = this.offset + col * this.cellSize;
        const y = this.offset + row * this.cellSize;
        const radius = this.cellSize / 2 - 2;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);

        if (player === 1) {
            this.ctx.fillStyle = '#000';
            this.ctx.fill();
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        } else {
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
            this.ctx.strokeStyle = '#999';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    // ========== 事件处理 ==========

    bindEvents() {
        this.isTouching = false;

        this.canvas.addEventListener('touchstart', (e) => {
            this.isTouching = true;
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.handlePointer(touch.clientX, touch.clientY);
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.isTouching) {
                this.isTouching = false;
                return;
            }
            this.handlePointer(e.clientX, e.clientY);
        });

        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('backBtn').addEventListener('click', () => this.backToMenu());
    }

    handlePointer(clientX, clientY) {
        if (this.gameOver) return;
        if (this.aiThinking) return;
        if (this.gameMode === 'ai' && this.currentPlayer === 2) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        const col = Math.round((x - this.offset) / this.cellSize);
        const row = Math.round((y - this.offset) / this.cellSize);

        if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize) {
            if (this.board[row][col] === 0) {
                this.makeMove(row, col);
            }
        }
    }

    // ========== 核心游戏逻辑 ==========

    makeMove(row, col) {
        this.board[row][col] = this.currentPlayer;
        this.moveHistory.push({ row, col, player: this.currentPlayer });
        this.drawPiece(row, col, this.currentPlayer);

        if (this.checkWin(row, col)) {
            this.endGame(this.currentPlayer);
            return;
        }

        if (this.isBoardFull()) {
            this.endGame(0);
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateStatus();

        // AI 回合
        if (this.gameMode === 'ai' && this.currentPlayer === 2 && !this.gameOver) {
            this.aiThinking = true;
            this.updateStatus();
            setTimeout(() => {
                if (this.gameOver || this.currentPlayer !== 2) {
                    this.aiThinking = false;
                    return;
                }
                this.aiMove();
                this.aiThinking = false;
            }, 200);
        }
    }

    checkWin(row, col) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let [dx, dy] of directions) {
            let count = 1;
            for (let i = 1; i <= 4; i++) {
                const r = row + i * dx, c = col + i * dy;
                if (this.isValid(r, c) && this.board[r][c] === this.currentPlayer) count++;
                else break;
            }
            for (let i = 1; i <= 4; i++) {
                const r = row - i * dx, c = col - i * dy;
                if (this.isValid(r, c) && this.board[r][c] === this.currentPlayer) count++;
                else break;
            }
            if (count >= 5) return true;
        }
        return false;
    }

    isValid(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }

    isBoardFull() {
        for (let r = 0; r < this.boardSize; r++)
            for (let c = 0; c < this.boardSize; c++)
                if (this.board[r][c] === 0) return false;
        return true;
    }

    endGame(winner) {
        this.gameOver = true;
        let message;
        if (winner === 0) {
            message = '平局！';
        } else if (this.gameMode === 'ai') {
            message = winner === 1 ? '你赢了！' : 'AI 获胜！';
        } else {
            message = `${winner === 1 ? '黑棋' : '白棋'}获胜！`;
        }
        this.updateStatus(message);
        setTimeout(() => alert(message), 100);
    }

    updateStatus(message) {
        const el = document.getElementById('status');
        if (message) {
            el.textContent = message;
            return;
        }
        if (this.gameMode === 'ai') {
            if (this.currentPlayer === 2) {
                el.textContent = 'AI 思考中...';
            } else {
                el.textContent = '你的回合（黑棋）';
            }
        } else {
            el.textContent = `当前玩家：${this.currentPlayer === 1 ? '黑棋' : '白棋'}`;
        }
    }

    undo() {
        if (this.moveHistory.length === 0) return;
        if (this.aiThinking) return;

        let undoCount = 1;
        if (this.gameMode === 'ai') {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            // 最后一步是 AI 的，撤销两步（AI + 玩家）；最后一步是玩家的（如玩家刚获胜），只撤一步
            if (lastMove.player === 2 && this.moveHistory.length >= 2) {
                undoCount = 2;
            }
        }

        for (let i = 0; i < undoCount; i++) {
            const last = this.moveHistory.pop();
            this.board[last.row][last.col] = 0;
            this.currentPlayer = last.player;
        }
        this.gameOver = false;
        this.drawBoard();
        this.updateStatus();
    }

    restart() {
        this.board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        this.aiThinking = false;
        this.moveHistory = [];
        this.drawBoard();
        this.updateStatus();
    }

    // ========== AI 入口 ==========

    aiMove() {
        let move;
        switch (this.aiDifficulty) {
            case 'easy':  move = this.aiEasy(); break;
            case 'normal': move = this.aiNormal(); break;
            case 'hard':  move = this.aiHard(); break;
        }
        if (move) this.makeMove(move.row, move.col);
    }

    // ========== 简单 AI：随机落子（优先靠近已有棋子） ==========

    aiEasy() {
        const neighbors = [];
        const others = [];
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] !== 0) continue;
                if (this.hasNeighbor(r, c, 1)) neighbors.push({ row: r, col: c });
                else others.push({ row: r, col: c });
            }
        }
        const pool = neighbors.length > 0 ? neighbors : others;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ========== 普通 AI：评分法 ==========

    aiNormal() {
        let bestScore = -1;
        let bestMoves = [];
        const candidates = this.getCandidates(2);

        for (const { row, col } of candidates) {
            // 进攻分：AI 落子后的价值
            const atkScore = this.scorePosition(row, col, 2);
            // 防守分：阻止玩家在此落子的价值
            const defScore = this.scorePosition(row, col, 1);
            const score = Math.max(atkScore, defScore * 1.1);

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [{ row, col }];
            } else if (score === bestScore) {
                bestMoves.push({ row, col });
            }
        }
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // ========== 困难 AI：Minimax + Alpha-Beta ==========

    aiHard() {
        const candidates = this.getCandidates(2);
        if (candidates.length === 0) return { row: 7, col: 7 };

        // 先用评分排序，改善剪枝效率
        candidates.sort((a, b) => {
            const sa = Math.max(this.scorePosition(a.row, a.col, 2), this.scorePosition(a.row, a.col, 1));
            const sb = Math.max(this.scorePosition(b.row, b.col, 2), this.scorePosition(b.row, b.col, 1));
            return sb - sa;
        });

        // 如果有必杀棋，直接走
        for (const m of candidates) {
            const s = this.scorePosition(m.row, m.col, 2);
            if (s >= 100000) return m;
        }
        // 如果对手有必杀棋，必须堵
        for (const m of candidates) {
            const s = this.scorePosition(m.row, m.col, 1);
            if (s >= 100000) return m;
        }

        let bestScore = -Infinity;
        let bestMove = candidates[0];
        const depth = 4;

        for (const { row, col } of candidates.slice(0, 20)) {
            this.board[row][col] = 2;
            const score = this.minimax(depth - 1, false, -Infinity, Infinity, row, col);
            this.board[row][col] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
        }
        return bestMove;
    }

    minimax(depth, isMaximizing, alpha, beta, lastRow, lastCol) {
        // 检查上一步落子是否直接获胜
        // isMaximizing=true 表示当前轮到 AI(2) 走，所以上一步是人类(1)走的
        // isMaximizing=false 表示当前轮到人类(1) 走，所以上一步是 AI(2)走的
        const lastPlayer = isMaximizing ? 1 : 2;
        if (this.checkWinAt(lastRow, lastCol, lastPlayer)) {
            // AI 赢了返回正分，人类赢了返回负分，depth 越大越优先（越早赢越好）
            return isMaximizing ? -1000000 - depth : 1000000 + depth;
        }

        if (depth === 0) return this.evaluateBoard();

        const candidates = this.getCandidates(2).slice(0, 15);
        if (candidates.length === 0) return this.evaluateBoard();

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const { row, col } of candidates) {
                this.board[row][col] = 2;
                const ev = this.minimax(depth - 1, false, alpha, beta, row, col);
                this.board[row][col] = 0;
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const { row, col } of candidates) {
                this.board[row][col] = 1;
                const ev = this.minimax(depth - 1, true, alpha, beta, row, col);
                this.board[row][col] = 0;
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    checkWinAt(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let [dx, dy] of directions) {
            let count = 1;
            for (let i = 1; i <= 4; i++) {
                const r = row + i * dx, c = col + i * dy;
                if (this.isValid(r, c) && this.board[r][c] === player) count++;
                else break;
            }
            for (let i = 1; i <= 4; i++) {
                const r = row - i * dx, c = col - i * dy;
                if (this.isValid(r, c) && this.board[r][c] === player) count++;
                else break;
            }
            if (count >= 5) return true;
        }
        return false;
    }

    evaluateBoard() {
        let score = 0;
        // 对每个有棋子的位置，评估其贡献
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] === 2) {
                    score += this.evaluatePoint(r, c, 2);
                } else if (this.board[r][c] === 1) {
                    score -= this.evaluatePoint(r, c, 1);
                }
            }
        }
        return score;
    }

    evaluatePoint(row, col, player) {
        let total = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dx, dy] of directions) {
            total += this.evaluateDirection(row, col, dx, dy, player);
        }
        return total;
    }

    evaluateDirection(row, col, dx, dy, player) {
        let count = 1;
        let openEnds = 0;

        // 正方向
        let blocked = false;
        for (let i = 1; i <= 4; i++) {
            const r = row + i * dx, c = col + i * dy;
            if (!this.isValid(r, c)) { blocked = true; break; }
            if (this.board[r][c] === player) count++;
            else { if (this.board[r][c] === 0) openEnds++; blocked = true; break; }
        }
        if (!blocked) openEnds++;

        // 反方向
        blocked = false;
        for (let i = 1; i <= 4; i++) {
            const r = row - i * dx, c = col - i * dy;
            if (!this.isValid(r, c)) { blocked = true; break; }
            if (this.board[r][c] === player) count++;
            else { if (this.board[r][c] === 0) openEnds++; blocked = true; break; }
        }
        if (!blocked) openEnds++;

        return this.patternScore(count, openEnds);
    }

    // ========== 共用评估方法 ==========

    scorePosition(row, col, player) {
        // 假设 player 落子于 (row, col)，评估该位置价值
        let total = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dx, dy] of directions) {
            let count = 1;
            let openEnds = 0;

            // 正方向
            for (let i = 1; i <= 4; i++) {
                const r = row + i * dx, c = col + i * dy;
                if (!this.isValid(r, c)) break;
                if (this.board[r][c] === player) count++;
                else { if (this.board[r][c] === 0) openEnds++; break; }
            }
            // 反方向
            for (let i = 1; i <= 4; i++) {
                const r = row - i * dx, c = col - i * dy;
                if (!this.isValid(r, c)) break;
                if (this.board[r][c] === player) count++;
                else { if (this.board[r][c] === 0) openEnds++; break; }
            }
            total += this.patternScore(count, openEnds);
        }
        return total;
    }

    patternScore(count, openEnds) {
        if (count >= 5) return 100000;
        if (openEnds === 0) return 0;
        switch (count) {
            case 4: return openEnds === 2 ? 50000 : 5000;
            case 3: return openEnds === 2 ? 2000 : 500;
            case 2: return openEnds === 2 ? 100 : 30;
            case 1: return openEnds === 2 ? 10 : 3;
            default: return 0;
        }
    }

    getCandidates(range) {
        const set = new Set();
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] !== 0) {
                    for (let dr = -range; dr <= range; dr++) {
                        for (let dc = -range; dc <= range; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (this.isValid(nr, nc) && this.board[nr][nc] === 0) {
                                set.add(nr * this.boardSize + nc);
                            }
                        }
                    }
                }
            }
        }
        const result = [];
        for (const key of set) {
            result.push({ row: Math.floor(key / this.boardSize), col: key % this.boardSize });
        }
        // 如果棋盘为空，返回中心
        if (result.length === 0) result.push({ row: 7, col: 7 });
        return result;
    }

    hasNeighbor(row, col, range) {
        for (let dr = -range; dr <= range; dr++) {
            for (let dc = -range; dc <= range; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr, c = col + dc;
                if (this.isValid(r, c) && this.board[r][c] !== 0) return true;
            }
        }
        return false;
    }
}

// 全局变量，供 HTML onclick 调用
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new GobangGame();
});
