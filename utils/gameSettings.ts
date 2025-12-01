import { useState, useEffect } from "react";

export interface ConnectFourSettings {
  rows: number;
  cols: number;
  marginTop: number;
}

export interface FlappyBirdSettings {
  birdSize: number;
  gravity: number;
  jumpStrength: number;
  obstacleWidth: number;
  obstacleGap: number;
  obstacleSpeed: number;
}

export interface CatcherGameSettings {
  fallSpeed: number;
  maxTime: number;
}

export interface MemoryGameSettings {
  padding: number;
}

export interface GameSettings {
  connectFour: ConnectFourSettings;
  flappyBird: FlappyBirdSettings;
  catcher: CatcherGameSettings;
  memory: MemoryGameSettings;
}

export const DEFAULT_SETTINGS: GameSettings = {
  connectFour: {
    rows: 6,
    cols: 7,
    marginTop: 0,
  },
  flappyBird: {
    birdSize: 20,
    gravity: 0.3,
    jumpStrength: -7.5,
    obstacleWidth: 60,
    obstacleGap: 220,
    obstacleSpeed: 2.5,
  },
  catcher: {
    fallSpeed: 3,
    maxTime: 60,
  },
  memory: {
    padding: 16,
  },
};

const STORAGE_KEY = "expogame_settings";

export const getStoredSettings = (): GameSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure new fields are present
      return {
        connectFour: { ...DEFAULT_SETTINGS.connectFour, ...parsed.connectFour },
        flappyBird: { ...DEFAULT_SETTINGS.flappyBird, ...parsed.flappyBird },
        catcher: { ...DEFAULT_SETTINGS.catcher, ...parsed.catcher },
        memory: { ...DEFAULT_SETTINGS.memory, ...parsed.memory },
      };
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
