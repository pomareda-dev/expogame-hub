import React, { useEffect, useRef } from "react";
import { Button } from "./Button";
import { RefreshCw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GameRoute } from "../types";

interface ResultModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  score?: number | string;
  onRetry: () => void;
  isVictory?: boolean;
}

// Lightweight internal component for confetti to avoid extra dependencies
const ConfettiCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * 6.2,
        spin: Math.random() * 0.2 - 0.1,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.speed;
        p.angle += p.spin;
        p.x += Math.sin(p.angle) * 2;

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-50"
    />
  );
};

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  title,
  message,
  score,
  onRetry,
  isVictory = false,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop with blur and tint */}
      <div
        className={`absolute inset-0 backdrop-blur-md transition-colors duration-500 ${
          isVictory ? "bg-black/60" : "bg-black/80 grayscale-[0.5]"
        }`}
      ></div>

      {isVictory && <ConfettiCanvas />}

      {/* Main Modal */}
      <div
        className={`relative bg-slate-800/90 border border-white/10 p-8 rounded-[2rem] max-w-md w-full mx-4 text-center shadow-2xl ${
          isVictory
            ? "animate-pop-in shadow-brand-500/20"
            : "animate-shake shadow-rose-500/10"
        }`}
      >
        {/* Glow Effect for Victory */}
        {isVictory && (
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-500/30 blur-[50px] rounded-full pointer-events-none"></div>
        )}

        <div
          className={`relative w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 border-4 ${
            isVictory
              ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 animate-bounce-slight"
              : "bg-slate-700 border-slate-600 text-slate-300"
          }`}
        >
          {isVictory ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 drop-shadow-lg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          ) : (
            <span className="text-5xl filter drop-shadow-md">😓</span>
          )}
        </div>

        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-slate-400 mb-6 font-medium">{message}</p>

        {score !== undefined && (
          <div className="bg-slate-900/80 rounded-2xl p-4 mb-8 border border-white/5 transform hover:scale-105 transition-transform">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
              Final Score
            </span>
            <div
              className={`text-5xl font-black font-mono mt-1 ${
                isVictory
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500"
                  : "text-slate-200"
              }`}
            >
              {score}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={onRetry}
            size="lg"
            className="w-full shadow-xl shadow-brand-900/20 hover:shadow-brand-500/40 hover:-translate-y-1 transition-all duration-300"
          >
            <RefreshCw className="w-5 h-5 mr-2" /> Play Again
          </Button>
          <Button
            onClick={() => navigate(GameRoute.HOME)}
            variant="secondary"
            size="lg"
            className="w-full hover:-translate-y-1 transition-transform"
          >
            <Home className="w-5 h-5 mr-2" /> Return to Hub
          </Button>
        </div>
      </div>
    </div>
  );
};
