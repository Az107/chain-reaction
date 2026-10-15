import { DEFAULT_OPTIONS, MAX_PLAYERS, MAX_SIZE, MIN_PLAYERS, MIN_SIZE } from './config';
import type { NewGameOptions } from './engine/game';
import type { GameState } from './engine/types';

const GAME_KEY = 'chain-reaction:game:v1';
const SETTINGS_KEY = 'chain-reaction:settings:v1';

export interface LastMove {
  r: number;
  c: number;
}

export interface Persisted {
  state: GameState;
  lastMove: LastMove | null;
}

function isValidState(s: unknown): s is GameState {
  if (!s || typeof s !== 'object') return false;
  const g = s as GameState;
  if (!Number.isInteger(g.rows) || !Number.isInteger(g.cols) || g.rows < 2 || g.cols < 2) return false;
  if (!Array.isArray(g.board) || g.board.length !== g.rows) return false;
  if (!g.board.every((row) => Array.isArray(row) && row.length === g.cols)) return false;
  if (!Array.isArray(g.players) || g.players.length < 2) return false;
  return true;
}

export function saveGame(p: Persisted | null): void {
  try {
    if (p === null) {
      localStorage.removeItem(GAME_KEY);
    } else {
      localStorage.setItem(GAME_KEY, JSON.stringify(p));
    }
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

export function loadGame(): Persisted | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!isValidState(parsed.state)) return null;
    return { state: parsed.state, lastMove: parsed.lastMove ?? null };
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function saveSettings(options: NewGameOptions): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(options));
  } catch {
    /* ignore */
  }
}

export function loadSettings(): NewGameOptions {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_OPTIONS;
    const o = JSON.parse(raw) as Partial<NewGameOptions>;
    return {
      rows: clamp(Math.round(Number(o.rows) || DEFAULT_OPTIONS.rows), MIN_SIZE, MAX_SIZE),
      cols: clamp(Math.round(Number(o.cols) || DEFAULT_OPTIONS.cols), MIN_SIZE, MAX_SIZE),
      playerCount: clamp(
        Math.round(Number(o.playerCount) || DEFAULT_OPTIONS.playerCount),
        MIN_PLAYERS,
        MAX_PLAYERS,
      ),
    };
  } catch {
    return DEFAULT_OPTIONS;
  }
}
