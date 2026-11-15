export const NORTH = 0;
export const EAST = 1;
export const SOUTH = 2;
export const WEST = 3;

const DIRECTION_BITS = [1, 2, 4, 8] as const;
const OPPOSITE_DIRECTION = [SOUTH, WEST, NORTH, EAST] as const;
const MIN_BOARD_SIZE = 3;
const MAX_BOARD_SIZE = 6;

export type TileKind = "source" | "bulb" | "wire" | "spare" | "empty";

export interface CircuitTile {
  kind: TileKind;
  baseMask: number;
  rotation: number;
}

export interface CircuitPosition {
  row: number;
  column: number;
}

export interface CircuitSolutionStep extends CircuitPosition {
  rotation: number;
}

export interface CircuitPuzzle {
  size: number;
  grid: CircuitTile[][];
  source: CircuitPosition;
  bulb: CircuitPosition;
  solution: CircuitSolutionStep[];
}

const createTile = (
  kind: TileKind,
  baseMask = 0,
  rotation = 0,
): CircuitTile => ({ kind, baseMask, rotation });

const clampBoardSize = (size: number): number =>
  Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_SIZE, Math.floor(size)));

const getDirectionBetween = (
  from: CircuitPosition,
  to: CircuitPosition,
): number => {
  if (to.row < from.row) return NORTH;
  if (to.column > from.column) return EAST;
  if (to.row > from.row) return SOUTH;
  return WEST;
};

const createSolutionPath = (
  size: number,
  random: () => number,
): CircuitPosition[] => {
  const path: CircuitPosition[] = [{ row: 0, column: 0 }];
  let row = 0;
  let column = 0;
  let rightSteps = size - 1;
  let downSteps = size - 1;

  while (rightSteps > 0 || downSteps > 0) {
    const totalSteps = rightSteps + downSteps;
    const takeRight =
      rightSteps > 0 &&
      (downSteps === 0 || random() < rightSteps / totalSteps);

    if (takeRight) {
      column += 1;
      rightSteps -= 1;
    } else {
      row += 1;
      downSteps -= 1;
    }

    path.push({ row, column });
  }

  return path;
};

const getPathMask = (path: CircuitPosition[], index: number): number => {
  let mask = 0;
  const position = path[index];

  if (index > 0) {
    const previousDirection = getDirectionBetween(position, path[index - 1]);
    mask |= DIRECTION_BITS[previousDirection];
  }

  if (index < path.length - 1) {
    const nextDirection = getDirectionBetween(position, path[index + 1]);
    mask |= DIRECTION_BITS[nextDirection];
  }

  return mask;
};

const chooseScrambledRotation = (
  mask: number,
  random: () => number,
): number => {
  const rotations = [1, 2, 3].filter(
    (rotation) => rotateMask(mask, rotation) !== mask,
  );
  return rotations[Math.floor(random() * rotations.length)];
};

export const rotateMask = (mask: number, turns = 1): number => {
  const normalizedTurns = ((Math.trunc(turns) % 4) + 4) % 4;
  let rotatedMask = mask & 0b1111;

  for (let turn = 0; turn < normalizedTurns; turn += 1) {
    rotatedMask = ((rotatedMask << 1) & 0b1111) | ((rotatedMask & 0b1000) >> 3);
  }

  return rotatedMask;
};

export const getTileMask = (tile: CircuitTile): number =>
  rotateMask(tile.baseMask, tile.rotation);

export const createCircuitPuzzle = (
  requestedSize: number,
  random: () => number = Math.random,
): CircuitPuzzle => {
  const size = clampBoardSize(requestedSize);
  const path = createSolutionPath(size, random);
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => createTile("empty")),
  );
  const solution: CircuitSolutionStep[] = [];
  const pathKeys = new Set(path.map(({ row, column }) => `${row},${column}`));

  path.forEach((position, index) => {
    const baseMask = getPathMask(path, index);
    const isSource = index === 0;
    const isBulb = index === path.length - 1;
    const kind: TileKind = isSource ? "source" : isBulb ? "bulb" : "wire";
    const rotation = isSource || isBulb ? 0 : chooseScrambledRotation(baseMask, random);

    grid[position.row][position.column] = createTile(kind, baseMask, rotation);
    solution.push({ ...position, rotation: 0 });
  });

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (pathKeys.has(`${row},${column}`) || random() >= 0.24) continue;

      const spareDirection = Math.floor(random() * DIRECTION_BITS.length);
      const rotation = Math.floor(random() * DIRECTION_BITS.length);
      grid[row][column] = createTile(
        "spare",
        DIRECTION_BITS[spareDirection],
        rotation,
      );
    }
  }

  return {
    size,
    grid,
    source: { row: 0, column: 0 },
    bulb: { row: size - 1, column: size - 1 },
    solution,
  };
};

export const rotatePuzzleTile = (
  puzzle: CircuitPuzzle,
  row: number,
  column: number,
): CircuitPuzzle => {
  const tile = puzzle.grid[row]?.[column];
  if (!tile || (tile.kind !== "wire" && tile.kind !== "spare")) return puzzle;

  const nextGrid = puzzle.grid.slice();
  nextGrid[row] = puzzle.grid[row].slice();
  nextGrid[row][column] = { ...tile, rotation: (tile.rotation + 1) % 4 };

  return { ...puzzle, grid: nextGrid };
};

export const getPoweredTiles = (puzzle: CircuitPuzzle): Set<string> => {
  const poweredTiles = new Set<string>();
  const pending = [puzzle.source];

  while (pending.length > 0) {
    const current = pending.shift()!;
    const currentKey = `${current.row},${current.column}`;
    if (poweredTiles.has(currentKey)) continue;
    poweredTiles.add(currentKey);

    const currentTile = puzzle.grid[current.row]?.[current.column];
    if (!currentTile) continue;

    const currentMask = getTileMask(currentTile);
    for (let direction = NORTH; direction <= WEST; direction += 1) {
      if ((currentMask & DIRECTION_BITS[direction]) === 0) continue;

      const nextPosition = {
        row: current.row + (direction === NORTH ? -1 : direction === SOUTH ? 1 : 0),
        column:
          current.column +
          (direction === WEST ? -1 : direction === EAST ? 1 : 0),
      };
      const nextTile = puzzle.grid[nextPosition.row]?.[nextPosition.column];
      if (!nextTile) continue;

      const nextDirection = OPPOSITE_DIRECTION[direction];
      if (
        (getTileMask(nextTile) & DIRECTION_BITS[nextDirection]) !== 0 &&
        !poweredTiles.has(`${nextPosition.row},${nextPosition.column}`)
      ) {
        pending.push(nextPosition);
      }
    }
  }

  return poweredTiles;
};

export const isCircuitComplete = (puzzle: CircuitPuzzle): boolean =>
  getPoweredTiles(puzzle).has(`${puzzle.bulb.row},${puzzle.bulb.column}`);
