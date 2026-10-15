import { cloneBoard, createBoard, orbsByPlayer } from './board';
import { resolve } from './resolve';
import type { Board, GameState, Player, PlayerId, Wave } from './types';

export interface PlayerSpec {
  id: PlayerId;
  name: string;
  color: string;
}

export interface NewGameOptions {
  rows: number;
  cols: number;
  playerCount: number;
}

export function createGame(rows: number, cols: number, specs: PlayerSpec[]): GameState {
  if (specs.length < 2) throw new Error('Need at least 2 players');
  const players: Player[] = specs.map((s) => ({ ...s, alive: true, hasMoved: false }));
  return {
    rows,
    cols,
    board: createBoard(rows, cols),
    players,
    current: players[0].id,
    phase: 'playing',
    winner: null,
    moveCount: 0,
  };
}

/** Legal = in bounds, playing, and either an empty cell or one you own. */
export function isLegal(state: GameState, r: number, c: number): boolean {
  if (state.phase !== 'playing') return false;
  if (r < 0 || c < 0 || r >= state.rows || c >= state.cols) return false;
  const cell = state.board[r][c];
  return cell.owner === null || cell.owner === state.current;
}

export function livingPlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}

export function orbsOf(state: GameState, id: PlayerId): number {
  return orbsByPlayer(state.board)[id] ?? 0;
}

/**
 * Place the current player's orb and fully resolve the cascade.
 *
 * Returns the settled state plus every wave, so the UI can animate the
 * simultaneous explosions without re-deriving anything.
 */
export function applyMove(state: GameState, r: number, c: number): { state: GameState; waves: Wave[] } {
  if (!isLegal(state, r, c)) {
    throw new Error(`Illegal move at (${r}, ${c})`);
  }

  const board = cloneBoard(state.board);
  board[r][c] = { owner: state.current, count: board[r][c].count + 1 };

  // Mark the mover. A player who has moved and now holds zero orbs is out; one
  // who has not moved yet is still in the game even with nothing on the board.
  const players: Player[] = state.players.map((p) =>
    p.id === state.current ? { ...p, hasMoved: true } : { ...p },
  );

  // Stop the cascade as soon as the game is decided. Without this, a saturated
  // board can cascade forever and never stabilise.
  const stopWhen = (b: Board): boolean => {
    const counts = orbsByPlayer(b);
    let inGame = 0;
    for (const p of players) {
      if (!p.alive) continue;
      if (!p.hasMoved || (counts[p.id] ?? 0) > 0) {
        inGame++;
        if (inGame > 1) return false;
      }
    }
    return true;
  };

  const { board: settled, waves } = resolve(board, { stopWhen });

  const counts = orbsByPlayer(settled);
  for (const p of players) {
    if (p.alive && p.hasMoved && (counts[p.id] ?? 0) === 0) p.alive = false;
  }

  const living = players.filter((p) => p.alive);
  const phase: GameState['phase'] = living.length <= 1 ? 'over' : 'playing';
  const winner: PlayerId | null = phase === 'over' && living.length === 1 ? living[0].id : null;

  let current = state.current;
  if (phase === 'playing') {
    const idx = players.findIndex((p) => p.id === state.current);
    for (let i = 1; i <= players.length; i++) {
      const candidate = players[(idx + i) % players.length];
      if (candidate.alive) {
        current = candidate.id;
        break;
      }
    }
  }

  return {
    state: { ...state, board: settled, players, current, phase, winner, moveCount: state.moveCount + 1 },
    waves,
  };
}
