import { describe, expect, it } from 'vitest';
import { createBoard, criticalMass, isStable, neighbours, totalOrbs } from './board';
import { resolve } from './resolve';
import type { Board, Cell, PlayerId } from './types';

function board(rows: number, cols: number, fill: (r: number, c: number) => Partial<Cell> = () => ({})): Board {
  const b = createBoard(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      b[r][c] = { owner: null, count: 0, ...fill(r, c) };
    }
  }
  return b;
}

describe('criticalMass', () => {
  it('is 2 at corners, 3 on edges, 4 in the interior', () => {
    expect(criticalMass(0, 0, 5, 5)).toBe(2);
    expect(criticalMass(4, 4, 5, 5)).toBe(2);
    expect(criticalMass(0, 2, 5, 5)).toBe(3);
    expect(criticalMass(2, 0, 5, 5)).toBe(3);
    expect(criticalMass(2, 2, 5, 5)).toBe(4);
  });

  it('exposes neighbours in bounds', () => {
    expect(neighbours(0, 0, 5, 5)).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(neighbours(2, 2, 5, 5)).toHaveLength(4);
  });
});

describe('resolve', () => {
  it('explodes a corner into its two neighbours', () => {
    const b = board(3, 3, (r, c) => (r === 0 && c === 0 ? { owner: 0, count: 2 } : {}));
    const { board: out, waves } = resolve(b);
    expect(waves).toHaveLength(1);
    expect(out[0][0]).toEqual({ owner: null, count: 0 });
    expect(out[0][1]).toEqual({ owner: 0, count: 1 });
    expect(out[1][0]).toEqual({ owner: 0, count: 1 });
    expect(isStable(out)).toBe(true);
  });

  it('explodes an interior cell into all four neighbours', () => {
    const b = board(3, 3, (r, c) => (r === 1 && c === 1 ? { owner: 0, count: 4 } : {}));
    const { board: out, waves } = resolve(b);
    expect(waves).toHaveLength(1);
    expect(out[1][1]).toEqual({ owner: null, count: 0 });
    for (const [r, c] of [
      [0, 1],
      [1, 0],
      [1, 2],
      [2, 1],
    ]) {
      expect(out[r][c]).toEqual({ owner: 0, count: 1 });
    }
  });

  it('captures opponent orbs it lands on', () => {
    const b = board(3, 3, (r, c) => {
      if (r === 1 && c === 1) return { owner: 0, count: 4 };
      if (r === 0 && c === 1) return { owner: 1, count: 1 };
      return {};
    });
    const { board: out } = resolve(b);
    expect(out[0][1]).toEqual({ owner: 0, count: 2 });
  });

  it('chains over multiple simultaneous waves', () => {
    const b = board(3, 3, (r, c) => {
      if (r === 1 && c === 1) return { owner: 0, count: 4 };
      if (r === 0 && c === 1) return { owner: 0, count: 2 };
      return {};
    });
    const { board: out, waves } = resolve(b);
    expect(waves).toHaveLength(2);
    expect(waves[0].exploders.map((e) => [e.r, e.c])).toEqual([[1, 1]]);
    expect(waves[1].exploders.map((e) => [e.r, e.c])).toEqual([[0, 1]]);
    expect(isStable(out)).toBe(true);
  });

  it('keeps the leftover when a cell overflows past its critical mass', () => {
    const b = board(3, 3, (r, c) => {
      if (r === 0 && c === 1) return { owner: 0, count: 3 };
      if (r === 1 && c === 0) return { owner: 0, count: 3 };
      if (r === 0 && c === 0) return { owner: 1, count: 1 };
      return {};
    });
    const { board: out, waves } = resolve(b);
    // (0,0) received two orbs at once: 1 -> 3, over its corner critical mass of 2.
    expect(waves[1].exploders[0]).toMatchObject({ r: 0, c: 0, countBefore: 3 });
    expect(out[0][0]).toEqual({ owner: 0, count: 1 });
    expect(isStable(out)).toBe(true);
  });

  it('conserves the total number of orbs', () => {
    const b = board(4, 4, (r, c) => {
      if (r === 1 && c === 1) return { owner: 0, count: 4 };
      if (r === 1 && c === 2) return { owner: 1, count: 3 };
      return {};
    });
    const before = totalOrbs(b);
    const { board: out } = resolve(b);
    expect(totalOrbs(out)).toBe(before);
  });

  it('throws on a degenerate board that can never settle', () => {
    const b = board(1, 1);
    expect(() => resolve(b, { maxWaves: 5 })).toThrow(/stabilise/);
  });

  it('stops early when told the game is already decided', () => {
    const b = board(3, 3, (r, c) => {
      if (r === 1 && c === 1) return { owner: 0, count: 4 };
      if (r === 0 && c === 1) return { owner: 0, count: 2 };
      return {};
    });
    const { waves, stoppedEarly } = resolve(b, { stopWhen: () => true });
    expect(stoppedEarly).toBe(true);
    expect(waves).toHaveLength(1);
  });

  it('reports stoppedEarly false when the board settles normally', () => {
    const b = board(3, 3, (r, c) => (r === 0 && c === 0 ? { owner: 0, count: 2 } : {}));
    const { stoppedEarly } = resolve(b, { stopWhen: () => false });
    expect(stoppedEarly).toBe(false);
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

/** One-at-a-time resolver used to check order independence. */
function toppleSequential(start: Board): Board {
  const rows = start.length;
  const cols = start[0].length;
  const b = start.map((row) => row.map((cell) => ({ ...cell })));
  for (let guard = 0; guard < 100_000; guard++) {
    let target: [number, number] | null = null;
    for (let r = 0; r < rows && !target; r++) {
      for (let c = 0; c < cols; c++) {
        if (b[r][c].count >= criticalMass(r, c, rows, cols)) {
          target = [r, c];
          break;
        }
      }
    }
    if (!target) return b;
    const [r, c] = target;
    const cm = criticalMass(r, c, rows, cols);
    const owner = b[r][c].owner;
    b[r][c].count -= cm;
    if (b[r][c].count === 0) b[r][c].owner = null;
    for (const [nr, nc] of neighbours(r, c, rows, cols)) {
      b[nr][nc].count += 1;
      if (owner !== null) b[nr][nc].owner = owner;
    }
  }
  throw new Error('sequential topple did not settle');
}

/** Build a stable board by playing random legal moves, then add one final orb. */
function randomUnstableBoard(rand: () => number, rows: number, cols: number, players: number, moves: number): Board {
  let b = createBoard(rows, cols);
  for (let m = 0; m < moves; m++) {
    const player = Math.floor(rand() * players) as PlayerId;
    const legal: Array<[number, number]> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (b[r][c].owner === null || b[r][c].owner === player) legal.push([r, c]);
      }
    }
    if (legal.length === 0) break;
    const [r, c] = legal[Math.floor(rand() * legal.length)];
    const next = b.map((row) => row.map((cell) => ({ ...cell })));
    next[r][c] = { owner: player, count: next[r][c].count + 1 };
    b = resolve(next).board;
  }
  // One more orb on a random legal cell → potentially unstable.
  const legal: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) legal.push([r, c]);
  }
  const [r, c] = legal[Math.floor(rand() * legal.length)];
  const next = b.map((row) => row.map((cell) => ({ ...cell })));
  const owner = next[r][c].owner ?? 0;
  next[r][c] = { owner, count: next[r][c].count + 1 };
  return next;
}

describe('cascade properties', () => {
  it('always ends on a stable board and conserves orbs', () => {
    const rand = mulberry32(1234);
    for (let i = 0; i < 40; i++) {
      const start = randomUnstableBoard(rand, 5, 5, 3, 6 + Math.floor(rand() * 10));
      const before = totalOrbs(start);
      const { board: out } = resolve(start);
      expect(isStable(out)).toBe(true);
      expect(totalOrbs(out)).toBe(before);
    }
  });

  it('is order-independent (abelian): waves match one-at-a-time toppling', () => {
    const rand = mulberry32(99);
    for (let i = 0; i < 40; i++) {
      const start = randomUnstableBoard(rand, 4, 4, 3, 5 + Math.floor(rand() * 8));
      const waveBoard = resolve(start).board;
      const seqBoard = toppleSequential(start);
      const counts = (b: Board) => b.map((row) => row.map((cell) => cell.count));
      expect(counts(waveBoard)).toEqual(counts(seqBoard));
    }
  });
});
