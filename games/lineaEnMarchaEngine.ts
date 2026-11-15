/**
 * Deterministic engine for the "Línea en Marcha" arcade game.
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

/** Fictional device catalog; ids map to images in public/assets/devices/. */
export const NOVATECH_DEVICE_IDS: readonly string[] = [
  "HERMES2000",
  "KRONOS2P",
  "KRONOS2R",
  "KRONOS3R",
  "ORIONIO",
  "ORIONLX",
  "ORIONLXM",
  "ORIONMX",
  "ORIONSX",
];

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
