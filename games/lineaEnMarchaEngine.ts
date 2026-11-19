/**
 * Deterministic engine for the "Production Line" arcade game.
 *
 * Stations travel along a production line. Each station assembles one
 * fictional Novatech device from an automation sequence whose pieces arrive
 * shuffled: sensor → controller → actuator. The player must place the pieces
 * in that exact order before the station leaves the belt. This module is pure
 * game logic with no React or DOM dependencies so it can run under Node tests.
 */

export type SequencePiece = "sensor" | "controller" | "actuator";
export type DistractorPiece = "manual" | "battery";
export type StationPiece = SequencePiece | DistractorPiece;

export const AUTOMATION_SEQUENCE: readonly SequencePiece[] = [
  "sensor",
  "controller",
  "actuator",
];

/** One fictional Novatech device: its image file and the name players read. */
export interface NovatechDevice {
  /** File name, without extension, of the device image in public/assets/devices/. */
  imageId: string;
  /** Human-readable device name shown in the assembly bay. */
  name: string;
}

/** Fictional device catalog; imageId maps to public/assets/devices/<imageId>.png. */
export const NOVATECH_DEVICES: readonly NovatechDevice[] = [
  { imageId: "HERMES2000", name: "Hermes 2000" },
  { imageId: "KRONOS2P", name: "Kronos 2P" },
  { imageId: "KRONOS2R", name: "Kronos 2R" },
  { imageId: "KRONOS3R", name: "Kronos 3R" },
  { imageId: "ORIONIO", name: "Orion IO" },
  { imageId: "ORIONLX", name: "Orion LX" },
  { imageId: "ORIONLXM", name: "Orion LXM" },
  { imageId: "ORIONMX", name: "Orion MX" },
  { imageId: "ORIONSX", name: "Orion SX" },
];

/** Image ids of every catalogued device, used to pick a device at random. */
export const NOVATECH_DEVICE_IDS: readonly string[] = NOVATECH_DEVICES.map(
  (device) => device.imageId,
);

/**
 * Display name for a device image id. Ids missing from the catalog fall back to
 * the id itself so a station always renders a label.
 */
export const getNovatechDeviceName = (deviceId: string): string =>
  NOVATECH_DEVICES.find((device) => device.imageId === deviceId)?.name ??
  deviceId;

const DISTRACTOR_PIECES: readonly DistractorPiece[] = ["manual", "battery"];

export interface LineaStation {
  id: number;
  deviceId: string;
  /** Shuffled pieces presented to the player, including distractors. */
  pieces: StationPiece[];
  /** Number of sequence pieces already placed in the correct order. */
  placedCount: number;
}

const BASE_STATION_TRAVEL_SECONDS = 8;
const TRAVEL_SECONDS_PER_LEVEL = 0.6;
export const WRONG_TAP_PENALTY = 10;
export const MISSED_STATION_PENALTY = 20;
const INITIAL_HEALTH = 100;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const shuffle = <T>(items: readonly T[], random: () => number): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/** Extra decoy pieces that must never be placed, growing with the level. */
export const getDistractorCount = (level: number): number =>
  clamp(Math.floor((Math.max(1, level) - 1) / 2), 0, DISTRACTOR_PIECES.length);

/** Seconds a station takes to cross the line; higher levels are faster. */
export const MIN_STATION_TRAVEL_SECONDS = 3.5;
export const getStationTravelSeconds = (level: number): number =>
  Math.max(
    MIN_STATION_TRAVEL_SECONDS,
    BASE_STATION_TRAVEL_SECONDS -
      (Math.max(1, level) - 1) * TRAVEL_SECONDS_PER_LEVEL,
  );

export const getStationScore = (level: number): number =>
  50 + (Math.max(1, level) - 1) * 10;

export const getInitialHealth = (): number => INITIAL_HEALTH;

export const applyPenalty = (health: number, penalty: number): number =>
  clamp(Math.round(health - Math.max(0, penalty)), 0, INITIAL_HEALTH);

export const shouldEndRound = (health: number): boolean => health <= 0;

const pickDeviceId = (random: () => number): string =>
  NOVATECH_DEVICE_IDS[
    Math.min(
      NOVATECH_DEVICE_IDS.length - 1,
      Math.floor(random() * NOVATECH_DEVICE_IDS.length),
    )
  ];

/** Build a station for the given level, with shuffled pieces and decoys. */
export const createStation = (
  level: number,
  id: number,
  random: () => number = Math.random,
): LineaStation => {
  const distractorCount = getDistractorCount(level);
  const pieces: StationPiece[] = [
    ...AUTOMATION_SEQUENCE,
    ...DISTRACTOR_PIECES.slice(0, distractorCount),
  ];

  return {
    id,
    deviceId: pickDeviceId(random),
    pieces: shuffle(pieces, random),
    placedCount: 0,
  };
};

/**
 * Try to place a piece on the station. Only the next expected sequence piece
 * advances the station; distractors and out-of-order pieces never do.
 */
export const placeStationPiece = (
  station: LineaStation,
  piece: StationPiece,
): LineaStation => {
  if (isStationComplete(station)) return station;
  if (AUTOMATION_SEQUENCE[station.placedCount] !== piece) return station;

  return { ...station, placedCount: station.placedCount + 1 };
};

export const isStationComplete = (station: LineaStation): boolean =>
  station.placedCount >= AUTOMATION_SEQUENCE.length;

export const isStationPiecePlaced = (
  station: LineaStation,
  piece: SequencePiece,
): boolean => {
  const sequenceIndex = AUTOMATION_SEQUENCE.indexOf(piece);
  return sequenceIndex >= 0 && sequenceIndex < station.placedCount;
};

