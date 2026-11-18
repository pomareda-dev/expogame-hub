import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../utils/gameSettingsModel.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const settingsModel = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

// Settings saved before Production Line existed have no lineaEnMarcha entry.
const LEGACY_STORED_SETTINGS = {
  connectFour: { rows: 8, cols: 9, marginTop: 12 },
  catcher: { fallSpeed: 5, maxTime: 120 },
  memory: { padding: 24 },
  circuitoExpress: { maxTime: 45 },
};

test("the default Production Line round lasts 60 seconds", () => {
  const { DEFAULT_SETTINGS } = settingsModel;

  assert.deepEqual(DEFAULT_SETTINGS.lineaEnMarcha, { maxTime: 60 });
});

test("legacy stored settings keep every saved value and gain the 60 second default", () => {
  const { DEFAULT_SETTINGS, mergeStoredSettings } = settingsModel;
  const merged = mergeStoredSettings(structuredClone(LEGACY_STORED_SETTINGS));

  assert.deepEqual(merged.connectFour, LEGACY_STORED_SETTINGS.connectFour);
  assert.deepEqual(merged.catcher, LEGACY_STORED_SETTINGS.catcher);
  assert.deepEqual(merged.memory, LEGACY_STORED_SETTINGS.memory);
  assert.deepEqual(merged.circuitoExpress, LEGACY_STORED_SETTINGS.circuitoExpress);
  assert.deepEqual(merged.lineaEnMarcha, {
    maxTime: DEFAULT_SETTINGS.lineaEnMarcha.maxTime,
  });
  assert.equal(merged.lineaEnMarcha.maxTime, 60);
  assert.equal(settingsModel.getLineaEnMarchaRoundSeconds(merged), 60);
});

test("stored settings only fill in fields they actually changed", () => {
  const { DEFAULT_SETTINGS, mergeStoredSettings } = settingsModel;
  const merged = mergeStoredSettings({
    catcher: { maxTime: 45 },
    circuitoExpress: { maxTime: 90 },
    lineaEnMarcha: { maxTime: 100 },
  });

  assert.equal(merged.catcher.maxTime, 45);
  assert.equal(merged.catcher.fallSpeed, DEFAULT_SETTINGS.catcher.fallSpeed);
  assert.equal(merged.memory.padding, DEFAULT_SETTINGS.memory.padding);
  assert.equal(merged.circuitoExpress.maxTime, 90);
  assert.equal(merged.lineaEnMarcha.maxTime, 100);
  assert.equal(settingsModel.getLineaEnMarchaRoundSeconds(merged), 100);
});

test("unusable stored settings fall back to the full defaults", () => {
  const { DEFAULT_SETTINGS, mergeStoredSettings } = settingsModel;

  for (const stored of [undefined, null, "not json", 42, []]) {
    assert.deepEqual(mergeStoredSettings(stored), DEFAULT_SETTINGS);
  }

  assert.deepEqual(
    mergeStoredSettings({ lineaEnMarcha: "sixty" }).lineaEnMarcha,
    DEFAULT_SETTINGS.lineaEnMarcha,
  );
});

test("the configured round length falls back to 60 seconds when unusable", () => {
  const { getLineaEnMarchaRoundSeconds } = settingsModel;

  assert.equal(getLineaEnMarchaRoundSeconds({}), 60);
  assert.equal(
    getLineaEnMarchaRoundSeconds({ lineaEnMarcha: { maxTime: NaN } }),
    60,
  );
  assert.equal(
    getLineaEnMarchaRoundSeconds({ lineaEnMarcha: { maxTime: 0 } }),
    60,
  );
  assert.equal(
    getLineaEnMarchaRoundSeconds({ lineaEnMarcha: { maxTime: -30 } }),
    60,
  );
});

test("the configured round length rounds and rejects non-finite or non-numeric values", () => {
  assert.equal(settingsModel.getLineaEnMarchaRoundSeconds({ lineaEnMarcha: { maxTime: 2.6 } }), 3);
  assert.equal(settingsModel.getLineaEnMarchaRoundSeconds({ lineaEnMarcha: { maxTime: Infinity } }), 60);
  assert.equal(settingsModel.getLineaEnMarchaRoundSeconds({ lineaEnMarcha: { maxTime: "40" } }), 60);
  assert.equal(settingsModel.getLineaEnMarchaRoundSeconds({ lineaEnMarcha: null }), 60);
});

test("a positive fractional max time under half a second falls back to the default", () => {
  const { getLineaEnMarchaRoundSeconds } = settingsModel;

  assert.equal(
    getLineaEnMarchaRoundSeconds({ lineaEnMarcha: { maxTime: 0.4 } }),
    60,
  );
  assert.equal(
    getLineaEnMarchaRoundSeconds({ lineaEnMarcha: { maxTime: 0.49 } }),
    60,
  );
});
