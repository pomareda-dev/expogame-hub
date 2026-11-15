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

/** The engine keeps a random source on the round; never compare functions. */
const stripRandom = ({ random, ...rest }) => rest;

/** Ship the current station and advance the line, asserting the tap events. */
const assembleAndAdvance = (round, nowMs) => {
  let current = round;
  for (const [index, piece] of engine.AUTOMATION_SEQUENCE.entries()) {
    const result = engine.tapPiece(current, piece);
    assert.equal(
      result.event,
      index === engine.AUTOMATION_SEQUENCE.length - 1 ? "shipped" : "placed",
    );
    current = result.round;
  }
  return engine.advanceShip(current, nowMs);
};

const START = 1_000_000;
const TRAVEL_MS = engine.getStationTravelSeconds
  ? engine.getStationTravelSeconds(1) * 1000
  : 8000;

test("round constants match the shipped game tuning", () => {
  assert.equal(engine.SHIP_PAUSE_MS, 600);
  assert.equal(engine.STATIONS_PER_LEVEL, 3);
});

test("createRound initializes the whole round contract", () => {
  const round = engine.createRound(START, 60, seededRandom(5));

  assert.equal(round.status, "PLAYING");
  assert.equal(round.level, 1);
  assert.equal(round.score, 0);
  assert.equal(round.health, engine.getInitialHealth());
  assert.equal(round.health, 100);
  assert.equal(round.stationsShipped, 0);
  assert.equal(round.missedStations, 0);
  assert.equal(round.shipping, false);
  assert.equal(round.endedReason, null);
  assert.equal(round.roundDeadlineMs, START + 60_000);

  assert.equal(round.station.id, 1);
  assert.deepEqual(round.station, engine.createStation(1, 1, seededRandom(5)));
  assert.equal(round.stationTravelMs, TRAVEL_MS);
  assert.equal(round.stationDeadlineMs, START + TRAVEL_MS);
  assert.equal(round.stationProgress, 0);
});

test("createRound is repeatable for a seeded random source", () => {
  assert.deepEqual(
    stripRandom(engine.createRound(START, 45, seededRandom(83))),
    stripRandom(engine.createRound(START, 45, seededRandom(83))),
  );
});

test("tickRound returns the same reference when nothing changed", () => {
  const round = engine.createRound(START, 60, seededRandom(7));
  const ticked = engine.tickRound(round, START + 1000);

  assert.notStrictEqual(ticked, round);
  assert.strictEqual(engine.tickRound(ticked, START + 1000), ticked);
});

test("tickRound only updates travel progress while the station travels", () => {
  const round = engine.createRound(START, 60, seededRandom(11));
  const half = engine.tickRound(round, START + TRAVEL_MS / 2);

  assert.equal(half.stationProgress, 0.5);
  assert.strictEqual(half.station, round.station);
  assert.equal(half.health, 100);
  assert.equal(half.missedStations, 0);
  assert.equal(half.stationsShipped, 0);
  assert.equal(half.status, "PLAYING");
});

test("a missed station costs health, spawns the next station and resets progress", () => {
  const round = engine.createRound(START, 60, seededRandom(97));
  const missed = engine.tickRound(round, START + TRAVEL_MS);

  assert.equal(missed.status, "PLAYING");
  assert.equal(missed.missedStations, 1);
  assert.equal(missed.health, 80);
  assert.equal(missed.level, 1);
  assert.equal(missed.station.id, 2);
  assert.equal(missed.station.placedCount, 0);
  assert.equal(missed.stationProgress, 0);
  assert.equal(missed.stationTravelMs, TRAVEL_MS);
  assert.equal(missed.stationDeadlineMs, START + TRAVEL_MS + TRAVEL_MS);

  const other = engine.tickRound(
    engine.createRound(START, 60, seededRandom(97)),
    START + TRAVEL_MS,
  );
  assert.deepEqual(stripRandom(missed), stripRandom(other));
  assert.deepEqual(missed.station, other.station);
});

