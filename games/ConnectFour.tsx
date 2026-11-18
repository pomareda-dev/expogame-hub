import React, { useState, useEffect, useRef } from "react";
import { Cpu, Gamepad2, Play } from "lucide-react";
import { GameIntro } from "../components/GameIntro";
import { GameLayout } from "../components/GameLayout";
import { ResultModal } from "../components/ResultModal";
import { GameStatus } from "../types";
import { useGameSettings } from "../utils/gameSettings";
import {
  CONNECT_FOUR_DIFFICULTIES,
  checkWin,
  chooseMove,
  createBoard,
  dropInColumn,
  legalMoves,
  type Board,
  type Cell,
  type ConnectFourDifficulty,
  type Player,
} from "./connectFourEngine";

/** Who plays the green pieces: a second person or the CPU. */
type GameMode = "local" | "cpu";

// 1: Red, 2: Green. Red always moves first, so the human opens both modes.
const HUMAN_PLAYER: Player = 1;
const CPU_PLAYER: Player = 2;
const CPU_THINK_MS = 420;

const DIFFICULTY_LABELS: Record<ConnectFourDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const ConnectFour: React.FC = () => {
  const { settings } = useGameSettings();
  const { rows: ROWS, cols: COLS, marginTop } = settings.connectFour;

  const [board, setBoard] = useState<Board>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [status, setStatus] = useState<GameStatus>("PLAYING");
  const [winner, setWinner] = useState<Cell>(null);
  const [mode, setMode] = useState<GameMode>("local");
  const [difficulty, setDifficulty] =
    useState<ConnectFourDifficulty>("medium");
  // Track the last move to apply the animation only to the new piece
  const [lastMove, setLastMove] = useState<{ r: number; c: number } | null>(
    null
  );

  const [isInputLocked, setIsInputLocked] = useState(false);
  // The route opens on an intro screen; the board appears once the match starts.
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    initGame();
  }, [ROWS, COLS]); // Re-init if settings change

  const initGame = () => {
    setBoard(createBoard(ROWS, COLS));
    setCurrentPlayer(1);
    setStatus("PLAYING");
    setWinner(null);
    setLastMove(null);
    setIsInputLocked(false);
  };

  // One move per render: a second tap that arrives before the state commits
  // would otherwise drop a second piece from the same board snapshot.
  const moveLock = useRef(false);
  useEffect(() => {
    moveLock.current = false;
  });

  const dropPiece = (colIndex: number, player: Player) => {
    if (status !== "PLAYING" || isInputLocked || winner !== null) return;
    if (mode === "cpu" && player !== currentPlayer) return;
    if (moveLock.current) return;
    moveLock.current = true;

    const placed = dropInColumn(board, colIndex, player);

    if (!placed) {
      // Column full or out of range: nothing changed, so release the lock.
      moveLock.current = false;
      return;
    }

    setBoard(placed.board);
    setLastMove({ r: placed.row, c: colIndex });

    if (checkWin(placed.board, placed.row, colIndex, player)) {
      setIsInputLocked(true);
      setWinner(player);
      setTimeout(() => {
        setStatus("VICTORY");
        setIsInputLocked(false);
      }, 750);
      return;
    }

    if (legalMoves(placed.board).length === 0) {
      setIsInputLocked(true);
      setTimeout(() => {
        setStatus("GAME_OVER"); // Draw
        setIsInputLocked(false);
      }, 750);
      return;
    }

    setCurrentPlayer(player === 1 ? 2 : 1);
  };

  // The CPU reads the latest dropPiece without re-arming the timer on every
  // render, so only board turns and settings restart the thinking delay.
  const dropPieceRef = useRef(dropPiece);
  dropPieceRef.current = dropPiece;

  useEffect(() => {
    if (!hasStarted || mode !== "cpu" || status !== "PLAYING") return;
    if (winner !== null || isInputLocked || currentPlayer !== CPU_PLAYER) return;

    const timer = setTimeout(() => {
      const column = chooseMove(board, CPU_PLAYER, difficulty);
      if (column !== null) dropPieceRef.current(column, CPU_PLAYER);
    }, CPU_THINK_MS);

    return () => clearTimeout(timer);
  }, [
    board,
    currentPlayer,
    difficulty,
    hasStarted,
    isInputLocked,
    mode,
    status,
    winner,
  ]);

  const startMatch = (nextMode: GameMode) => {
    initGame();
    setMode(nextMode);
    setHasStarted(true);
  };

  if (!hasStarted) {
    return (
      <GameLayout title="Connect Four">
        <GameIntro
          accent="rose"
          icon={Gamepad2}
          eyebrow="NovaTech OS · Strategy"
          headline="Four in a row"
          description="Drop a piece into any column and line up four of your color — across, down or diagonally — before your opponent does. Red moves first. Play head to head, or take on the CPU."
          footer="Difficulty applies to the CPU opponent."
          action={
            <div className="flex flex-col items-center gap-4">
              <div
                role="group"
                aria-label="CPU difficulty"
                className="flex flex-wrap items-center justify-center gap-2"
              >
                {CONNECT_FOUR_DIFFICULTIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={difficulty === level}
                    onClick={() => setDifficulty(level)}
                    className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${
                      difficulty === level
                        ? "border-rose-400 bg-rose-500 text-slate-950"
                        : "border-white/15 text-slate-300 hover:border-rose-300/60 hover:text-white"
                    }`}
                  >
                    {DIFFICULTY_LABELS[level]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startMatch("local")}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-rose-500 px-8 py-4 text-lg font-extrabold text-slate-950 shadow-xl shadow-rose-950/40 transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:scale-[0.98] sm:min-h-16 sm:px-10 sm:text-xl"
                >
                  <Play aria-hidden="true" className="h-5 w-5 fill-current" />
                  Start game
                </button>
                <button
                  type="button"
                  onClick={() => startMatch("cpu")}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border-2 border-rose-300/40 bg-slate-900/60 px-8 py-4 text-lg font-extrabold text-rose-100 transition hover:border-rose-300/70 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:scale-[0.98] sm:min-h-16 sm:px-10 sm:text-xl"
                >
                  <Cpu aria-hidden="true" className="h-5 w-5" />
                  Play vs CPU
                </button>
              </div>
            </div>
          }
        />
      </GameLayout>
    );
  }

  const isHumanTurn = mode === "local" || currentPlayer === HUMAN_PLAYER;

  const handleColumnClick = (colIndex: number) => {
    if (!isHumanTurn) return;
    dropPiece(colIndex, currentPlayer);
  };

  const turnLabel =
    currentPlayer === 1
      ? "Red Player"
      : mode === "cpu"
        ? "CPU"
        : "Green Player";
  const winnerLabel =
    winner === 1 ? "Red" : mode === "cpu" ? "CPU" : "Green";
  const hint =
    mode === "cpu" && currentPlayer === CPU_PLAYER && status === "PLAYING"
      ? "The CPU is choosing a column…"
      : "Tap a column to drop your piece";

  return (
    <GameLayout title="Connect Four" className="-mt-24 lg:-mt-60 xl:mt-0">
      <div
        className="flex flex-col items-center gap-6 transition-all duration-300"
        style={{ marginTop: `${marginTop}px` }}
      >
        <div className="bg-slate-800/50 px-6 py-2 rounded-full border border-white/10">
          <span className="text-slate-300 mr-2">Current Turn:</span>
          <span
            className={`font-bold ${
              currentPlayer === 1 ? "text-rose-500" : "text-lime-400"
            }`}
          >
            {turnLabel}
          </span>
        </div>

        <div className="bg-blue-800 p-2 lg:p-6 rounded-xl">
          <div className="p-4 sm:p-6 lg:p-10 xl:p-8 bg-zinc-50 rounded-xl shadow-2xl shadow-blue-900/50 border-4 border-blue-700 relative">
            <div
              className="grid gap-4 sm:gap-6 md:gap-9 lg:gap-16 xl:gap-10 relative z-10"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              }}
            >
              {/* Clickable columns logic */}
              {Array.from({ length: COLS }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  role="button"
                  tabIndex={0}
                  aria-label={`Column ${colIndex + 1}`}
                  aria-disabled={!isHumanTurn}
                  className="flex flex-col gap-4 sm:gap-6 md:gap-9 lg:gap-16 xl:gap-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  onClick={() => handleColumnClick(colIndex)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    handleColumnClick(colIndex);
                  }}
                >
                  {board.map((row, rowIndex) => {
                    const isLastMove =
                      lastMove?.r === rowIndex && lastMove?.c === colIndex;
                    // Calculate drop height: (Index + 1) * 100% relative height + a bit extra
                    const dropHeight = `-${(rowIndex + 1) * 100 + 20}%`;

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-8 xl:h-8 rounded-full border-[2px] border-blue-700 bg-slate-900 flex items-center justify-center cursor-pointer hover:ring-4 ring-white/10 transition-all relative overflow-visible"
                      >
                        {/* The Piece */}
                        {row[colIndex] && (
                          <div
                            className={`w-full h-full rounded-full ${
                              row[colIndex] === 1
                                ? "bg-rose-500 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.3)]"
                                : "bg-lime-400 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.3)]"
                            } ${isLastMove ? "animate-drop" : ""}`}
                            style={
                              isLastMove
                                ? ({
                                    "--drop-height": dropHeight,
                                  } as React.CSSProperties)
                                : {}
                            }
                          ></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center py-3 lg:pt-5">
            <div className="flex items-center gap-2">
              <img
                src={import.meta.env.BASE_URL + "assets/orion-white.png"}
                className="w-12 h-12"
                alt="Orion"
              />
              <span className="text-3xl lg:text-4xl text-white">OrionLX+</span>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-sm">{hint}</p>
      </div>

      <ResultModal
        isOpen={status !== "PLAYING"}
        title={
          status === "VICTORY" ? `${winnerLabel} Wins!` : "It's a Draw!"
        }
        message={
          status === "VICTORY"
            ? "Congratulations on connecting four!"
            : "The board is full."
        }
        isVictory={status === "VICTORY"}
        onRetry={initGame}
      />
    </GameLayout>
  );
};
