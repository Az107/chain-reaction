import type { Board, PlayerId } from './types';

/** Critical mass = number of orthogonal neighbours (2 corner, 3 edge, 4 interior). */
export function criticalMass(r: number, c: number, rows: number, cols: number): number {
  let n = 0;
  if (r > 0) n++;
  if (r < rows - 1) n++;
  if (c > 0) n++;
  if (c < cols - 1) n++;
  return n;
}

/** In-bounds orthogonal neighbours of a cell, in a stable order. */
export function neighbours(r: number, c: number, rows: number, cols: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < rows - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < cols - 1) out.push([r, c + 1]);
  return out;
}

export function createBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ owner: null, count: 0 })),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/** Total orbs on the board (should be conserved by every cascade). */
export function totalOrbs(board: Board): number {
  let sum = 0;
  for (const row of board) for (const cell of row) sum += cell.count;
  return sum;
}

/** Orb count per player across the whole board. */
export function orbsByPlayer(board: Board): Record<PlayerId, number> {
  const counts: Record<PlayerId, number> = {};
  for (const row of board) {
    for (const cell of row) {
      if (cell.owner !== null && cell.count > 0) {
        counts[cell.owner] = (counts[cell.owner] ?? 0) + cell.count;
      }
    }
  }
  return counts;
}

export function isStable(board: Board): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].count >= criticalMass(r, c, rows, cols)) return false;
    }
  }
  return true;
}
