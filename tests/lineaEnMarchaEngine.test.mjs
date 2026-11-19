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

test("every catalogued device carries a display name, not its image file name", () => {
  assert.ok(engine.NOVATECH_DEVICES.length > 0);

  for (const device of engine.NOVATECH_DEVICES) {
    assert.ok(engine.NOVATECH_DEVICE_IDS.includes(device.imageId));
    assert.ok(device.name.trim().length > 0);
    assert.notEqual(device.name, device.imageId);
  }
});

test("a station device id resolves to its catalogued display name", () => {
  const station = engine.createStation(2, 4, seededRandom(53));
  const catalogued = engine.NOVATECH_DEVICES.find(
    (device) => device.imageId === station.deviceId,
  );

  assert.equal(engine.getNovatechDeviceName(station.deviceId), catalogued.name);
  assert.equal(engine.getNovatechDeviceName("UNKNOWN-DEVICE"), "UNKNOWN-DEVICE");
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

test("travel seconds stay bounded and never increase across levels", () => {
  let previous = Infinity;
  for (let level = 1; level <= 100; level += 1) {
    const travel = engine.getStationTravelSeconds(level);
    assert.ok(travel >= engine.MIN_STATION_TRAVEL_SECONDS && travel <= 8);
    assert.ok(travel <= previous);
    previous = travel;
  }
  assert.equal(
    engine.getStationTravelSeconds(1000),
    engine.MIN_STATION_TRAVEL_SECONDS,
  );
});

test("distractor count boundaries follow levels", () => {
  assert.equal(engine.getDistractorCount(1), 0);
  assert.equal(engine.getDistractorCount(2), 0);
  assert.equal(engine.getDistractorCount(3), 1);
  assert.equal(engine.getDistractorCount(4), 1);
  assert.equal(engine.getDistractorCount(5), 2);
  assert.equal(engine.getDistractorCount(100), 2);
});

test("wrong, distractor, duplicate and post-complete taps return the same station reference", () => {
  const station = engine.createStation(3, 1, seededRandom(7));
  for (const wrong of ["manual", "battery", "actuator", "controller"]) {
    assert.strictEqual(engine.placeStationPiece(station, wrong), station);
  }
  let current = engine.placeStationPiece(station, "sensor");
  assert.strictEqual(engine.placeStationPiece(current, "sensor"), current);
  current = engine.placeStationPiece(current, "controller");
  current = engine.placeStationPiece(current, "actuator");
  assert.equal(engine.isStationComplete(current), true);
  assert.strictEqual(engine.placeStationPiece(current, "sensor"), current);
});

test("penalties clamp to the health band and ignore negative penalties", () => {
  assert.equal(engine.applyPenalty(150, 20), 100);
  assert.equal(engine.applyPenalty(100, -5), 100);
  assert.equal(engine.applyPenalty(7, 10), 0);
});
