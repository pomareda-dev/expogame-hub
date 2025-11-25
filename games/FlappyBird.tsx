import React, { useRef, useEffect, useState } from "react";
import { GameLayout } from "../components/GameLayout";
import { ResultModal } from "../components/ResultModal";
import { GameStatus } from "../types";

export const FlappyBird: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>("IDLE");
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("flappy_best");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Game State Refs (to access inside requestAnimationFrame without dependencies)
  const gameState = useRef({
    birdY: 300,
    birdVelocity: 0,
    birdSize: 20,
    gravity: 0.3,
    jumpStrength: -7.5,
    obstacles: [] as { x: number; gapY: number; passed: boolean }[],
    obstacleWidth: 60,
    obstacleGap: 320,
    obstacleSpeed: 2,
    spawnTimer: 0,
    score: 0,
  });

  const requestRef = useRef<number>(0);

  const resetGame = () => {
    gameState.current = {
      ...gameState.current,
      birdY: canvasRef.current ? canvasRef.current.height / 2 : 300,
      birdVelocity: 0,
      obstacles: [],
      spawnTimer: 0,
      score: 0,
      obstacleGap: 320, // Reset gap
    };
    setScore(0);
    setStatus("PLAYING");
  };

  const updateHighScore = (currentScore: number) => {
    if (currentScore > highScore) {
      setHighScore(currentScore);
      localStorage.setItem("flappy_best", currentScore.toString());
    }
  };

  const jump = () => {
    if (status === "PLAYING") {
      gameState.current.birdVelocity = gameState.current.jumpStrength;
    } else if (status === "IDLE") {
      resetGame();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle resizing
    const resize = () => {
      // Set to container size
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    window.addEventListener("resize", resize);
    resize();

    const loop = () => {
      if (status === "PLAYING") {
        update(canvas);
      }
      draw(ctx, canvas);
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [status, highScore]); // Dependency on highScore ensures draw loop sees updated value if needed

  const update = (canvas: HTMLCanvasElement) => {
    const state = gameState.current;

    // Physics
    state.birdVelocity += state.gravity;
    state.birdY += state.birdVelocity;

    // Boundaries
    if (state.birdY + state.birdSize > canvas.height || state.birdY < 0) {
      setStatus("GAME_OVER");
      return;
    }

    // Obstacles
    state.spawnTimer++;
    if (state.spawnTimer > 180) {
      // Spawn rate
      state.spawnTimer = 0;

      // Use 20% margin or minimum 100px to keep gameplay centered
      const margin = Math.max(100, canvas.height * 0.2);
      const minGapY = margin;
      // Ensure maxGapY is at least minGapY (fallback for small screens)
      const maxGapY = Math.max(
        minGapY,
        canvas.height - margin - state.obstacleGap
      );

      const gapY = Math.floor(
        Math.random() * (maxGapY - minGapY + 1) + minGapY
      );
      state.obstacles.push({ x: canvas.width, gapY, passed: false });
    }

    // Move Obstacles
    state.obstacles.forEach((obs) => {
      obs.x -= state.obstacleSpeed;
    });

    // Remove off-screen
    if (
      state.obstacles.length > 0 &&
      state.obstacles[0].x + state.obstacleWidth < 0
    ) {
      state.obstacles.shift();
    }

    // Collision Detection
    const birdRect = {
      left: 50, // Bird X is fixed
      right: 50 + state.birdSize,
      top: state.birdY,
      bottom: state.birdY + state.birdSize,
    };

    for (const obs of state.obstacles) {
      const obsLeft = obs.x;
      const obsRight = obs.x + state.obstacleWidth;

      // Top Pipe
      if (
        birdRect.right > obsLeft &&
        birdRect.left < obsRight &&
        birdRect.top < obs.gapY
      ) {
        setStatus("GAME_OVER");
      }

      // Bottom Pipe
      if (
        birdRect.right > obsLeft &&
        birdRect.left < obsRight &&
        birdRect.bottom > obs.gapY + state.obstacleGap
      ) {
        setStatus("GAME_OVER");
      }

      // Score
      if (!obs.passed && birdRect.left > obsRight) {
        obs.passed = true;
        state.score += 1;

        const reduction = Math.floor(state.score / 10) * 10;
        state.obstacleGap = Math.max(200, 320 - reduction);

        setScore((prev) => {
          const newScore = prev + 1;
          updateHighScore(newScore);
          return newScore;
        });
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#1e293b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const state = gameState.current;

    // Draw Obstacles
    ctx.fillStyle = "#22c55e"; // Green pipes
    state.obstacles.forEach((obs) => {
      // Top pipe
      ctx.fillRect(obs.x, 0, state.obstacleWidth, obs.gapY);
      // Bottom pipe
      ctx.fillRect(
        obs.x,
        obs.gapY + state.obstacleGap,
        state.obstacleWidth,
        canvas.height - (obs.gapY + state.obstacleGap)
      );

      // Pipe details (lighter edge)
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(obs.x, 0, 5, obs.gapY);
      ctx.fillRect(
        obs.x,
        obs.gapY + state.obstacleGap,
        5,
        canvas.height - (obs.gapY + state.obstacleGap)
      );
      ctx.fillStyle = "#22c55e"; // Reset
    });

    // Draw Bird
    ctx.fillStyle = "#fbbf24"; // Yellow bird
    ctx.beginPath();
    ctx.arc(
      50 + state.birdSize / 2,
      state.birdY + state.birdSize / 2,
      state.birdSize,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Eye
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(
      50 + state.birdSize / 2 + 5,
      state.birdY + state.birdSize / 2 - 5,
      6,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(
      50 + state.birdSize / 2 + 7,
      state.birdY + state.birdSize / 2 - 5,
      2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (status === "IDLE") {
      ctx.fillStyle = "white";
      ctx.font = "30px Inter";
      ctx.textAlign = "center";
      ctx.fillText("Tap to Start", canvas.width / 2, canvas.height / 2);
    }
  };

  return (
    <GameLayout title="Flappy Drone" highScore={highScore}>
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
        <div className="text-6xl font-black text-white drop-shadow-lg font-mono">
          {score}
        </div>
      </div>
      <div
        className="w-full h-full relative cursor-pointer touch-none"
        onMouseDown={jump}
        onTouchStart={(e) => {
          e.preventDefault();
          jump();
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      <ResultModal
        isOpen={status === "GAME_OVER"}
        title="Crashed!"
        message="The drone hit an obstacle."
        score={score}
        onRetry={resetGame}
      />
    </GameLayout>
  );
};
