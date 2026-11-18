/**
 * Pure Connect Four rules and opponent for the "1 vs CPU" mode.
 *
 * The board is row-major (`board[row][column]`), row 0 is the top, so a piece
 * dropped into a column lands in the lowest empty row. Nothing here touches
 * React, the DOM or storage: that keeps the rules testable with plain Node.
 */

export type Cell = 1 | 2 | null;
export type Player = 1 | 2;
export type Board = Cell[][];

export type ConnectFourDifficulty = "easy" | "medium" | "hard";

export const CONNECT_FOUR_DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
] as const satisfies readonly ConnectFourDifficulty[];

/** Test seam: callers may inject a deterministic random source. */
export type RandomSource = () => number;

export interface DropResult {
  board: Board;
  row: number;
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal down-right
  [1, -1], // diagonal down-left
];

const WIN_SCORE = 1_000_000;
const BLOCK_SCORE = 100_000;
const GIFT_SCORE = 80_000;
const CENTER_WEIGHT = 4;
const THREE_WEIGHT = 60;
const TWO_WEIGHT = 8;

/** Build an empty rows x cols board. */
export const createBoard = (rows: number, cols: number): Board =>
  Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));

const columnsOf = (board: Board): number => board[0]?.length ?? 0;

/** Columns that still accept a piece, left to right. */
export const legalMoves = (board: Board): number[] => {
  const moves: number[] = [];
  for (let col = 0; col < columnsOf(board); col++) {
    if (board[0][col] === null) moves.push(col);
  }
  return moves;
};

export const isBoardFull = (board: Board): boolean =>
  legalMoves(board).length === 0;

/**
 * Drop one piece into a column. Returns the new board and the landing row, or
 * null when the column is out of range or full. The input board is untouched.
 */
export const dropInColumn = (
  board: Board,
  col: number,
  player: Player,
): DropResult | null => {
  if (!Number.isInteger(col) || col < 0 || col >= columnsOf(board)) return null;

  for (let row = board.length - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      const next = board.map((cells) => [...cells]);
      next[row][col] = player;
      return { board: next, row };
    }
  }
  return null;
};

/** True when the piece at (row, col) completes a line of four for `player`. */
export const checkWin = (
  board: Board,
  row: number,
  col: number,
  player: Player,
): boolean => {
  const rows = board.length;
  const cols = columnsOf(board);

  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;

    for (let step = 1; step < 4; step++) {
      const r = row + dr * step;
      const c = col + dc * step;
      if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== player) {
        break;
      }
      count++;
    }

    for (let step = 1; step < 4; step++) {
      const r = row - dr * step;
      const c = col - dc * step;
      if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== player) {
        break;
      }
      count++;
    }

    if (count >= 4) return true;
  }

  return false;
};

const otherPlayer = (player: Player): Player => (player === 1 ? 2 : 1);

/** Windows of four cells used by the evaluator, cached per board size. */
const windowsBySize = new Map<string, ReadonlyArray<ReadonlyArray<[number, number]>>>();

const windowsFor = (
  rows: number,
  cols: number,
): ReadonlyArray<ReadonlyArray<[number, number]>> => {
  const key = `${rows}x${cols}`;
  const cached = windowsBySize.get(key);
  if (cached) return cached;

  const windows: [number, number][][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (const [dr, dc] of DIRECTIONS) {
        const endRow = row + dr * 3;
        const endCol = col + dc * 3;
        if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
          continue;
        }
        windows.push([0, 1, 2, 3].map((step) => [row + dr * step, col + dc * step]));
      }
    }
  }

  windowsBySize.set(key, windows);
  return windows;
};

/**
 * Static evaluation from `me`'s point of view: every window of four with only
 * one colour counts, weighted by how close that window is to completion.
 */
const staticScore = (board: Board, me: Player): number => {
  const windows = windowsFor(board.length, columnsOf(board));
  let score = 0;

  for (const window of windows) {
    let mine = 0;
    let theirs = 0;
    for (const [row, col] of window) {
      const cell = board[row][col];
      if (cell === me) mine++;
      else if (cell !== null) theirs++;
    }

    if (mine > 0 && theirs > 0) continue;
    if (mine === 4) score += WIN_SCORE;
    else if (mine === 3) score += THREE_WEIGHT;
    else if (mine === 2) score += TWO_WEIGHT;
    else if (theirs === 3) score -= THREE_WEIGHT;
    else if (theirs === 2) score -= TWO_WEIGHT;
  }

  return score;
};

/** Columns where `player` wins immediately with one more piece. */
const immediateWins = (board: Board, player: Player): number[] =>
  legalMoves(board).filter((col) => {
    const placed = dropInColumn(board, col, player);
    return placed !== null && checkWin(placed.board, placed.row, col, player);
  });

