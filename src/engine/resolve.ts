import { cloneBoard, criticalMass, neighbours } from './board';
import type { Board, Delivery, Wave } from './types';

/**
 * Resolve a cascade in simultaneous waves.
 *
 * Generation 0 is the incoming board. Every cell at/over its critical mass is
 * scheduled to explode. ALL of them explode at once: each loses exactly
 * `criticalMass` orbs and pushes one orb into every orthogonal neighbour
 * (capturing it). The result is generation 1; repeat until no cell is critical.
 *
 * The board is never mutated in place — we snapshot `current` and write into a
 * fresh `next`, so the order of cells can never affect the outcome. This is a
 * chip-firing (abelian sandpile) process: the final board is order-independent.
 *
 * @throws if the cascade exceeds `maxWaves` (a last-resort guard; with a
 *   `stopWhen` predicate a real game always ends long before this).
 */
export interface ResolveOptions {
  /** Hard stop for pathological boards. */
  maxWaves?: number;
  /**
   * Called after every wave. Return true to stop immediately.
   *
   * Used when the game is already decided: once only one player still holds
   * orbs, there is no reason to fully stabilise a board nobody will play on.
   * An opponent can never gain orbs during someone else's turn, so the moment
   * they hit zero they are out for good.
   */
  stopWhen?: (board: Board) => boolean;
}

export interface ResolveResult {
  board: Board;
  waves: Wave[];
  stoppedEarly: boolean;
}

export function resolve(board: Board, options: ResolveOptions = {}): ResolveResult {
  const maxWaves = options.maxWaves ?? 100_000;
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  let current = board;
  const waves: Wave[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exploders: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (current[r][c].count >= criticalMass(r, c, rows, cols)) {
          exploders.push({ r, c });
        }
      }
    }
    if (exploders.length === 0) break;

    if (waves.length >= maxWaves) {
      throw new Error('Cascade did not stabilise');
    }

    // Snapshot: read from `current`, write to `next`.
    const next = cloneBoard(current);

    // Phase 1 — every exploder sheds exactly criticalMass orbs.
    for (const { r, c } of exploders) {
      next[r][c].count -= criticalMass(r, c, rows, cols);
      if (next[r][c].count === 0) next[r][c].owner = null;
    }

    // Phase 2 — only then does every exploder push one orb to each neighbour.
    const deliveries: Delivery[] = [];
    for (const { r, c } of exploders) {
      const owner = current[r][c].owner;
      if (owner === null) continue; // an unstable cell always has an owner
      for (const [nr, nc] of neighbours(r, c, rows, cols)) {
        next[nr][nc].count += 1;
        next[nr][nc].owner = owner;
        deliveries.push({ fromR: r, fromC: c, toR: nr, toC: nc, owner });
      }
    }

    waves.push({
      exploders: exploders.map(({ r, c }) => ({
        r,
        c,
        owner: current[r][c].owner ?? -1,
        countBefore: current[r][c].count,
      })),
      deliveries,
      boardBefore: current,
      boardAfter: next,
    });

    current = next;

    if (options.stopWhen?.(current)) {
      return { board: current, waves, stoppedEarly: true };
    }
  }

  return { board: current, waves, stoppedEarly: false };
}
