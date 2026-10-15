# Chain Reaction

A fresh, correct implementation of the classic **Chain Reaction** orb strategy
game, built as an installable Progressive Web App.

A rewrite of the (buggy, Android-only) original: same rules, but the chain
reaction is resolved **truly simultaneously** and the whole thing runs offline in
any browser, installable to your home screen.

- React + TypeScript + Vite
- 2–8 player local hot-seat
- 5×5–12×12 boards (6×6 default)
- Offline-capable PWA, installable, with a persisted in-progress game
- 23 unit + UI tests, including the cascade's order-independence

## Quick start

```bash
npm install
npm run icons     # generate PWA icons (already committed)
npm run dev       # http://localhost:5173
```

Other scripts:

```bash
npm test          # run the test suite
npm run build     # typecheck + production build (with service worker)
npm run preview   # serve the production build
```

## Rules

| Cell type | Orthogonal neighbours | **Critical mass** (explodes at) | Stable capacity |
|---|---|---|---|
| Corner | 2 | 2 | 1 |
| Edge | 3 | 3 | 2 |
| Interior | 4 | 4 | 3 |

- On your turn, place one orb on an **empty** cell or one **you own**.
- When a cell reaches its critical mass it **explodes**: it loses exactly
  `criticalMass` orbs, and **every orthogonal neighbour gains 1 orb and is
  captured** by you (any opponent orbs there become yours).
- A captured neighbour that reaches critical mass explodes too — a chain reaction.
- A player with **zero orbs** is eliminated (but never before their first turn).
  The last player with orbs wins.
- The cascade **stops as soon as the game is decided**: once only one player still
  holds orbs there is no need to stabilise the rest of the board.

## The simultaneous cascade

The interesting part is resolving chains where **everything happens at once**.

Model the cascade as **generations (waves)**. Generation 0 is the board right
after your placement. Every cell at/over its critical mass is scheduled, and they
all explode simultaneously. The result is generation 1; repeat until no cell is
critical.

"Simultaneously" is implemented by never mutating the board in place — we
snapshot the current board and write into a fresh copy:

1. **Find** every cell whose `count >= criticalMass`.
2. **Phase 1:** each of those cells sheds exactly `criticalMass` orbs.
3. **Phase 2:** only then does each of them push one orb into every neighbour
   (capturing it).

Doing subtract-then-add in two passes is what makes it order-independent. A cell
can be both an exploder *and* a receiver in the same wave; because it can receive
several orbs at once it may **overshoot** its critical mass, so we subtract the
critical mass rather than resetting to zero — the leftover triggers the next wave
and the total orb count is conserved.

A nice consequence: this is a chip-firing (abelian sandpile) process, so the
**final board does not depend on the resolution order**. Simultaneity shapes the
animation, not the outcome. The test suite asserts this by comparing the
wave-based resolver against a one-at-a-time resolver on random boards.

See `src/engine/resolve.ts` for the implementation.

### Why the early stop is required

This process is chip-firing *without a sink*, so some reachable boards can never
stabilise — the cascade enters an infinite cycle. Measured against the engine,
without the early stop about **90% of games that fill the board get stuck**, for
every grid size and shape tried (5×5, 6×6, 8×8, 9×6, 12×12, 7×5).

Halting the moment only one player remains fixes it completely, and it is safe:
during a turn every exploding cell belongs to the current player and each
captured cell becomes theirs, so an opponent's orb count can only ever go **down**.
Once they hit zero they are out for good.

With the stop in place: **245/245 simulated games** across 5×5, 6×6, 9×6 and
12×12 end with a winner, with no cascade longer than 81 waves.

## Project layout

```
src/
  engine/        pure TypeScript game logic (no DOM, no React)
    board.ts       critical mass, neighbours, orb counting
    resolve.ts     the simultaneous wave resolver
    game.ts        turns, legality, eliminations, winner
    *.test.ts      unit + property tests
  state/useGame.ts   committed state + wave animation timeline
  components/        Board, Cell, Orb, badges, modals
  styles/            design tokens + app styles
  App.test.tsx       jsdom end-to-end UI test
scripts/gen-icons.mjs  generates icons + favicon from an SVG
```

## Notes

- The app is fully client-side: no backend, no accounts. Your game is saved to
  `localStorage` and restored on reload.
- Orbs show their count as a number, so the game is playable without relying on
  colour alone.
- Degenerate boards (e.g. 1×N) can never settle; the resolver guards against this
  and the UI enforces a 5×5 minimum.
