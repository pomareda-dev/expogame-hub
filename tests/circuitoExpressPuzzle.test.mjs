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