test("a missed station at 20 health ends the round with the health reason", () => {
  let round = engine.createRound(START, 600, seededRandom(101));
  for (let i = 0; i < 8; i += 1) {
    const result = engine.tapPiece(round, "manual");
    assert.equal(result.event, "rejected");
    round = result.round;
  }
  assert.equal(round.health, 20);

  const ended = engine.tickRound(round, START + TRAVEL_MS);
  assert.equal(ended.status, "GAME_OVER");
  assert.equal(ended.endedReason, "health");
  assert.equal(ended.health, 0);
  assert.equal(ended.missedStations, 1);
  assert.equal(ended.stationDeadlineMs, 0);
  // The missed station stays visible behind the game over screen.
  assert.deepEqual(ended.station, round.station);
});

test("the round deadline ends the run even while a station is mid-travel", () => {
  const round = engine.createRound(START, 5, seededRandom(103));
  const ended = engine.tickRound(round, START + 5000);

  assert.equal(ended.status, "GAME_OVER");
  assert.equal(ended.endedReason, "time");
  assert.equal(ended.health, 100);
  assert.deepEqual(ended.station, round.station);
});

test("the round deadline clears a pending ship pause", () => {
  const round = engine.createRound(START, 5, seededRandom(107));
  let shipped = round;
  for (const piece of engine.AUTOMATION_SEQUENCE) {
    shipped = engine.tapPiece(shipped, piece).round;
  }
  assert.equal(shipped.shipping, true);

  const ended = engine.tickRound(shipped, START + 5000);
  assert.equal(ended.status, "GAME_OVER");
  assert.equal(ended.endedReason, "time");
  assert.equal(ended.shipping, false);
  assert.deepEqual(ended.station, shipped.station);
});

test("the correct order is placed, placed, shipped and scores the station", () => {
  const round = engine.createRound(START, 60, seededRandom(109));

  const first = engine.tapPiece(round, "sensor");
  assert.equal(first.event, "placed");
  assert.equal(first.round.station.placedCount, 1);
  assert.equal(first.round.health, 100);
  assert.equal(first.round.score, 0);

  const second = engine.tapPiece(first.round, "controller");
  assert.equal(second.event, "placed");
  assert.equal(second.round.station.placedCount, 2);

  const third = engine.tapPiece(second.round, "actuator");
  assert.equal(third.event, "shipped");
  assert.equal(engine.isStationComplete(third.round.station), true);
  assert.equal(third.round.score, engine.getStationScore(1));
  assert.equal(third.round.score, 50);
  assert.equal(third.round.stationsShipped, 1);
  assert.equal(third.round.shipping, true);
  assert.equal(third.round.status, "PLAYING");
  assert.equal(third.round.health, 100);

  const duringShip = engine.tapPiece(third.round, "sensor");
  assert.equal(duringShip.event, "rejected");
  assert.strictEqual(duringShip.round, third.round);
});

test("a distractor tap is rejected, costs 10 health and keeps the station", () => {
  const round = engine.createRound(START, 60, seededRandom(113));
  const rejected = engine.tapPiece(round, "manual");

  assert.equal(rejected.event, "rejected");
  assert.notStrictEqual(rejected.round, round);
  assert.strictEqual(rejected.round.station, round.station);
  assert.equal(rejected.round.health, 90);
  assert.equal(rejected.round.station.placedCount, 0);
  assert.equal(rejected.round.score, 0);
  assert.equal(rejected.round.status, "PLAYING");
});

test("an out of order sequence piece is rejected with the same station", () => {
  const round = engine.createRound(START, 60, seededRandom(127));
  const rejected = engine.tapPiece(round, "actuator");

  assert.equal(rejected.event, "rejected");
  assert.strictEqual(rejected.round.station, round.station);
  assert.equal(rejected.round.health, 90);
});

