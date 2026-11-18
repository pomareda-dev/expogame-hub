import { useState, useEffect } from "react";
import {
  DEFAULT_SETTINGS,
  mergeStoredSettings,
  type GameSettings,
} from "./gameSettingsModel";

export {
  CIRCUITO_EXPRESS_DEFAULT_MAX_TIME,
  DEFAULT_SETTINGS,
  LINEA_EN_MARCHA_DEFAULT_MAX_TIME,
  getCircuitoExpressRoundSeconds,
  getLineaEnMarchaRoundSeconds,
  mergeStoredSettings,
} from "./gameSettingsModel";
export type {
  CatcherGameSettings,
  CircuitoExpressSettings,
  ConnectFourSettings,
  GameSettings,
  LineaEnMarchaSettings,
  MemoryGameSettings,
} from "./gameSettingsModel";

const STORAGE_KEY = "expogame_settings";

export const getStoredSettings = (): GameSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure new fields are present
      return mergeStoredSettings(parsed);
    }
  } catch (e) {
    console.error("Failed to load settings", e);
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: GameSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Dispatch a custom event so components can react immediately if needed
    window.dispatchEvent(new Event("settings-changed"));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
};

export const useGameSettings = () => {
  const [settings, setSettings] = useState<GameSettings>(getStoredSettings());

  useEffect(() => {
    const handleStorageChange = () => {
      setSettings(getStoredSettings());
    };

    window.addEventListener("settings-changed", handleStorageChange);
    // Also listen to storage event for cross-tab sync
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("settings-changed", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const updateSettings = (newSettings: GameSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  };

  const resetSettings = () => {
    updateSettings(DEFAULT_SETTINGS);
  };

  return { settings, updateSettings, resetSettings };
};
