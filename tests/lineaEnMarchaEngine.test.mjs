import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../games/lineaEnMarchaEngine.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const engine = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const seededRandom = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

test("the automation sequence is always sensor, controller, actuator", () => {
  assert.deepEqual(engine.AUTOMATION_SEQUENCE, [
    "sensor",
    "controller",
    "actuator",
  ]);
});

test("station generation is repeatable for a seeded random source", () => {
  assert.deepEqual(
    engine.createStation(1, 1, seededRandom(17)),
    engine.createStation(1, 1, seededRandom(17)),
  );
});

test("a station starts unfinished and only completes in the documented order", () => {
  const random = seededRandom(29);
  let station = engine.createStation(3, 7, random);

  assert.equal(engine.isStationComplete(station), false);
  assert.equal(engine.isStationPiecePlaced(station, "controller"), false);

  for (const piece of engine.AUTOMATION_SEQUENCE) {
    assert.equal(engine.isStationPiecePlaced(station, piece), false);
    station = engine.placeStationPiece(station, piece);
  }

  assert.equal(engine.isStationComplete(station), true);
  for (const piece of engine.AUTOMATION_SEQUENCE) {
    assert.equal(engine.isStationPiecePlaced(station, piece), true);
  }
});

test("placing pieces out of order never advances the station", () => {
  const random = seededRandom(41);
  const station = engine.createStation(1, 2, random);

  const wrongAttempts = engine.placeStationPiece(station, "actuator");
  assert.equal(engine.isStationComplete(wrongAttempts), false);

  const stillWrong = engine.placeStationPiece(wrongAttempts, "controller");
  assert.equal(engine.isStationComplete(stillWrong), false);
  assert.equal(stillWrong.placedCount, 0);
});

test("distractor pieces never match any slot of the sequence", () => {
  const random = seededRandom(53);
  let station = engine.createStation(5, 9, random);

  // Advance every sequence slot while trying the distractor first.
  for (const piece of engine.AUTOMATION_SEQUENCE) {
    const afterDistractor = engine.placeStationPiece(station, "manual");
    assert.equal(afterDistractor.placedCount, station.placedCount);

    station = engine.placeStationPiece(station, piece);
  }

  assert.equal(engine.isStationComplete(station), true);
});

test("stations carry a Novatech device image id from the known catalog", () => {
  const random = seededRandom(71);
  const station = engine.createStation(2, 4, random);

  assert.ok(engine.NOVATECH_DEVICE_IDS.includes(station.deviceId));
  assert.ok(station.deviceId.length > 0);
});

test("higher levels are never slower and stay within the speed bounds", () => {
  const firstLevel = engine.getStationTravelSeconds(1);
  const highLevel = engine.getStationTravelSeconds(8);

  assert.ok(firstLevel > 0);
  assert.ok(highLevel <= firstLevel);
  assert.ok(highLevel >= engine.MIN_STATION_TRAVEL_SECONDS);
});

test("health penalties clamp to zero and never go negative", () => {
  const full = engine.getInitialHealth();

  assert.equal(engine.applyPenalty(full, engine.WRONG_TAP_PENALTY), full - engine.WRONG_TAP_PENALTY);
  assert.equal(engine.applyPenalty(5, engine.MISSED_STATION_PENALTY), 0);
  assert.equal(engine.applyPenalty(0, engine.WRONG_TAP_PENALTY), 0);
});

test("a round should end early only when the line health is exhausted", () => {
  assert.equal(engine.shouldEndRound(engine.getInitialHealth()), false);
  assert.equal(engine.shouldEndRound(1), false);
  assert.equal(engine.shouldEndRound(0), true);
});
