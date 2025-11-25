import React, { useState, useEffect } from "react";
import { GameLayout } from "../components/GameLayout";
import { ResultModal } from "../components/ResultModal";
import { GameStatus } from "../types";

const ROWS = 6;
const COLS = 7;
type Player = 1 | 2 | null; // 1: Red, 2: Green

export const ConnectFour: React.FC = () => {
  const [board, setBoard] = useState<Player[][]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [status, setStatus] = useState<GameStatus>("PLAYING");
  const [winner, setWinner] = useState<Player>(null);
  // Track the last move to apply the animation only to the new piece
  const [lastMove, setLastMove] = useState<{ r: number; c: number } | null>(
    null
  );

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const newBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    setBoard(newBoard);
    setCurrentPlayer(1);
    setStatus("PLAYING");
    setWinner(null);
    setLastMove(null);
  };

  const checkWin = (
    boardState: Player[][],
    row: number,
    col: number,
    player: Player
  ) => {
    // Directions: [deltaRow, deltaCol]
    const directions = [
      [0, 1], // Horizontal
      [1, 0], // Vertical
      [1, 1], // Diagonal Down-Right
      [1, -1], // Diagonal Down-Left
    ];

    for (const [dr, dc] of directions) {
      let count = 1;

      // Check positive direction
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (
          r >= 0 &&
          r < ROWS &&
          c >= 0 &&
          c < COLS &&
          boardState[r][c] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      // Check negative direction
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (
          r >= 0 &&
          r < ROWS &&
          c >= 0 &&
          c < COLS &&
          boardState[r][c] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 4) return true;
    }
    return false;
  };

  const dropPiece = (colIndex: number) => {
    if (status !== "PLAYING") return;

    const newBoard = [...board.map((row) => [...row])];
    let placedRow = -1;

    // Find lowest empty spot
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!newBoard[r][colIndex]) {
        newBoard[r][colIndex] = currentPlayer;
        placedRow = r;
        break;
      }
    }

    if (placedRow === -1) return; // Column full

    setBoard(newBoard);
    setLastMove({ r: placedRow, c: colIndex });

    if (checkWin(newBoard, placedRow, colIndex, currentPlayer)) {
      setStatus("VICTORY");
      setWinner(currentPlayer);
    } else if (newBoard.every((row) => row.every((cell) => cell !== null))) {
      setStatus("GAME_OVER"); // Draw
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  return (
    <GameLayout title="Connect Four">
      <div className="flex flex-col items-center gap-6">
        <div className="bg-slate-800/50 px-6 py-2 rounded-full border border-white/10">
          <span className="text-slate-300 mr-2">Current Turn:</span>
          <span
            className={`font-bold ${
              currentPlayer === 1 ? "text-rose-500" : "text-lime-400"
            }`}
          >
            {currentPlayer === 1 ? "Red Player" : "Green Player"}
          </span>
        </div>

        <div className="bg-blue-800 p-2 rounded-xl">
          <div className="p-4 sm:p-6 bg-zinc-50 rounded-xl shadow-2xl shadow-blue-900/50 border-4 border-blue-700 relative">
            <div className="grid grid-cols-7 gap-4 sm:gap-6 md:gap-9 relative z-10">
              {/* Clickable columns logic */}
              {Array.from({ length: COLS }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="flex flex-col gap-4 sm:gap-6 md:gap-9"
                  onClick={() => dropPiece(colIndex)}
                >
                  {board.map((row, rowIndex) => {
                    const isLastMove =
                      lastMove?.r === rowIndex && lastMove?.c === colIndex;
                    // Calculate drop height: (Index + 1) * 100% relative height + a bit extra
                    const dropHeight = `-${(rowIndex + 1) * 100 + 20}%`;

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-[2px] border-blue-700 bg-slate-900 flex items-center justify-center cursor-pointer hover:ring-4 ring-white/10 transition-all relative overflow-visible"
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

          <div className="flex justify-center py-3">
            <div className="flex items-center gap-2">
              <img
                src="assets/orion-white.png"
                className="w-12 h-12"
                alt="Orion"
              />
              <span className="text-3xl text-white">OrionLX+</span>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-sm">
          Tap a column to drop your piece
        </p>
      </div>

      <ResultModal
        isOpen={status !== "PLAYING"}
        title={
          status === "VICTORY"
            ? `${winner === 1 ? "Red" : "Green"} Wins!`
            : "It's a Draw!"
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
