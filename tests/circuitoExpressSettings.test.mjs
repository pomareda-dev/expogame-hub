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

// Settings saved before Circuit Express existed have no circuitoExpress entry.
const LEGACY_STORED_SETTINGS = {
  connectFour: { rows: 8, cols: 9, marginTop: 12 },
  catcher: { fallSpeed: 5, maxTime: 120 },
  memory: { padding: 24 },
};

test("the default Circuit Express round lasts 60 seconds", () => {
  const { DEFAULT_SETTINGS } = settingsModel;

  assert.deepEqual(DEFAULT_SETTINGS.circuitoExpress, { maxTime: 60 });
});

test("legacy stored settings keep every saved value and gain the 60 second default", () => {
  const { DEFAULT_SETTINGS, mergeStoredSettings } = settingsModel;
  const merged = mergeStoredSettings(structuredClone(LEGACY_STORED_SETTINGS));

  assert.deepEqual(merged.connectFour, LEGACY_STORED_SETTINGS.connectFour);
  assert.deepEqual(merged.catcher, LEGACY_STORED_SETTINGS.catcher);
  assert.deepEqual(merged.memory, LEGACY_STORED_SETTINGS.memory);
  assert.deepEqual(merged.circuitoExpress, {
    maxTime: DEFAULT_SETTINGS.circuitoExpress.maxTime,
  });
  assert.equal(merged.circuitoExpress.maxTime, 60);
  assert.equal(
    settingsModel.getCircuitoExpressRoundSeconds(merged),
    60,
  );
});

test("stored settings only fill in fields they actually changed", () => {
  const { DEFAULT_SETTINGS, mergeStoredSettings } = settingsModel;
  const merged = mergeStoredSettings({
    catcher: { maxTime: 45 },
    circuitoExpress: { maxTime: 90 },
  });

  assert.equal(merged.catcher.maxTime, 45);
  assert.equal(merged.catcher.fallSpeed, DEFAULT_SETTINGS.catcher.fallSpeed);
  assert.equal(merged.memory.padding, DEFAULT_SETTINGS.memory.padding);
  assert.equal(merged.circuitoExpress.maxTime, 90);
  assert.equal(settingsModel.getCircuitoExpressRoundSeconds(merged), 90);
});

test("unusable stored settings fall back to the full defaults", () => {
  const { DEFAULT_SETTINGS, mergeStoredSettings } = settingsModel;

  for (const stored of [undefined, null, "not json", 42, []]) {
    assert.deepEqual(mergeStoredSettings(stored), DEFAULT_SETTINGS);
  }

  assert.deepEqual(
    mergeStoredSettings({ circuitoExpress: "sixty" }).circuitoExpress,
    DEFAULT_SETTINGS.circuitoExpress,
  );
});

test("the configured round length falls back to 60 seconds when unusable", () => {
  const { getCircuitoExpressRoundSeconds } = settingsModel;

  assert.equal(getCircuitoExpressRoundSeconds({}), 60);
  assert.equal(
    getCircuitoExpressRoundSeconds({ circuitoExpress: { maxTime: NaN } }),
    60,
  );
  assert.equal(
    getCircuitoExpressRoundSeconds({ circuitoExpress: { maxTime: 0 } }),
    60,
  );
  assert.equal(
    getCircuitoExpressRoundSeconds({ circuitoExpress: { maxTime: -30 } }),
    60,
  );
  assert.equal(
    getCircuitoExpressRoundSeconds({ circuitoExpress: { maxTime: 180 } }),
    180,
  );
});