/** Legal columns ordered centre first, which prunes far more of the tree. */
const centerFirstMoves = (board: Board): number[] => {
  const center = (columnsOf(board) - 1) / 2;
  return legalMoves(board).sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b,
  );
};

const searchDepthFor = (cols: number): number => {
  if (cols <= 7) return 6;
  if (cols <= 9) return 5;
  return 4;
};

/** Minimax with alpha-beta pruning. Positive scores favour `me`. */
const search = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  toMove: Player,
  me: Player,
  ply: number,
): number => {
  if (depth === 0) return staticScore(board, me);

  const moves = centerFirstMoves(board);
  if (moves.length === 0) return 0;

  const maximizing = toMove === me;
  let best = maximizing ? -Infinity : Infinity;

  for (const col of moves) {
    const placed = dropInColumn(board, col, toMove);
    if (!placed) continue;

    const value = checkWin(placed.board, placed.row, col, toMove)
      ? // Sooner wins score higher, so the opponent prefers to lose later.
        (maximizing ? 1 : -1) * (WIN_SCORE - ply)
      : search(placed.board, depth - 1, alpha, beta, otherPlayer(toMove), me, ply + 1);

    if (maximizing) {
      if (value > best) best = value;
      if (best > alpha) alpha = best;
    } else {
      if (value < best) best = value;
      if (best < beta) beta = best;
    }

    if (beta <= alpha) break;
  }

  return best;
};

const randomLegalMove = (board: Board, random: RandomSource): number | null => {
  const moves = legalMoves(board);
  if (moves.length === 0) return null;
  const raw = Math.floor(random() * moves.length);
  return moves[Math.min(moves.length - 1, Math.max(0, raw))];
};

/**
 * One-ply tactical move: win now, otherwise block an immediate loss, otherwise
 * prefer the centres and positions that build threats without gifting a win.
 */
const tacticalMove = (board: Board, player: Player): number | null => {
  const moves = centerFirstMoves(board);
  if (moves.length === 0) return null;

  const opponent = otherPlayer(player);
  const opponentWins = new Set(immediateWins(board, opponent));
  const cols = columnsOf(board);
  const center = (cols - 1) / 2;

  let bestMove: number | null = null;
  let bestScore = -Infinity;

  for (const col of moves) {
    const placed = dropInColumn(board, col, player);
    if (!placed) continue;

    if (checkWin(placed.board, placed.row, col, player)) return col;

    let score = staticScore(placed.board, player) - staticScore(placed.board, opponent);

    if (opponentWins.has(col)) score += BLOCK_SCORE;
    else if (opponentWins.size > 0) score -= BLOCK_SCORE;

    // Dropping under an opponent winning cell hands them the game right above.
    const above = placed.row - 1;
    if (above >= 0) {
      const reply = dropInColumn(placed.board, col, opponent);
      if (reply && checkWin(reply.board, reply.row, col, opponent)) {
        score -= GIFT_SCORE;
      }
    }

    score += (cols - Math.abs(col - center)) * CENTER_WEIGHT;

    if (score > bestScore) {
      bestScore = score;
      bestMove = col;
    }
  }

  return bestMove;
};

const searchedMove = (board: Board, player: Player): number | null => {
  const moves = centerFirstMoves(board);
  if (moves.length === 0) return null;

  const depth = searchDepthFor(columnsOf(board));
  let bestMove: number | null = null;
  let bestScore = -Infinity;

  for (const col of moves) {
    const placed = dropInColumn(board, col, player);
    if (!placed) continue;

    const score = checkWin(placed.board, placed.row, col, player)
      ? WIN_SCORE
      : search(placed.board, depth - 1, -Infinity, Infinity, otherPlayer(player), player, 1);

    if (score > bestScore) {
      bestScore = score;
      bestMove = col;
    }
  }

  return bestMove;
};

/**
 * Pick a column for the CPU. Returns null only when no column is playable, so
 * callers can treat it as "no move available" instead of guessing.
 *
 * - easy: a legal column at random.
 * - medium: one-ply tactics (win, block, centre, avoid gifting a win).
 * - hard: minimax with alpha-beta at a depth that fits the board width.
 */
export const chooseMove = (
  board: Board,
  player: Player,
  difficulty: ConnectFourDifficulty,
  random: RandomSource = Math.random,
): number | null => {
  if (legalMoves(board).length === 0) return null;

  switch (difficulty) {
    case "easy":
      return randomLegalMove(board, random);
    case "medium":
      return tacticalMove(board, player);
    case "hard":
      return searchedMove(board, player);
    default:
      return tacticalMove(board, player);
  }
};
