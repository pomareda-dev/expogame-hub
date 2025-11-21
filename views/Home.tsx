import React from "react";
import { useNavigate } from "react-router-dom";
import { GameRoute, GameConfig } from "../types";
import { Gamepad2, Ghost, Brain, Target, Info } from "lucide-react";

const games: GameConfig[] = [
  {
    id: "connect4",
    name: "Connect Four",
    route: GameRoute.CONNECT_FOUR,
    icon: <Gamepad2 className="w-10 h-10 text-white" />,
    color: "bg-gradient-to-br from-rose-500 to-rose-600",
    description: "Strategy Classic",
  },
  {
    id: "flappy",
    name: "Flappy Drone",
    route: GameRoute.FLAPPY_BIRD,
    icon: <Ghost className="w-10 h-10 text-white" />,
    color: "bg-gradient-to-br from-amber-400 to-amber-600",
    description: "Tap to fly",
  },
  {
    id: "memory",
    name: "Memory Match",
    route: GameRoute.MEMORY,
    icon: <Brain className="w-10 h-10 text-white" />,
    color: "bg-gradient-to-br from-violet-500 to-purple-600",
    description: "Test your mind",
  },
  {
    id: "catcher",
    name: "Star Catcher",
    route: GameRoute.CATCHER,
    icon: <Target className="w-10 h-10 text-white" />,
    color: "bg-gradient-to-br from-sky-400 to-blue-600",
    description: "Reflex Challenge",
  },
];

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-slate-900 relative overflow-hidden flex flex-col">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-brand-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 py-8 flex justify-between items-center">
        <div className="animate-slide-up" style={{ animationDelay: "0ms" }}>
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
            ExpoHub<span className="text-brand-500">.os</span>
          </h1>
          <p className="text-slate-300 text-sm mt-1 font-medium tracking-wide">
            Interactive Experience Center
          </p>
        </div>
        <div
          className="px-4 py-2 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 text-xs font-mono text-slate-200 flex items-center gap-2 shadow-lg animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
          SYSTEM ONLINE
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 relative z-10 flex items-center justify-center p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl w-full perspective-1000">
          {games.map((game, index) => (
            <button
              key={game.id}
              onClick={() => navigate(game.route)}
              className="group relative flex flex-col items-center gap-4 p-6 rounded-3xl bg-slate-800/40 border border-white/5 hover:bg-slate-700/50 hover:border-white/20 transition-all duration-500 backdrop-blur-md hover:-translate-y-2 hover:shadow-2xl"
              style={{
                animation: `slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                animationDelay: `${150 + index * 100}ms`,
                opacity: 0,
              }}
            >
              {/* Glow effect behind icon */}
              <div
                className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl ${game.color}`}
              ></div>

              <div
                className={`relative w-20 h-20 md:w-24 md:h-24 rounded-2xl ${game.color} flex items-center justify-center shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:scale-110 transition-all duration-500 z-10`}
              >
                <div className="transition-transform duration-500 group-hover:rotate-6">
                  {game.icon}
                </div>
              </div>
              <div className="text-center relative z-10">
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-brand-200 transition-colors">
                  {game.name}
                </h3>
                <div className="h-6 overflow-hidden relative">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold transition-all duration-300 absolute w-full top-0 group-hover:-top-6 opacity-100 group-hover:opacity-0">
                    Tap to Play
                  </p>
                  <p className="text-xs text-brand-300 uppercase tracking-wide font-semibold transition-all duration-300 absolute w-full top-6 group-hover:top-0 opacity-0 group-hover:opacity-100">
                    {game.description}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {/* Coming Soon Placeholder */}
          <div
            className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-dashed border-white/10 opacity-0"
            style={{
              animation: `slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              animationDelay: `${150 + games.length * 100}ms`,
            }}
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-800/50 flex items-center justify-center grayscale opacity-50">
              <Info className="w-8 h-8 text-slate-400" />
            </div>
            <span className="text-sm text-slate-500 font-medium uppercase tracking-widest">
              Coming Soon
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 p-6 text-center animate-slide-up"
        style={{ animationDelay: "600ms" }}
      >
        <p className="text-slate-500 text-xs font-medium">
          Designed for Interactive Expo Experience • v1.0.0
        </p>
      </footer>
    </div>
  );
};
