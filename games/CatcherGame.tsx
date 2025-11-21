import React, { useRef, useEffect, useState } from 'react';
import { GameLayout } from '../components/GameLayout';
import { ResultModal } from '../components/ResultModal';
import { GameStatus } from '../types';

export const CatcherGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('catcher_best');
    return saved ? parseInt(saved, 10) : 0;
  });

  const gameState = useRef({
    basketX: 0,
    basketWidth: 80,
    basketHeight: 20,
    items: [] as { x: number; y: number; type: 'good' | 'bad'; speed: number }[],
    spawnTimer: 0
  });

  const requestRef = useRef<number>(0);

  const initGame = () => {
    setScore(0);
    setLives(3);
    setTimeLeft(60);
    setStatus('PLAYING');
    gameState.current.items = [];
    gameState.current.spawnTimer = 0;
  };

  const updateHighScore = (currentScore: number) => {
    if (currentScore > highScore) {
      setHighScore(currentScore);
      localStorage.setItem('catcher_best', currentScore.toString());
    }
  };

  // Timer Logic
  useEffect(() => {
    if (status !== 'PLAYING') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('GAME_OVER');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Input handling
  const handleMove = (clientX: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    gameState.current.basketX = x - gameState.current.basketWidth / 2;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    const loop = () => {
      if (status === 'PLAYING') {
        update(canvas);
      }
      draw(ctx, canvas);
      if (status !== 'GAME_OVER') {
        requestRef.current = requestAnimationFrame(loop);
      }
    };
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [status, lives, highScore]); // Added highScore to dependency

  const update = (canvas: HTMLCanvasElement) => {
    const state = gameState.current;

    // Spawning
    state.spawnTimer++;
    if (state.spawnTimer > 40) { // Spawn rate
        state.spawnTimer = 0;
        const type = Math.random() > 0.2 ? 'good' : 'bad'; // 20% chance of bomb
        state.items.push({
            x: Math.random() * (canvas.width - 50), // Increased margin for larger items
            y: -50, // Spawn higher up to accommodate larger size
            type,
            speed: Math.random() * 2 + 3 // Speed 3-5
        });
    }

    // Move items
    for (let i = state.items.length - 1; i >= 0; i--) {
        const item = state.items[i];
        item.y += item.speed;

        // Collision with Basket
        // Adjust collision offsets for larger items (approx 42px wide/high)
        if (
            item.y + 30 >= canvas.height - 50 && // Visual overlap with top of basket
            item.y < canvas.height - 10 &&
            item.x + 45 > state.basketX && // Check left edge of item vs basket
            item.x < state.basketX + state.basketWidth // Check right edge of item vs basket
        ) {
            if (item.type === 'good') {
                setScore(s => {
                    const newScore = s + 10;
                    updateHighScore(newScore);
                    return newScore;
                });
            } else {
                setScore(s => Math.max(0, s - 50));
                // Flash screen red (visual handled in draw)
                if (lives <= 1) {
                    setStatus('GAME_OVER');
                    return;
                } else {
                    setLives(l => l - 1);
                }
            }
            state.items.splice(i, 1);
            continue;
        }

        // Missed item
        if (item.y > canvas.height) {
             state.items.splice(i, 1);
        }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // BG
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const state = gameState.current;

    // Basket
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(state.basketX, canvas.height - 50, state.basketWidth, state.basketHeight);
    // Basket detail
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(state.basketX + 5, canvas.height - 45, state.basketWidth - 10, 5);


    // Items
    state.items.forEach(item => {
        ctx.font = '42px Arial'; // Increased from 24px (~70% larger)
        ctx.fillText(item.type === 'good' ? '⭐' : '💣', item.x, item.y);
    });

    // UI Text if IDLE
    if (status === 'IDLE') {
        ctx.fillStyle = 'white';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Drag to move basket', canvas.width/2, canvas.height/2);
        ctx.fillText('Catch Stars ⭐ Avoid Bombs 💣', canvas.width/2, canvas.height/2 + 30);
        
        // Start Button Visual
        ctx.fillStyle = '#0ea5e9';
        ctx.roundRect(canvas.width/2 - 60, canvas.height/2 + 60, 120, 40, 10);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Inter';
        ctx.fillText('START', canvas.width/2, canvas.height/2 + 85);
    }
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (status === 'IDLE') {
          initGame();
      }
  }

  return (
    <GameLayout title="Star Catcher" highScore={highScore}>
      <div className="absolute top-20 w-full flex justify-between px-8 z-10 max-w-3xl mx-auto pointer-events-none">
          <div className="flex gap-4">
            <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-white/10 text-white font-mono font-bold shadow-lg">
                Score: {score}
            </div>
            <div className={`bg-slate-800/80 px-4 py-2 rounded-xl border border-white/10 font-mono font-bold shadow-lg transition-colors ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                Time: {timeLeft}s
            </div>
          </div>
          <div className="flex gap-1 items-center bg-slate-800/50 px-2 rounded-xl backdrop-blur-sm">
              {[...Array(3)].map((_, i) => (
                  <span key={i} className={`text-2xl transition-opacity ${i < lives ? 'opacity-100' : 'opacity-20 grayscale'}`}>❤️</span>
              ))}
          </div>
      </div>
      
      <div 
        className="w-full h-full touch-none cursor-col-resize"
        onMouseMove={(e) => handleMove(e.clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      <ResultModal 
        isOpen={status === 'GAME_OVER'}
        title={lives > 0 ? "Time's Up!" : "Game Over"}
        message={lives > 0 ? "Great job! You survived the time limit." : "You ran out of lives!"}
        score={score}
        isVictory={lives > 0}
        onRetry={initGame}
      />
    </GameLayout>
  );
};