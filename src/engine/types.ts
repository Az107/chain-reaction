export type PlayerId = number;

/** A single grid cell: who owns it and how many orbs are stacked on it. */
export interface Cell {
  owner: PlayerId | null;
  count: number;
}

export type Board = Cell[][];

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  /** Eliminated once they have moved and hold zero orbs. */
  alive: boolean;
  /** A player is never eliminated before taking their first turn. */
  hasMoved: boolean;
}

export type Phase = 'playing' | 'over';

export interface GameState {
  rows: number;
  cols: number;
  board: Board;
  players: Player[];
  current: PlayerId;
  phase: Phase;
  winner: PlayerId | null;
  moveCount: number;
}

/** One cell that explodes during a wave. */
export interface Explosion {
  r: number;
  c: number;
  owner: PlayerId;
  /** How many orbs the cell held when it exploded. */
  countBefore: number;
}

/** A single orb pushed from an exploding cell into a neighbour. */
export interface Delivery {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  owner: PlayerId;
}

/** All explosions that happen at the same instant, plus the board before/after. */
export interface Wave {
  exploders: Explosion[];
  deliveries: Delivery[];
  boardBefore: Board;
  boardAfter: Board;
}
