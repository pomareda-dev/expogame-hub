import { ReactNode } from "react";

export enum GameRoute {
  HOME = "/",
  CONNECT_FOUR = "/connect-four",
  MEMORY = "/memory",
  CATCHER = "/catcher",
  CIRCUITO_EXPRESS = "/circuit-express",
  LINEA_EN_MARCHA = "/production-line",
}

export interface GameConfig {
  id: string;
  name: string;
  route: GameRoute;
  icon: ReactNode;
  color: string;
  description: string;
}

export type GameStatus = "IDLE" | "PLAYING" | "GAME_OVER" | "VICTORY";