test("a wrong tap at 10 health is rejected and ends the round", () => {
  let round = engine.createRound(START, 60, seededRandom(131));
  for (let i = 0; i < 9; i += 1) {
    round = engine.tapPiece(round, "battery").round;
  }
  assert.equal(round.health, 10);
  assert.equal(round.status, "PLAYING");

  const ended = engine.tapPiece(round, "battery");
  assert.equal(ended.event, "rejected");
  assert.equal(ended.round.status, "GAME_OVER");
  assert.equal(ended.round.endedReason, "health");
  assert.equal(ended.round.health, 0);
  assert.strictEqual(ended.round.station, round.station);
});

test("advanceShip levels up every third shipped station", () => {
  let now = START + 500;
  let round = engine.createRound(START, 600, seededRandom(137));

  round = assembleAndAdvance(round, now);
  assert.equal(round.level, 1);
  assert.equal(round.stationsShipped, 1);
  assert.equal(round.shipping, false);
  assert.equal(round.station.id, 2);
  assert.equal(round.stationProgress, 0);

  now += 500;
  round = assembleAndAdvance(round, now);
  assert.equal(round.level, 1);
  assert.equal(round.stationsShipped, 2);
  assert.equal(round.station.id, 3);

  now += 500;
  round = assembleAndAdvance(round, now);
  assert.equal(round.level, 2);
  assert.equal(round.stationsShipped, 3);
  assert.equal(round.station.id, 4);
  assert.equal(round.stationTravelMs, engine.getStationTravelSeconds(2) * 1000);
  assert.equal(
    round.stationDeadlineMs,
    now + engine.getStationTravelSeconds(2) * 1000,
  );
  assert.equal(round.stationProgress, 0);
  assert.equal(
    round.station.pieces.length,
    engine.AUTOMATION_SEQUENCE.length + engine.getDistractorCount(2),
  );
});

test("advanceShip never advances past the round deadline", () => {
  const round = engine.createRound(START, 1, seededRandom(139));
  let shipped = round;
  for (const piece of engine.AUTOMATION_SEQUENCE) {
    shipped = engine.tapPiece(shipped, piece).round;
  }
  const station = shipped.station;

  const late = engine.advanceShip(shipped, START + 1000);
  assert.notStrictEqual(late, shipped);
  assert.equal(late.shipping, false);
  assert.strictEqual(late.station, station);
  assert.equal(late.level, shipped.level);
  assert.equal(late.stationsShipped, shipped.stationsShipped);
});

test("advanceShip is a no-op unless the round is playing and shipping", () => {
  const round = engine.createRound(START, 60, seededRandom(149));
  assert.strictEqual(engine.advanceShip(round, START + 100), round);

  const over = engine.tickRound(round, START + 60_000);
  assert.strictEqual(over.status, "GAME_OVER");
  assert.strictEqual(engine.advanceShip(over, START + 60_100), over);
});

test("getRoundSecondsLeft ceils the remaining time and clamps at zero", () => {
  const round = engine.createRound(START, 60, seededRandom(151));

  assert.equal(engine.getRoundSecondsLeft(round, START), 60);
  assert.equal(engine.getRoundSecondsLeft(round, START + 59_500), 1);
  assert.equal(engine.getRoundSecondsLeft(round, START + 59_999), 1);
  assert.equal(engine.getRoundSecondsLeft(round, START + 60_000), 0);
  assert.equal(engine.getRoundSecondsLeft(round, START + 120_000), 0);
});

test("tickRound and tapPiece are inert once the round is over", () => {
  const round = engine.createRound(START, 1, seededRandom(157));
  const over = engine.tickRound(round, START + 1000);
  assert.equal(over.status, "GAME_OVER");

  assert.strictEqual(engine.tickRound(over, START + 2000), over);

  const tap = engine.tapPiece(over, "sensor");
  assert.equal(tap.event, "rejected");
  assert.strictEqual(tap.round, over);
});

test("tapPiece is inert without a station", () => {
  const round = {
    ...engine.createRound(START, 60, seededRandom(163)),
    station: null,
  };

  const result = engine.tapPiece(round, "sensor");
  assert.equal(result.event, "rejected");
  assert.strictEqual(result.round, round);
});
