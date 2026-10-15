import { createGame } from './engine/game';
import type { NewGameOptions, PlayerSpec } from './engine/game';
import type { GameState } from './engine/types';

/** Colourblind-conscious palette; every orb also shows its count as a number. */
export const PLAYER_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#a16207', // bronze
];

export const PLAYER_NAMES = ['Red', 'Blue', 'Green', 'Amber', 'Violet', 'Pink', 'Cyan', 'Bronze'];

export const MIN_SIZE = 5;
export const MAX_SIZE = 12;
export const DEFAULT_SIZE = 6;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const DEFAULT_PLAYERS = 2;

export const DEFAULT_OPTIONS: NewGameOptions = {
  rows: DEFAULT_SIZE,
  cols: DEFAULT_SIZE,
  playerCount: DEFAULT_PLAYERS,
};

export function specsFor(count: number): PlayerSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: PLAYER_NAMES[i] ?? `Player ${i + 1}`,
    color: PLAYER_COLORS[i] ?? '#94a3b8',
  }));
}

export function newGameFromOptions(options: NewGameOptions): GameState {
  return createGame(options.rows, options.cols, specsFor(options.playerCount));
}
