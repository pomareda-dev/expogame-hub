import React, { useEffect, useRef, useState } from "react";
import {
  BatteryCharging,
  Clock3,
  Cog,
  Cpu,
  Factory,
  Hand,
  PackageCheck,
  Play,
  Radar,
} from "lucide-react";
import { GameLayout } from "../components/GameLayout";
import {
  AUTOMATION_SEQUENCE,
  MISSED_STATION_PENALTY,
  WRONG_TAP_PENALTY,
  applyPenalty,
  createStation,
  getInitialHealth,
  getStationScore,
  getStationTravelSeconds,
  isStationComplete,
  isStationPiecePlaced,
  placeStationPiece,
  shouldEndRound,
  type LineaStation,
  type StationPiece,
} from "./lineaEnMarchaEngine";
import { getLineaEnMarchaRoundSeconds, useGameSettings } from "../utils/gameSettings";

// Keep the completed station visible long enough to read the shipped state.
const SHIP_PAUSE_MS = 600;
const BEST_SCORE_KEY = "linea_en_marcha_best";
const STATIONS_PER_LEVEL = 3;
const DEVICE_IMAGE_BASE = `${import.meta.env.BASE_URL}assets/devices/`;

type RoundStatus = "READY" | "PLAYING" | "GAME_OVER";

interface PieceMeta {
  label: string;
  description: string;
  icon: React.ReactNode;
  chipClass: string;
}

const PIECE_META: Record<StationPiece, PieceMeta> = {
  sensor: {
    label: "Sensor",
    description: "Sensor piece",
    icon: <Radar aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />,
    chipClass:
      "border-amber-300/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
  },
  controller: {
    label: "Controller",
    description: "Controller piece",
    icon: <Cpu aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />,
    chipClass:
      "border-sky-300/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25",
  },
  actuator: {
    label: "Actuator",
    description: "Actuator piece",
    icon: <Cog aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />,
    chipClass:
      "border-emerald-300/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
  },
  manual: {
    label: "Manual override",
    description: "Manual override decoy, never part of the sequence",
    icon: <Hand aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />,
    chipClass:
      "border-slate-500/40 bg-slate-700/40 text-slate-300 hover:bg-slate-700/60",
  },
  battery: {
    label: "Battery",
    description: "Battery decoy, never part of the sequence",
    icon: (
      <BatteryCharging aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
    ),
    chipClass:
      "border-slate-500/40 bg-slate-700/40 text-slate-300 hover:bg-slate-700/60",
  },
};

const readBestScore = (): number => {
  try {
    const storedScore = Number(window.localStorage.getItem(BEST_SCORE_KEY));
    return Number.isFinite(storedScore) && storedScore > 0 ? storedScore : 0;
  } catch {
    return 0;
  }
};

const getHealthBarClass = (health: number): string => {
  if (health > 50) return "bg-emerald-400";
  if (health > 25) return "bg-amber-400";
  return "bg-rose-400";
};

