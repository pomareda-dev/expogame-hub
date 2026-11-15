import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Lightbulb, Play, RotateCw, Zap } from "lucide-react";
import { GameLayout } from "../components/GameLayout";
import {
  type CircuitPuzzle,
  type CircuitTile,
  EAST,
  NORTH,
  SOUTH,
  WEST,
  createCircuitPuzzle,
  getPoweredTiles,
  getTileMask,
  isCircuitComplete,
  rotatePuzzleTile,
} from "./circuitoExpressPuzzle";
import {
  getCircuitoExpressRoundSeconds,
  useGameSettings,
} from "../utils/gameSettings";

// Keep the energized board visible long enough to read the light turning on.
const IGNITION_DELAY_MS = 650;
const BEST_SCORE_KEY = "circuito_express_best";
const DIRECTIONS = [NORTH, EAST, SOUTH, WEST] as const;
const CONNECTOR_ENDS: Record<number, [number, number]> = {
  [NORTH]: [50, 3],
  [EAST]: [97, 50],
  [SOUTH]: [50, 97],
  [WEST]: [3, 50],
};

type RoundStatus = "READY" | "PLAYING" | "GAME_OVER";

const getBoardSize = (level: number): number =>
  Math.min(6, 4 + Math.floor((level - 1) / 2));

const readBestScore = (): number => {
  try {
    const storedScore = Number(window.localStorage.getItem(BEST_SCORE_KEY));
    return Number.isFinite(storedScore) && storedScore > 0 ? storedScore : 0;
  } catch {
    return 0;
  }
};

interface CircuitTileViewProps {
  tile: CircuitTile;
  row: number;
  column: number;
  powered: boolean;
  igniting: boolean;
  locked: boolean;
  onRotate: (row: number, column: number) => void;
}

