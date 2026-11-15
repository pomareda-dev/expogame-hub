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

export interface CircuitoExpressSettings {
  maxTime: number;
}

export interface LineaEnMarchaSettings {
  maxTime: number;
}

export interface GameSettings {
  connectFour: ConnectFourSettings;
  flappyBird: FlappyBirdSettings;
  catcher: CatcherGameSettings;
  memory: MemoryGameSettings;
  circuitoExpress: CircuitoExpressSettings;
  lineaEnMarcha: LineaEnMarchaSettings;
}

export const CIRCUITO_EXPRESS_DEFAULT_MAX_TIME = 60;
export const LINEA_EN_MARCHA_DEFAULT_MAX_TIME = 60;

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
  circuitoExpress: {
    maxTime: CIRCUITO_EXPRESS_DEFAULT_MAX_TIME,
  },
  lineaEnMarcha: {
    maxTime: LINEA_EN_MARCHA_DEFAULT_MAX_TIME,
  },
};

const isSection = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeSection = <T extends object>(defaults: T, stored: unknown): T => {
  if (!isSection(stored)) return { ...defaults };
  return { ...defaults, ...stored } as T;
};

/**
 * Merge persisted settings with the current defaults so saved data from an
 * older release keeps its values while gaining fields added since then.
 */
export const mergeStoredSettings = (stored: unknown): GameSettings => {
  const parsed = isSection(stored) ? stored : {};

  return {
    connectFour: mergeSection(DEFAULT_SETTINGS.connectFour, parsed.connectFour),
    flappyBird: mergeSection(DEFAULT_SETTINGS.flappyBird, parsed.flappyBird),
    catcher: mergeSection(DEFAULT_SETTINGS.catcher, parsed.catcher),
    memory: mergeSection(DEFAULT_SETTINGS.memory, parsed.memory),
    circuitoExpress: mergeSection(
      DEFAULT_SETTINGS.circuitoExpress,
      parsed.circuitoExpress,
    ),
    lineaEnMarcha: mergeSection(DEFAULT_SETTINGS.lineaEnMarcha, parsed.lineaEnMarcha),
  };
};

/** Round length in seconds for Circuito Express, falling back to the default. */
export const getCircuitoExpressRoundSeconds = (settings: {
  circuitoExpress?: { maxTime?: number };
}): number => {
  const maxTime = settings?.circuitoExpress?.maxTime;
  return typeof maxTime === "number" && Number.isFinite(maxTime) && maxTime > 0
    ? Math.round(maxTime)
    : CIRCUITO_EXPRESS_DEFAULT_MAX_TIME;
};

/** Round length in seconds for Línea en Marcha, falling back to the default. */
export const getLineaEnMarchaRoundSeconds = (settings: {
  lineaEnMarcha?: { maxTime?: number };
}): number => {
  const maxTime = settings?.lineaEnMarcha?.maxTime;
  // Round first so a positive fraction under 0.5 cannot become a zero-second round.
  const roundedSeconds =
    typeof maxTime === "number" && Number.isFinite(maxTime)
      ? Math.round(maxTime)
      : 0;
  return roundedSeconds > 0 ? roundedSeconds : LINEA_EN_MARCHA_DEFAULT_MAX_TIME;
};
