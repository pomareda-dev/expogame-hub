import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../games/connectFourEngine.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const engine = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const { createBoard, dropInColumn, legalMoves, checkWin, chooseMove } = engine;

const RED = 1;
const GREEN = 2;

/** Build a board from rows written top-down with ".", "R" and "G". */
const boardFrom = (rows) =>
  rows.map((row) =>
    [...row].map((cell) =>
      cell === "R" ? RED : cell === "G" ? GREEN : null,
    ),
  );

/** Drop a list of columns alternating Red, Green, Red, ... */
const playSequence = (cols) => {
  let board = createBoard(6, 7);
  cols.forEach((col, index) => {
    const placed = dropInColumn(board, col, index % 2 === 0 ? RED : GREEN);
    assert.ok(placed, `sequence column ${col} must be playable`);
    board = placed.board;
  });
  return board;
};

const seededRandom = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test("createBoard builds the requested empty grid", () => {
  const board = createBoard(6, 7);
  assert.equal(board.length, 6);
  assert.ok(board.every((row) => row.length === 7));
  assert.ok(board.every((row) => row.every((cell) => cell === null)));
});

test("dropInColumn places the piece in the lowest empty slot without mutating the input", () => {
  const board = createBoard(6, 7);
  const first = dropInColumn(board, 3, RED);
  assert.equal(first.row, 5);
  assert.equal(first.board[5][3], RED);
  assert.equal(board[5][3], null, "the source board stays untouched");

  const second = dropInColumn(first.board, 3, GREEN);
  assert.equal(second.row, 4);
  assert.equal(second.board[4][3], GREEN);
  assert.equal(second.board[5][3], RED);
  assert.equal(first.board[4][3], null, "the previous board stays untouched");
});

test("dropInColumn returns null for an out-of-range or full column", () => {
  const board = createBoard(6, 7);
  assert.equal(dropInColumn(board, -1, RED), null);
  assert.equal(dropInColumn(board, 7, RED), null);

  let full = board;
  for (let i = 0; i < 6; i++) {
    full = dropInColumn(full, 0, i % 2 === 0 ? RED : GREEN).board;
  }
  assert.equal(dropInColumn(full, 0, RED), null);
  assert.deepEqual(legalMoves(full), [1, 2, 3, 4, 5, 6]);
});

test("checkWin detects horizontal, vertical and both diagonal lines", () => {
  const horizontal = boardFrom([
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    "RRRR...",
  ]);
  assert.equal(checkWin(horizontal, 5, 0, RED), true);
  assert.equal(checkWin(horizontal, 5, 2, RED), true);
  assert.equal(checkWin(horizontal, 5, 3, GREEN), false);

  const vertical = boardFrom([
    ".......",
    ".......",
    "R......",
    "R......",
    "R......",
    "R......",
  ]);
  assert.equal(checkWin(vertical, 2, 0, RED), true);
  assert.equal(checkWin(vertical, 3, 0, RED), true);

  const diagonalDown = boardFrom([
    ".......",
    ".......",
    "R......",
    ".R.....",
    "..R....",
    "...R...",
  ]);
  assert.equal(checkWin(diagonalDown, 5, 3, RED), true);
  assert.equal(checkWin(diagonalDown, 2, 0, RED), true);

  const diagonalUp = boardFrom([
    ".......",
    ".......",
    "...R...",
    "..R....",
    ".R.....",
    "R......",
  ]);
  assert.equal(checkWin(diagonalUp, 2, 3, RED), true);
  assert.equal(checkWin(diagonalUp, 5, 0, RED), true);

  const threeOnly = boardFrom([
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    "RRR....",
  ]);
  assert.equal(checkWin(threeOnly, 5, 2, RED), false);
});

test("easy picks a legal column from the injected random source", () => {
  const board = playSequence([3, 3, 3, 3, 3, 3]);
  const moves = legalMoves(board);

  for (const sample of [0, 0.5, 0.999]) {
    const column = chooseMove(board, RED, "easy", () => sample);
    assert.ok(moves.includes(column), `${sample} must map to a legal column`);
  }
  assert.equal(chooseMove(board, RED, "easy", () => 0), moves[0]);
  assert.equal(
    chooseMove(board, RED, "easy", () => 0.999),
    moves[moves.length - 1],
  );
  assert.equal(chooseMove(board, RED, "easy", () => 1), moves[moves.length - 1]);
});

test("easy never returns a full column and reports none when the board is full", () => {
  const full = boardFrom([
    "RGRGRGR",
    "GRGRGRG",
    "RGRGRGR",
    "GRGRGRG",
    "RGRGRGR",
    "GRGRGRG",
  ]);
  assert.deepEqual(legalMoves(full), []);
  assert.equal(chooseMove(full, RED, "easy", () => 0), null);
  assert.equal(chooseMove(full, RED, "medium"), null);
  assert.equal(chooseMove(full, RED, "hard"), null);
});

test("medium takes an immediate winning move", () => {
  // Red has three on the bottom row (columns 0-2) while Green stacks a
  // vertical three in column 6: Red must take its own win instead of blocking.
  const board = playSequence([0, 6, 1, 6, 2, 6]);
  assert.equal(chooseMove(board, RED, "medium"), 3);

  const redBoard = boardFrom([
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    "RRR....",
  ]);
  assert.equal(chooseMove(redBoard, RED, "medium"), 3);
});

test("medium blocks the opponent's immediate win instead of playing elsewhere", () => {
  const board = boardFrom([
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    "RRR....",
  ]);
  assert.equal(
    chooseMove(board, GREEN, "medium"),
    3,
    "Green must block the open fourth slot",
  );

  // A vertical threat must be blocked at the column it grows in.
  const vertical = playSequence([1, 0, 1, 0, 2, 0]);
  assert.equal(chooseMove(vertical, RED, "medium"), 0);
});

test("medium still prefers the centre when nothing is forced", () => {
  const board = createBoard(6, 7);
  assert.equal(chooseMove(board, RED, "medium"), 3);
});

test("hard takes an immediate win and blocks an immediate threat", () => {
  const winning = boardFrom([
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    "RRR....",
  ]);
  assert.equal(chooseMove(winning, RED, "hard"), 3);

  const blocking = boardFrom([
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    "RRR....",
  ]);
  assert.equal(chooseMove(blocking, GREEN, "hard"), 3);

  const verticalThreat = playSequence([1, 0, 1, 0, 2, 0]);
  assert.equal(chooseMove(verticalThreat, RED, "hard"), 0);
});

test("hard never walks into a loss it can avoid", () => {
  // Green has three on the bottom row (columns 0-2); Red must block at 3,
  // and playing 3 wins the block, so any other move loses immediately.
  const board = boardFrom([
    ".......",
    ".......",
    ".......",
    ".......",
    ".......",
    "GGG....",
  ]);
  assert.equal(chooseMove(board, RED, "hard"), 3);
});

test("hard returns a legal column for every difficulty on a fresh board", () => {
  const board = createBoard(6, 7);
  for (const difficulty of ["easy", "medium", "hard"]) {
    const column = chooseMove(board, RED, difficulty, seededRandom(7));
    assert.ok(
      legalMoves(board).includes(column),
      `${difficulty} must return a legal column, received ${column}`,
    );
  }
});

test("chooseMove works with the configurable board sizes from settings", () => {
  const board = createBoard(8, 9);
  for (const difficulty of ["easy", "medium", "hard"]) {
    const column = chooseMove(board, RED, difficulty, seededRandom(11));
    assert.ok(legalMoves(board).includes(column));
    assert.ok(column < 9);
  }
});