export const LineaEnMarcha: React.FC = () => {
  const { settings } = useGameSettings();
  const roundSeconds = getLineaEnMarchaRoundSeconds(settings);
  const [status, setStatus] = useState<RoundStatus>("READY");
  const [station, setStation] = useState<LineaStation | null>(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(readBestScore);
  const [health, setHealth] = useState(getInitialHealth);
  const [stationsShipped, setStationsShipped] = useState(0);
  const [missedStations, setMissedStations] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [travelProgress, setTravelProgress] = useState(0);
  const [shipping, setShipping] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const deadline = useRef<number | null>(null);
  const stationDeadline = useRef<number | null>(null);
  const stationTravelMs = useRef(1);
  const stationNumber = useRef(0);

  // Keep the idle clock in step with the configured round length.
  useEffect(() => {
    if (status !== "PLAYING") setTimeLeft(roundSeconds);
  }, [roundSeconds, status]);

  const spawnStation = (nextLevel: number) => {
    stationNumber.current += 1;
    const travelMs = getStationTravelSeconds(nextLevel) * 1000;
    stationTravelMs.current = travelMs;
    stationDeadline.current = Date.now() + travelMs;
    setTravelProgress(0);
    setStation(createStation(nextLevel, stationNumber.current));
  };

  // Round clock: the run always ends when the configured time runs out.
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

  // Station clock: each station must be assembled before it exits the line.
  useEffect(() => {
    if (status !== "PLAYING" || !station || shipping) return;
    if (stationDeadline.current === null) return;

    const timer = window.setInterval(() => {
      const remaining = stationDeadline.current! - Date.now();
      const progress = Math.min(
        1,
        Math.max(0, 1 - remaining / stationTravelMs.current),
      );
      setTravelProgress(progress);

      if (remaining > 0) return;

      window.clearInterval(timer);
      stationDeadline.current = null;
      setMissedStations((missed) => missed + 1);
      const nextHealth = applyPenalty(health, MISSED_STATION_PENALTY);
      setHealth(nextHealth);

      if (shouldEndRound(nextHealth)) {
        setStatus("GAME_OVER");
        setAnnouncement(
          `Station missed. Line health exhausted. -${MISSED_STATION_PENALTY} health.`,
        );
        return;
      }

      setAnnouncement(
        `Station missed. -${MISSED_STATION_PENALTY} line health. Next station arriving.`,
      );
      spawnStation(level);
    }, 100);

    return () => window.clearInterval(timer);
  }, [health, level, shipping, station, status]);

  useEffect(() => {
    if (status !== "GAME_OVER" || score <= bestScore) return;

    setBestScore(score);
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // Keep the current session playable when browser storage is unavailable.
    }
  }, [bestScore, score, status]);

  // Hold the shipped station briefly, then send the next one down the line.
  useEffect(() => {
    if (!shipping) return;

    if (status !== "PLAYING") {
      setShipping(false);
      return;
    }

    const timer = window.setTimeout(() => {
      // The round clock owns the run: never advance once time has run out.
      if (deadline.current === null || Date.now() >= deadline.current) {
        setShipping(false);
        return;
      }

      const levelUp = stationsShipped % STATIONS_PER_LEVEL === 0;
      const nextLevel = levelUp ? level + 1 : level;
      setLevel(nextLevel);
      setShipping(false);
      spawnStation(nextLevel);
      setAnnouncement(
        levelUp
          ? `Station shipped. Level ${nextLevel}. The line moves faster now.`
          : "Station shipped. Next station arriving.",
      );
    }, SHIP_PAUSE_MS);

    return () => window.clearTimeout(timer);
  }, [level, shipping, stationsShipped, status]);

  const startRound = () => {
    setScore(0);
    setLevel(1);
    setHealth(getInitialHealth());
    setStationsShipped(0);
    setMissedStations(0);
    setTimeLeft(roundSeconds);
    setShipping(false);
    setAnnouncement(
      `Line started. Place sensor, controller and actuator in order. You have ${roundSeconds} seconds.`,
    );
    deadline.current = Date.now() + roundSeconds * 1000;
    setStatus("PLAYING");
    spawnStation(1);
  };

  const tapPiece = (piece: StationPiece) => {
    if (status !== "PLAYING" || !station || shipping) return;

    const nextStation = placeStationPiece(station, piece);
    if (nextStation === station) {
      const nextHealth = applyPenalty(health, WRONG_TAP_PENALTY);
      setHealth(nextHealth);
      setAnnouncement(
        `${PIECE_META[piece].label} does not fit now. -${WRONG_TAP_PENALTY} line health.`,
      );
      if (shouldEndRound(nextHealth)) {
        setStatus("GAME_OVER");
      }
      return;
    }

    setStation(nextStation);

    if (isStationComplete(nextStation)) {
      setScore((currentScore) => currentScore + getStationScore(level));
      setStationsShipped((shipped) => shipped + 1);
      setShipping(true);
      setAnnouncement(
        `Station assembled. +${getStationScore(level)} points.`,
      );
      return;
    }

    const expectedPiece = AUTOMATION_SEQUENCE[nextStation.placedCount];
    setAnnouncement(
      `${PIECE_META[piece].label} placed. ${PIECE_META[expectedPiece].label} next.`,
    );
  };

  const expectedPiece = station
    ? AUTOMATION_SEQUENCE[station.placedCount]
    : null;
  const progressPercent = Math.round(travelProgress * 100);

  return (
    <GameLayout
      title="Línea en Marcha"
      highScore={bestScore}
      className="min-h-0 justify-start overflow-y-auto touch-pan-y"
    >
      {status === "PLAYING" && station ? (
        <div className="flex min-h-full w-full max-w-4xl flex-col items-center gap-3 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
          <div className="w-full text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300 sm:text-sm">
              Keep the line running
            </p>
            <p className="mt-1 text-sm text-slate-300 sm:text-base">
              Tap the pieces in order: Sensor → Controller → Actuator.
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

          <div className="w-full max-w-xl">
            <div
              className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs"
              aria-hidden="true"
            >
              <span>Line health</span>
              <span className="font-mono">{health}</span>
            </div>
            <div
              role="progressbar"
              aria-label="Line health"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={health}
              className="h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-slate-900"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${getHealthBarClass(health)}`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          <div
            className="flex w-full max-w-xl flex-1 flex-col gap-3 rounded-2xl border border-amber-400/20 bg-slate-950/50 p-2 shadow-2xl shadow-amber-950/30 sm:gap-4 sm:p-4"
            aria-label={`Assembly bay, level ${level}`}
          >
            {/* Decorative conveyor strip: static pattern, safe for reduced motion. */}
            <div
              aria-hidden="true"
              className="h-3 w-full rounded-full border border-white/10 bg-[repeating-linear-gradient(90deg,rgba(251,191,36,0.35)_0_18px,transparent_18px_36px)]"
            />

            <figure className="mx-auto w-full max-w-sm">
              <img
                src={`${DEVICE_IMAGE_BASE}${station.deviceId}.png`}
                alt={`${station.deviceId} industrial automation device being assembled`}
                className="w-full rounded-xl border border-white/10 bg-slate-900 object-contain p-2"
              />
              <figcaption className="mt-1 text-center font-mono text-[10px] uppercase tracking-widest text-slate-400 sm:text-xs">
                Station #{station.id} · {station.deviceId}
              </figcaption>
            </figure>

            <div
              className="grid w-full grid-cols-3 gap-2 sm:gap-3"
              aria-label="Automation sequence slots"
            >
              {AUTOMATION_SEQUENCE.map((sequencePiece, index) => {
                const isPlaced = isStationPiecePlaced(station, sequencePiece);
                const isNext = expectedPiece === sequencePiece && !shipping;
                const slotClass = isPlaced
                  ? "border-emerald-300/60 bg-emerald-500/15 text-emerald-200"
                  : isNext
                    ? "border-amber-300/70 bg-amber-500/10 text-amber-200 ring-2 ring-amber-300/40"
                    : "border-white/10 bg-slate-800/60 text-slate-500";
                return (
                  <div
                    key={sequencePiece}
                    aria-label={`${PIECE_META[sequencePiece].label} slot, ${isPlaced ? "placed" : isNext ? "next" : "pending"}`}
                    className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider sm:min-h-14 sm:text-xs ${slotClass}`}
                  >
                    {PIECE_META[sequencePiece].icon}
                    <span>{PIECE_META[sequencePiece].label}</span>
                  </div>
                );
              })}
            </div>

            <div>
              <div
                className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs"
                aria-hidden="true"
              >
                <span>Station travel</span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Station travel along the line"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                className="h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-slate-900"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-100 ${
                    travelProgress > 0.75
                      ? "bg-rose-400"
                      : "bg-gradient-to-r from-amber-400 to-orange-500"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div
              className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-3"
              aria-label="Available pieces"
            >
              {station.pieces.map((piece, index) => (
                <button
                  key={`${station.id}-${piece}-${index}`}
                  type="button"
                  onClick={() => tapPiece(piece)}
                  aria-label={`Place ${PIECE_META[piece].label}. ${PIECE_META[piece].description}.`}
                  disabled={shipping}
                  className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:scale-[0.98] disabled:opacity-60 sm:px-5 sm:text-base ${PIECE_META[piece].chipClass}`}
                >
                  {PIECE_META[piece].icon}
                  {PIECE_META[piece].label}
                </button>
              ))}
            </div>

            {shipping && (
              <p className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-center text-sm font-bold text-emerald-200 sm:text-base">
                <PackageCheck aria-hidden="true" className="h-5 w-5" />
                Shipped! Next station coming down the line…
              </p>
            )}
          </div>

          <div className="flex w-full max-w-xl items-center justify-between gap-3 text-xs text-slate-400 sm:text-sm">
            <span>Shipped: {stationsShipped}</span>
            <span>Missed: {missedStations}</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
          <p className="text-center text-[10px] text-slate-500 sm:text-xs">
            Fictional arcade game — not a guide to real automation equipment.
          </p>
        </div>
      ) : (
        <div className="flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-5 px-5 py-8 text-center sm:gap-7">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/30 bg-amber-500/10 text-amber-300 shadow-lg shadow-amber-950/30 sm:h-28 sm:w-28">
            <Factory aria-hidden="true" className="h-10 w-10 sm:h-14 sm:w-14" />
          </div>
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300 sm:text-sm">
              NovaTech Automation · Arcade Challenge
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
              {status === "GAME_OVER"
                ? health <= 0
                  ? "The line stopped"
                  : "Time's up"
                : "Keep the line running"}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300 sm:text-xl">
              {status === "GAME_OVER"
                ? `You shipped ${stationsShipped} ${stationsShipped === 1 ? "station" : "stations"} and scored ${score} points.`
                : "Assemble each station by placing sensor, controller and actuator in order before it leaves the line. Keep going for " +
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
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-amber-500 px-8 py-4 text-lg font-extrabold text-slate-950 shadow-xl shadow-amber-950/40 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 active:scale-[0.98] sm:min-h-16 sm:px-10 sm:text-xl"
          >
            <Play aria-hidden="true" className="h-5 w-5 fill-current" />
            {status === "GAME_OVER" ? "Play again" : "Start game"}
          </button>
          <p className="max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
            Fictional arcade game — no real automation equipment or assembly instructions.
          </p>
        </div>
      )}
    </GameLayout>
  );
};
