import { describe, expect, it } from 'vitest';
import { createBoard, totalOrbs } from './board';
import { applyMove, createGame, isLegal, livingPlayers, orbsOf } from './game';
import type { GameState, Player } from './types';

const SPECS = [
  { id: 0, name: 'Red', color: '#ef4444' },
  { id: 1, name: 'Blue', color: '#3b82f6' },
  { id: 2, name: 'Green', color: '#22c55e' },
];

function player(id: number, hasMoved: boolean, alive = true): Player {
  return { id, name: `P${id}`, color: '#fff', alive, hasMoved };
}

describe('createGame', () => {
  it('starts empty with the first player to move', () => {
    const g = createGame(5, 5, SPECS);
    expect(g.current).toBe(0);
    expect(g.phase).toBe('playing');
    expect(g.winner).toBeNull();
    expect(totalOrbs(g.board)).toBe(0);
    expect(g.players.every((p) => p.alive && !p.hasMoved)).toBe(true);
  });
});

describe('isLegal', () => {
  it('allows empty cells and your own cells, not opponents', () => {
    const g = createGame(5, 5, SPECS);
    expect(isLegal(g, 2, 2)).toBe(true);
    const { state } = applyMove(g, 2, 2); // player 0 owns (2,2), now player 1 to move
    expect(state.current).toBe(1);
    expect(isLegal(state, 2, 2)).toBe(false);
    expect(isLegal(state, 0, 0)).toBe(true);
  });

  it('rejects out-of-bounds and post-game moves', () => {
    const g = createGame(5, 5, SPECS);
    expect(isLegal(g, -1, 0)).toBe(false);
    expect(isLegal(g, 5, 0)).toBe(false);
    expect(isLegal({ ...g, phase: 'over' }, 1, 1)).toBe(false);
  });
});

describe('applyMove', () => {
  it('places an orb and passes the turn', () => {
    const g = createGame(5, 5, SPECS);
    const { state, waves } = applyMove(g, 0, 0);
    expect(waves).toHaveLength(0);
    expect(state.board[0][0]).toEqual({ owner: 0, count: 1 });
    expect(state.current).toBe(1);
    expect(state.moveCount).toBe(1);
  });

  it('does not eliminate players who have not taken a turn yet', () => {
    const g = createGame(5, 5, SPECS);
    const { state } = applyMove(g, 0, 0);
    // Player 1 and 2 hold zero orbs but must NOT be out yet.
    expect(livingPlayers(state).map((p) => p.id)).toEqual([0, 1, 2]);
    expect(state.phase).toBe('playing');
  });

  it('throws on an illegal move', () => {
    const g = createGame(5, 5, SPECS);
    expect(() => applyMove(g, -1, -1)).toThrow(/Illegal/);
  });
});

describe('elimination', () => {
  it('ends the game when a player captures the last opponent orb', () => {
    const b = createBoard(3, 3);
    b[0][0] = { owner: 1, count: 1 };
    b[0][1] = { owner: 0, count: 3 };
    const state: GameState = {
      rows: 3,
      cols: 3,
      board: b,
      players: [player(0, true), player(1, true)],
      current: 0,
      phase: 'playing',
      winner: null,
      moveCount: 2,
    };
    const { state: after } = applyMove(state, 0, 1);
    expect(after.phase).toBe('over');
    expect(after.winner).toBe(0);
    expect(after.players.find((p) => p.id === 1)?.alive).toBe(false);
    expect(orbsOf(after, 1)).toBe(0);
  });

  it('skips an eliminated player and hands the turn to the next living one', () => {
    const b = createBoard(3, 3);
    b[2][1] = { owner: 0, count: 3 };
    b[2][2] = { owner: 1, count: 1 };
    b[0][0] = { owner: 2, count: 1 };
    const state: GameState = {
      rows: 3,
      cols: 3,
      board: b,
      players: [player(0, true), player(1, true), player(2, true)],
      current: 0,
      phase: 'playing',
      winner: null,
      moveCount: 3,
    };
    const { state: after } = applyMove(state, 2, 1);
    expect(after.players.find((p) => p.id === 1)?.alive).toBe(false);
    expect(livingPlayers(after).map((p) => p.id)).toEqual([0, 2]);
    expect(after.current).toBe(2); // skipped the eliminated player 1
    expect(after.phase).toBe('playing');
  });
});

/** Deterministic RNG so failures are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('saturated boards', () => {
  it('always reaches a winner instead of cascading forever', () => {
    const rand = mulberry32(7);
    for (let g = 0; g < 12; g++) {
      let state = createGame(5, 5, SPECS.slice(0, 2));
      let moves = 0;

      while (state.phase === 'playing' && moves < 400) {
        const legal: Array<[number, number]> = [];
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            if (isLegal(state, r, c)) legal.push([r, c]);
          }
        }
        expect(legal.length).toBeGreaterThan(0);

        const [r, c] = legal[Math.floor(rand() * legal.length)];
        // Previously a saturated board threw "Cascade did not stabilise" here
        // and the move was silently dropped.
        state = applyMove(state, r, c).state;
        moves++;
      }

      expect(state.phase).toBe('over');
      expect(state.winner).not.toBeNull();
      expect(state.players.filter((p) => p.alive)).toHaveLength(1);
    }
  }, 60_000);
});