const CircuitTileView: React.FC<CircuitTileViewProps> = ({
  tile,
  row,
  column,
  powered,
  igniting,
  locked,
  onRotate,
}) => {
  const mask = getTileMask(tile);
  const stroke = powered ? "#4ade80" : tile.kind === "spare" ? "#64748b" : "#38bdf8";
  const isRotatable = tile.kind === "wire" || tile.kind === "spare";
  const description =
    tile.kind === "source"
      ? "Power source"
      : tile.kind === "bulb"
        ? "Target light"
        : tile.kind === "spare"
          ? "Spare connector"
          : "Wire connector";
  const accessibilityLabel = `${description}, row ${row + 1}, column ${column + 1}${powered ? ", powered" : ""}${isRotatable ? ". Rotate clockwise" : ""}`;
  const surfaceClass = powered
    ? "border-emerald-300/70 bg-emerald-950/80 shadow-[0_0_18px_rgba(74,222,128,0.2)]"
    : tile.kind === "source" || tile.kind === "bulb"
      ? "border-sky-300/50 bg-slate-800"
      : tile.kind === "spare"
        ? "border-slate-700 bg-slate-800/60"
        : "border-sky-900/70 bg-slate-800/90";
  // The pulse is decorative motion: keep the lit state itself for reduced motion.
  const ignitionClass = igniting
    ? "ring-2 ring-emerald-300 shadow-[0_0_28px_rgba(74,222,128,0.55)] motion-safe:animate-pulse"
    : "";

  const content = (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
      >
        {DIRECTIONS.map((direction) => {
          if ((mask & (1 << direction)) === 0) return null;
          const [x2, y2] = CONNECTOR_ENDS[direction];
          return (
            <line
              key={direction}
              x1="50"
              y1="50"
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth="10"
              strokeLinecap="round"
            />
          );
        })}
        {tile.kind !== "empty" && (
          <circle cx="50" cy="50" r="8" fill={stroke} />
        )}
      </svg>
      {(tile.kind === "source" || tile.kind === "bulb") && (
        <span
          className={`absolute inset-0 z-10 m-auto flex h-1/2 w-1/2 items-center justify-center rounded-full shadow-md ${
            igniting
              ? "bg-emerald-300 text-slate-950 shadow-[0_0_26px_rgba(74,222,128,0.9)]"
              : "bg-slate-900 text-white"
          }`}
        >
          {tile.kind === "source" ? (
            <Zap aria-hidden="true" className="h-2/3 w-2/3 text-amber-300" />
          ) : (
            <Lightbulb
              aria-hidden="true"
              className={`h-2/3 w-2/3 ${
                igniting
                  ? "text-slate-950"
                  : powered
                    ? "text-emerald-300"
                    : "text-slate-300"
              }`}
            />
          )}
        </span>
      )}
      {isRotatable && (
        <span className="sr-only">Rotation {tile.rotation} of 4.</span>
      )}
    </>
  );

  if (tile.kind === "empty") {
    return (
      <div
        aria-hidden="true"
        className="aspect-square w-full rounded-xl border border-dashed border-white/5 bg-slate-900/40"
      />
    );
  }

  if (!isRotatable) {
    return (
      <div
        role="img"
        aria-label={accessibilityLabel}
        className={`relative aspect-square w-full overflow-hidden rounded-xl border transition-shadow ${surfaceClass} ${ignitionClass}`}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={accessibilityLabel}
      aria-disabled={locked || undefined}
      onClick={() => onRotate(row, column)}
      className={`relative aspect-square w-full touch-manipulation overflow-hidden rounded-xl border transition-colors duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${surfaceClass}`}
    >
      {content}
    </button>
  );
};

export const CircuitoExpress: React.FC = () => {
  const { settings } = useGameSettings();
  const roundSeconds = getCircuitoExpressRoundSeconds(settings);
  const [status, setStatus] = useState<RoundStatus>("READY");
  const [puzzle, setPuzzle] = useState<CircuitPuzzle | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(readBestScore);
  const [level, setLevel] = useState(1);
  const [moves, setMoves] = useState(0);
  const [completedCircuits, setCompletedCircuits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [ignitingBulb, setIgnitingBulb] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const deadline = useRef<number | null>(null);

  const poweredTiles = useMemo(
    () => (puzzle ? getPoweredTiles(puzzle) : new Set<string>()),
    [puzzle],
  );

  // Keep the idle clock in step with the configured round length.
  useEffect(() => {
    if (status !== "PLAYING") setTimeLeft(roundSeconds);
  }, [roundSeconds, status]);

  useEffect(() => {
    if (status !== "PLAYING" || deadline.current === null) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline.current! - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining === 0) {
        deadline.current = null;
        setStatus("GAME_OVER");
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "GAME_OVER" || score <= bestScore) return;

    setBestScore(score);
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // Keep the current session playable when browser storage is unavailable.
    }
  }, [bestScore, score, status]);

  // Hold the energized board briefly, then move on to the next circuit.
  useEffect(() => {
    if (!ignitingBulb) return;

    if (status !== "PLAYING") {
      setIgnitingBulb(false);
      return;
    }

    const timer = window.setTimeout(() => {
      // The round clock owns the run: never advance once time has run out.
      if (deadline.current === null || Date.now() >= deadline.current) {
        setIgnitingBulb(false);
        return;
      }

      const nextLevel = level + 1;
      setLevel(nextLevel);
      setMoves(0);
      setPuzzle(createCircuitPuzzle(getBoardSize(nextLevel)));
      setIgnitingBulb(false);
      setAnnouncement(`Light on. Level ${nextLevel} started.`);
    }, IGNITION_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [ignitingBulb, level, status]);

  const startRound = () => {
    setScore(0);
    setLevel(1);
    setMoves(0);
    setCompletedCircuits(0);
    setTimeLeft(roundSeconds);
    setIgnitingBulb(false);
    setPuzzle(createCircuitPuzzle(getBoardSize(1)));
    setAnnouncement(
      `Circuit started. Rotate the wire tiles to reach the light. You have ${roundSeconds} seconds.`,
    );
    deadline.current = Date.now() + roundSeconds * 1000;
    setStatus("PLAYING");
  };

  const rotateTile = (row: number, column: number) => {
    if (status !== "PLAYING" || !puzzle || ignitingBulb) return;

    const nextPuzzle = rotatePuzzleTile(puzzle, row, column);
    if (nextPuzzle === puzzle) return;

    setMoves((currentMoves) => currentMoves + 1);
    setPuzzle(nextPuzzle);

    if (isCircuitComplete(nextPuzzle)) {
      setScore((currentScore) => currentScore + 100);
      setCompletedCircuits((completed) => completed + 1);
      setIgnitingBulb(true);
      setAnnouncement("Circuit complete. 100 points. The light is on.");
    }
  };

  return (
    <GameLayout
      title="Circuit Express"
      highScore={bestScore}
      className="min-h-0 justify-start overflow-y-auto touch-pan-y"
    >
      {status === "PLAYING" && puzzle ? (
        <div className="flex min-h-full w-full max-w-4xl flex-col items-center gap-3 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
          <div className="w-full text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300 sm:text-sm">
              Connect the source to the light
            </p>
            <p className="mt-1 text-sm text-slate-300 sm:text-base">
              Tap or click each wire to rotate it clockwise.
            </p>
          </div>

          <div className="grid w-full max-w-xl grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                Level
              </span>
              <span className="font-mono text-lg font-bold text-white sm:text-xl">
                {level}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                Score
              </span>
              <span className="font-mono text-lg font-bold text-white sm:text-xl">
                {score}
              </span>
            </div>
            <div
              className={`rounded-xl border px-3 py-2 text-center ${timeLeft <= 10 ? "border-rose-400/50 bg-rose-950/60" : "border-white/10 bg-slate-800/80"}`}
            >
              <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                <Clock3 aria-hidden="true" className="h-3 w-3" /> Time
              </span>
              <span
                className={`font-mono text-lg font-bold sm:text-xl ${timeLeft <= 10 ? "text-rose-300" : "text-white"}`}
                aria-label={`${timeLeft} seconds remaining`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>

          <div
            className="w-full max-w-xl rounded-2xl border border-sky-400/20 bg-slate-950/50 p-2 shadow-2xl shadow-sky-950/30 sm:p-4"
            aria-label={`Circuit board, ${puzzle.size} by ${puzzle.size}`}
          >
            <div
              className="mx-auto grid gap-1.5 sm:gap-2"
              style={{
                width: "min(100%, 40rem, 68vh)",
                gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
              }}
            >
              {puzzle.grid.map((rowTiles, row) =>
                rowTiles.map((tile, column) => (
                  <CircuitTileView
                    key={`${row}-${column}`}
                    tile={tile}
                    row={row}
                    column={column}
                    powered={poweredTiles.has(`${row},${column}`)}
                    igniting={ignitingBulb && tile.kind === "bulb"}
                    locked={ignitingBulb}
                    onRotate={rotateTile}
                  />
                )),
              )}
            </div>
          </div>

          {ignitingBulb && (
            <p className="w-full max-w-xl rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-center text-sm font-bold text-emerald-200 sm:text-base">
              Light on! Next circuit coming up…
            </p>
          )}

          <div className="flex w-full max-w-xl items-center justify-between gap-3 text-xs text-slate-400 sm:text-sm">
            <span>Rotations: {moves}</span>
            <span className="inline-flex items-center gap-1">
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              Power flows along connected tiles
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
          <p className="text-center text-[10px] text-slate-500 sm:text-xs">
            Fictional arcade puzzle — not instructions for real electrical equipment.
          </p>
        </div>
      ) : (
        <div className="flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-5 px-5 py-8 text-center sm:gap-7">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-300/30 bg-sky-500/10 text-sky-300 shadow-lg shadow-sky-950/30 sm:h-28 sm:w-28">
            {status === "GAME_OVER" ? (
              <Lightbulb aria-hidden="true" className="h-10 w-10 sm:h-14 sm:w-14" />
            ) : (
              <Zap aria-hidden="true" className="h-10 w-10 sm:h-14 sm:w-14" />
            )}
          </div>
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300 sm:text-sm">
              NovaTech Automation · Arcade Challenge
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
              {status === "GAME_OVER" ? "Time's up" : "Power the path"}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300 sm:text-xl">
              {status === "GAME_OVER"
                ? `You completed ${completedCircuits} ${completedCircuits === 1 ? "circuit" : "circuits"} and scored ${score} points.`
                : "Rotate the wire tiles to connect the power source to the light. Complete as many circuits as you can in " +
                  `${roundSeconds} seconds.`}
            </p>
          </div>

          {status === "GAME_OVER" && (
            <div className="flex gap-4 rounded-2xl border border-white/10 bg-slate-800/70 px-6 py-4">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Score
                </span>
                <span className="font-mono text-2xl font-bold text-white">
                  {score}
                </span>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Best
                </span>
                <span className="font-mono text-2xl font-bold text-amber-300">
                  {bestScore}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={startRound}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-sky-500 px-8 py-4 text-lg font-extrabold text-slate-950 shadow-xl shadow-sky-950/40 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:scale-[0.98] sm:min-h-16 sm:px-10 sm:text-xl"
          >
            <Play aria-hidden="true" className="h-5 w-5 fill-current" />
            {status === "GAME_OVER" ? "Play again" : "Start game"}
          </button>
          <p className="max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
            Fictional arcade puzzle — no real electrical equipment or wiring instructions.
          </p>
        </div>
      )}
    </GameLayout>
  );
};
