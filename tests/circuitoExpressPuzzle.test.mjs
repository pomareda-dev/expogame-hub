import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../games/circuitoExpressPuzzle.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const puzzleModule = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const seededRandom = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const solvePuzzle = (puzzle) => {
  let solved = puzzle;
  for (const solution of puzzle.solution) {
    while (
      solved.grid[solution.row][solution.column].rotation !== solution.rotation
    ) {
      solved = puzzleModule.rotatePuzzleTile(
        solved,
        solution.row,
        solution.column,
      );
    }
  }
  return solved;
};

test("rotating connector masks follows the four cardinal directions", () => {
  const { rotateMask } = puzzleModule;
  const north = 1;

  assert.equal(rotateMask(north, 1), 2);
  assert.equal(rotateMask(north, 2), 4);
  assert.equal(rotateMask(north, 3), 8);
  assert.equal(rotateMask(north, 4), north);
  assert.equal(rotateMask(north, -1), 8);
});

test("puzzle generation is repeatable for a seeded random source", () => {
  const { createCircuitPuzzle } = puzzleModule;

  assert.deepEqual(
    createCircuitPuzzle(5, seededRandom(17)),
    createCircuitPuzzle(5, seededRandom(17)),
  );
});

test("generated puzzles start unsolved and their recorded solution powers the lamp", () => {
  const { createCircuitPuzzle, isCircuitComplete, getPoweredTiles } =
    puzzleModule;
  const puzzle = createCircuitPuzzle(5, seededRandom(29));

  assert.equal(isCircuitComplete(puzzle), false);
  assert.equal(getPoweredTiles(puzzle).has("0,0"), true);
  assert.equal(isCircuitComplete(solvePuzzle(puzzle)), true);
});

test("the generated route is contiguous and stays within the board", () => {
  const puzzle = puzzleModule.createCircuitPuzzle(6, seededRandom(41));

  assert.deepEqual(puzzle.solution[0], { row: 0, column: 0, rotation: 0 });
  assert.deepEqual(puzzle.solution.at(-1), {
    row: 5,
    column: 5,
    rotation: 0,
  });

  for (let index = 0; index < puzzle.solution.length; index += 1) {
    const tile = puzzle.solution[index];
    assert.ok(tile.row >= 0 && tile.row < puzzle.size);
    assert.ok(tile.column >= 0 && tile.column < puzzle.size);

    if (index > 0) {
      const previous = puzzle.solution[index - 1];
      assert.equal(
        Math.abs(tile.row - previous.row) +
          Math.abs(tile.column - previous.column),
        1,
      );
    }
  }
});

test("rotating a tile returns a new puzzle without mutating the original", () => {
  const puzzle = puzzleModule.createCircuitPuzzle(4, seededRandom(53));
  const wire = puzzle.solution.find(
    ({ row, column }) => puzzle.grid[row][column].kind === "wire",
  );
  const originalGrid = structuredClone(puzzle.grid);
  const rotated = puzzleModule.rotatePuzzleTile(
    puzzle,
    wire.row,
    wire.column,
  );

  assert.notStrictEqual(rotated, puzzle);
  assert.deepEqual(puzzle.grid, originalGrid);
  assert.equal(
    rotated.grid[wire.row][wire.column].rotation,
    (puzzle.grid[wire.row][wire.column].rotation + 1) % 4,
  );
});

const countWireTiles = (puzzle) =>
  puzzle.grid.flat().filter((tile) => tile.kind === "wire").length;

test("Easy, Medium and Hard each own a growing board-size band", () => {
  const { CIRCUIT_DIFFICULTY_BANDS, getCircuitBoardSize } = puzzleModule;

  assert.deepEqual(CIRCUIT_DIFFICULTY_BANDS.easy, { minSize: 3, maxSize: 4 });
  assert.deepEqual(CIRCUIT_DIFFICULTY_BANDS.medium, { minSize: 4, maxSize: 5 });
  assert.deepEqual(CIRCUIT_DIFFICULTY_BANDS.hard, { minSize: 5, maxSize: 6 });

  // Level 1 starts the band; every second level grows the board by one step
  // and the band's own ceiling stops the growth.
  assert.equal(getCircuitBoardSize("easy", 1), 3);
  assert.equal(getCircuitBoardSize("easy", 2), 3);
  assert.equal(getCircuitBoardSize("easy", 3), 4);
  assert.equal(getCircuitBoardSize("easy", 99), 4);

  assert.equal(getCircuitBoardSize("medium", 1), 4);
  assert.equal(getCircuitBoardSize("medium", 3), 5);
  assert.equal(getCircuitBoardSize("medium", 99), 5);

  assert.equal(getCircuitBoardSize("hard", 1), 5);
  assert.equal(getCircuitBoardSize("hard", 3), 6);
  assert.equal(getCircuitBoardSize("hard", 99), 6);
});

test("an unknown or unusable difficulty falls back to the Medium band", () => {
  const { getCircuitBoardSize } = puzzleModule;

  assert.equal(getCircuitBoardSize("impossible", 1), 4);
  assert.equal(getCircuitBoardSize(undefined, 1), 4);
  assert.equal(getCircuitBoardSize("hard", 0), 5);
  assert.equal(getCircuitBoardSize("hard", Number.NaN), 5);
});

test("higher difficulties hand the player more wire tiles at the same level", () => {
  const { createCircuitPuzzle, getCircuitBoardSize, getCircuitWireCount } =
    puzzleModule;

  const wiresAt = (difficulty, level) =>
    countWireTiles(
      createCircuitPuzzle(
        getCircuitBoardSize(difficulty, level),
        seededRandom(67),
      ),
    );

  // Level 1 of each band: 3 wires, then 5, then 7.
  assert.equal(wiresAt("easy", 1), 3);
  assert.equal(wiresAt("medium", 1), 5);
  assert.equal(wiresAt("hard", 1), 7);
  assert.ok(wiresAt("easy", 1) < wiresAt("medium", 1));
  assert.ok(wiresAt("medium", 1) < wiresAt("hard", 1));

  // The top of each band keeps the same ordering: 5, 7 and 9 wires.
  assert.equal(wiresAt("easy", 99), 5);
  assert.equal(wiresAt("medium", 99), 7);
  assert.equal(wiresAt("hard", 99), 9);

  // The advertised count is the count the generator actually lays down.
  for (const difficulty of ["easy", "medium", "hard"]) {
    for (const level of [1, 2, 3, 4, 99]) {
      const size = getCircuitBoardSize(difficulty, level);
      assert.equal(
        getCircuitWireCount(size),
        wiresAt(difficulty, level),
        `${difficulty} level ${level} advertises the right wire count`,
      );
    }
  }
});