export type RoundStatus = "READY" | "PLAYING" | "GAME_OVER";

/** Keep the completed station visible long enough to read the shipped state. */
export const SHIP_PAUSE_MS = 600;

/** Stations that must ship before the line speeds up. */
export const STATIONS_PER_LEVEL = 3;

export interface LineaRound {
  status: RoundStatus;
  level: number;
  score: number;
  /** Line health, 0..100. */
  health: number;
  stationsShipped: number;
  missedStations: number;
  station: LineaStation | null;
  shipping: boolean;
  /** Absolute epoch milliseconds at which the current station leaves the line. */
  stationDeadlineMs: number;
  stationTravelMs: number;
  /** Travel progress of the current station, 0..1. */
  stationProgress: number;
  /** Absolute epoch milliseconds at which the run ends. */
  roundDeadlineMs: number;
  endedReason: "time" | "health" | null;
  /** Engine-internal random source reused for later station spawns. */
  random: () => number;
}

export interface TapPieceResult {
  round: LineaRound;
  event: "rejected" | "placed" | "shipped";
}

/**
 * Build a fresh, timestamp-driven round. Every deadline is absolute so the
 * caller only has to supply `Date.now()` on each tick.
 */
export const createRound = (
  nowMs: number,
  roundSeconds: number,
  random: () => number = Math.random,
): LineaRound => {
  const travelMs = getStationTravelSeconds(1) * 1000;

  return {
    status: "PLAYING",
    level: 1,
    score: 0,
    health: getInitialHealth(),
    stationsShipped: 0,
    missedStations: 0,
    station: createStation(1, 1, random),
    shipping: false,
    stationDeadlineMs: nowMs + travelMs,
    stationTravelMs: travelMs,
    stationProgress: 0,
    roundDeadlineMs: nowMs + roundSeconds * 1000,
    endedReason: null,
    random,
  };
};

const travelProgressAt = (round: LineaRound, nowMs: number): number =>
  clamp(1 - (round.stationDeadlineMs - nowMs) / round.stationTravelMs, 0, 1);

const spawnRoundStation = (
  round: LineaRound,
  level: number,
  id: number,
  nowMs: number,
): LineaRound => {
  const travelMs = getStationTravelSeconds(level) * 1000;

  return {
    ...round,
    station: createStation(level, id, round.random),
    stationTravelMs: travelMs,
    stationDeadlineMs: nowMs + travelMs,
    stationProgress: 0,
  };
};

/**
 * Advance the round clock. Returns the same reference when nothing is due so
 * callers can skip re-rendering.
 */
export const tickRound = (round: LineaRound, nowMs: number): LineaRound => {
  if (round.status !== "PLAYING") return round;

  // Freeze the travel bar during the ship pause: the station is already
  // assembled, so its remaining travel time is no longer game state.
  const stationProgress = round.shipping
    ? round.stationProgress
    : travelProgressAt(round, nowMs);

  if (nowMs >= round.roundDeadlineMs) {
    return {
      ...round,
      stationProgress,
      shipping: false,
      status: "GAME_OVER",
      endedReason: "time",
    };
  }

  const station = round.station;
  if (station && !round.shipping && nowMs >= round.stationDeadlineMs) {
    const health = applyPenalty(round.health, MISSED_STATION_PENALTY);
    const missed = {
      ...round,
      stationProgress,
      health,
      missedStations: round.missedStations + 1,
    };

    if (shouldEndRound(health)) {
      return {
        ...missed,
        shipping: false,
        stationDeadlineMs: 0,
        status: "GAME_OVER",
        endedReason: "health",
      };
    }

    return spawnRoundStation(missed, round.level, station.id + 1, nowMs);
  }

  if (stationProgress === round.stationProgress) return round;
  return { ...round, stationProgress };
};

/** Try to place a piece, applying the wrong-tap health penalty when it fails. */
export const tapPiece = (
  round: LineaRound,
  piece: StationPiece,
): TapPieceResult => {
  const station = round.station;
  if (round.status !== "PLAYING" || !station || round.shipping) {
    return { round, event: "rejected" };
  }

  const nextStation = placeStationPiece(station, piece);

  if (nextStation === station) {
    const health = applyPenalty(round.health, WRONG_TAP_PENALTY);
    const rejected = { ...round, health };

    return {
      round: shouldEndRound(health)
        ? { ...rejected, status: "GAME_OVER", endedReason: "health" }
        : rejected,
      event: "rejected",
    };
  }

  if (isStationComplete(nextStation)) {
    return {
      round: {
        ...round,
        station: nextStation,
        score: round.score + getStationScore(round.level),
        stationsShipped: round.stationsShipped + 1,
        shipping: true,
      },
      event: "shipped",
    };
  }

  return { round: { ...round, station: nextStation }, event: "placed" };
};

/**
 * End the ship pause and send the next station down the line. The round clock
 * owns the run: once time is out the pause only clears the shipping flag.
 */
export const advanceShip = (
  round: LineaRound,
  nowMs: number,
): LineaRound => {
  if (round.status !== "PLAYING" || !round.shipping) return round;

  if (nowMs >= round.roundDeadlineMs) {
    return { ...round, shipping: false };
  }

  const level =
    round.stationsShipped % STATIONS_PER_LEVEL === 0
      ? round.level + 1
      : round.level;
  const nextId = (round.station?.id ?? 0) + 1;

  return {
    ...spawnRoundStation(round, level, nextId, nowMs),
    level,
    shipping: false,
  };
};

/** Whole seconds left in the run, never negative. */
export const getRoundSecondsLeft = (
  round: LineaRound,
  nowMs: number,
): number => Math.max(0, Math.ceil((round.roundDeadlineMs - nowMs) / 1000));
