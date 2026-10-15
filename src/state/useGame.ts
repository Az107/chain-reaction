import { useCallback, useEffect, useRef, useState } from 'react';
import { newGameFromOptions } from '../config';
import { applyMove, isLegal } from '../engine/game';
import type { NewGameOptions } from '../engine/game';
import type { Board, GameState, PlayerId, Wave } from '../engine/types';
import { loadGame, loadSettings, saveGame, saveSettings } from '../storage';
import type { LastMove, Persisted } from '../storage';

export type { LastMove } from '../storage';

export interface FlyingOrb {
  id: number;
  owner: PlayerId;
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
}

export interface Effects {
  /** Cells exploding right now, keyed "r,c". */
  exploding: string[];
  flying: FlyingOrb[];
  /** Flight time for this wave's orbs, in milliseconds. */
  fly: number;
}

const EMPTY_EFFECTS: Effects = { exploding: [], flying: [], fly: 0 };

let orbCounter = 0;

function effectsFor(wave: Wave, fly: number): Effects {
  return {
    exploding: wave.exploders.map((e) => `${e.r},${e.c}`),
    fly,
    flying: wave.deliveries.map((d) => ({
      id: orbCounter++,
      owner: d.owner,
      fromR: d.fromR,
      fromC: d.fromC,
      toR: d.toR,
      toC: d.toC,
    })),
  };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Owns the committed game state and the animation timeline.
 *
 * A move is resolved instantly by the engine; the UI then replays the returned
 * waves one at a time. Input is locked while that happens, and the committed
 * state (turn, eliminations) only flips once the last wave has been shown.
 */
export function useGame() {
  const [boot] = useState<Persisted>(
    () => loadGame() ?? { state: newGameFromOptions(loadSettings()), lastMove: null },
  );
  const [game, setGame] = useState<GameState>(boot.state);
  const [board, setBoard] = useState<Board>(boot.state.board);
  const [lastMove, setLastMove] = useState<LastMove | null>(boot.lastMove);
  const [effects, setEffects] = useState<Effects>(EMPTY_EFFECTS);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timers = useRef<number[]>([]);
  const animatingRef = useRef(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!animating) saveGame({ state: game, lastMove });
  }, [game, lastMove, animating]);

  const play = useCallback(
    (r: number, c: number) => {
      const g = gameRef.current;
      if (animatingRef.current || g.phase !== 'playing' || !isLegal(g, r, c)) return;

      let result: ReturnType<typeof applyMove>;
      try {
        result = applyMove(g, r, c);
      } catch (err) {
        // A click must never silently do nothing.
        console.error('Move failed to resolve', err);
        setError('That move could not be resolved. Please try another cell.');
        return;
      }
      const { state: next, waves } = result;
      setError(null);
      setLastMove({ r, c });

      if (waves.length === 0 || prefersReducedMotion()) {
        setBoard(next.board);
        setEffects(EMPTY_EFFECTS);
        setGame(next);
        return;
      }

      animatingRef.current = true;
      setAnimating(true);
      clearTimers();
      // Show the placed orb immediately.
      setBoard(waves[0].boardBefore);

      // Spread the whole cascade over a fixed time budget, so a huge avalanche
      // does not lock the board for many seconds.
      const TOTAL_BUDGET = 2200;
      const duration = Math.round(
        Math.min(360, Math.max(55, TOTAL_BUDGET / (1.25 * waves.length))),
      );
      const gap = Math.round(duration * 0.25);
      let t = 0;

      waves.forEach((wave) => {
        const start = t;

        timers.current.push(
          window.setTimeout(() => {
            setBoard(wave.boardBefore);
            setEffects(effectsFor(wave, duration));
          }, start),
        );
        timers.current.push(
          window.setTimeout(() => {
            setBoard(wave.boardAfter);
            setEffects(EMPTY_EFFECTS);
          }, start + duration),
        );

        t = start + duration + gap;
      });

      timers.current.push(
        window.setTimeout(() => {
          setBoard(next.board);
          setEffects(EMPTY_EFFECTS);
          setGame(next);
          animatingRef.current = false;
          setAnimating(false);
        }, t),
      );
    },
    [clearTimers],
  );

  const newGame = useCallback(
    (options: NewGameOptions) => {
      clearTimers();
      animatingRef.current = false;
      setAnimating(false);
      const state = newGameFromOptions(options);
      saveSettings(options);
      saveGame({ state, lastMove: null });
      setGame(state);
      setBoard(state.board);
      setLastMove(null);
      setEffects(EMPTY_EFFECTS);
      setError(null);
    },
    [clearTimers],
  );

  return { game, board, effects, animating, lastMove, error, play, newGame };
}
