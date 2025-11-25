import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { GameRoute } from "../types";

interface GameLayoutProps {
  title: string;
  children: React.ReactNode;
  highScore?: number;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  title,
  children,
  highScore,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-800/50 backdrop-blur-md border-b border-white/5 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(GameRoute.HOME)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <h1 className="text-xl font-bold text-white tracking-wide">
              {title}
            </h1>
            {highScore !== undefined && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full w-fit">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <span className="text-[10px] sm:text-xs font-bold text-yellow-500 uppercase tracking-wider">
                  Best
                </span>
                <span className="font-mono text-sm font-bold text-yellow-400 leading-none">
                  {highScore}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs font-mono text-slate-400 uppercase tracking-widest">
            NovaTech OS
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        </div>
      </header>

      {/* Game Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
        {children}
      </main>
    </div>
  );
};
