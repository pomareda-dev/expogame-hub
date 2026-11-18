import React from "react";
import { Play, type LucideIcon } from "lucide-react";

export type GameIntroAccent = "sky" | "amber" | "rose" | "violet";

interface AccentStyles {
  badge: string;
  eyebrow: string;
  action: string;
}

/**
 * Tailwind only ships the classes it can find as literal strings, so every
 * accent keeps its full class list here instead of building names at runtime.
 */
const ACCENTS: Record<GameIntroAccent, AccentStyles> = {
  sky: {
    badge:
      "border-sky-300/30 bg-sky-500/10 text-sky-300 shadow-sky-950/30",
    eyebrow: "text-sky-300",
    action:
      "bg-sky-500 hover:bg-sky-400 shadow-sky-950/40 focus-visible:ring-amber-300",
  },
  amber: {
    badge:
      "border-amber-300/30 bg-amber-500/10 text-amber-300 shadow-amber-950/30",
    eyebrow: "text-amber-300",
    action:
      "bg-amber-500 hover:bg-amber-400 shadow-amber-950/40 focus-visible:ring-sky-300",
  },
  rose: {
    badge:
      "border-rose-300/30 bg-rose-500/10 text-rose-300 shadow-rose-950/30",
    eyebrow: "text-rose-300",
    action:
      "bg-rose-500 hover:bg-rose-400 shadow-rose-950/40 focus-visible:ring-amber-300",
  },
  violet: {
    badge:
      "border-violet-300/30 bg-violet-500/10 text-violet-300 shadow-violet-950/30",
    eyebrow: "text-violet-300",
    action:
      "bg-violet-500 hover:bg-violet-400 shadow-violet-950/40 focus-visible:ring-amber-300",
  },
};

export interface GameIntroProps {
  accent: GameIntroAccent;
  icon: LucideIcon;
  /** Small uppercase label above the headline. */
  eyebrow: string;
  headline: string;
  description: React.ReactNode;
  /** Score summary shown once a run has ended. */
  stats?: React.ReactNode;
  /**
   * Replaces the start button when a game picks its own entry point, such as
   * the Memory Match difficulty selector.
   */
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** Small print under the action, such as a fictional-content notice. */
  footer?: React.ReactNode;
}

export const GameIntro: React.FC<GameIntroProps> = ({
  accent,
  icon: Icon,
  eyebrow,
  headline,
  description,
  stats,
  action,
  actionLabel = "Start game",
  onAction,
  footer,
}) => {
  const styles = ACCENTS[accent];

  return (
    <div className="flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-5 px-5 py-8 text-center sm:gap-7">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-3xl border shadow-lg sm:h-28 sm:w-28 ${styles.badge}`}
      >
        <Icon aria-hidden="true" className="h-10 w-10 sm:h-14 sm:w-14" />
      </div>
      <div className="max-w-xl">
        <p
          className={`text-xs font-bold uppercase tracking-[0.24em] sm:text-sm ${styles.eyebrow}`}
        >
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
          {headline}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-300 sm:text-xl">
          {description}
        </p>
      </div>

      {stats}

      {action ??
        (onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl px-8 py-4 text-lg font-extrabold text-slate-950 shadow-xl transition focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98] sm:min-h-16 sm:px-10 sm:text-xl ${styles.action}`}
          >
            <Play aria-hidden="true" className="h-5 w-5 fill-current" />
            {actionLabel}
          </button>
        ))}

      {footer && (
        <p className="max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
          {footer}
        </p>
      )}
    </div>
  );
};

interface GameIntroStatsProps {
  score: number;
  best: number;
}

/** Score and best-score summary shared by the arcade intros. */
export const GameIntroStats: React.FC<GameIntroStatsProps> = ({
  score,
  best,
}) => (
  <div className="flex gap-4 rounded-2xl border border-white/10 bg-slate-800/70 px-6 py-4">
    <div>
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
        Score
      </span>
      <span className="font-mono text-2xl font-bold text-white">{score}</span>
    </div>
    <div className="w-px bg-white/10" />
    <div>
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
        Best
      </span>
      <span className="font-mono text-2xl font-bold text-amber-300">{best}</span>
    </div>
  </div>
);
