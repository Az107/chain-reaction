import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { Board as BoardModel, PlayerId } from '../engine/types';
import type { Effects, LastMove } from '../state/useGame';
import { Cell } from './Cell';
import type { CSSVars } from './cssVars';

interface BoardProps {
  board: BoardModel;
  rows: number;
  cols: number;
  colorOf: (id: PlayerId) => string;
  canPlay: (r: number, c: number) => boolean;
  onCellClick: (r: number, c: number) => void;
  effects: Effects;
  lastMove: LastMove | null;
  locked: boolean;
}

export function Board({
  board,
  rows,
  cols,
  colorOf,
  canPlay,
  onCellClick,
  effects,
  lastMove,
  locked,
}: BoardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const exploding = new Set(effects.exploding);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const el = event.target as HTMLElement;
    const r = Number(el.dataset.r);
    const c = Number(el.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return;

    let nr = r;
    let nc = c;
    switch (event.key) {
      case 'ArrowUp':
        nr = (r - 1 + rows) % rows;
        break;
      case 'ArrowDown':
        nr = (r + 1) % rows;
        break;
      case 'ArrowLeft':
        nc = (c - 1 + cols) % cols;
        break;
      case 'ArrowRight':
        nc = (c + 1) % cols;
        break;
      default:
        return;
    }
    event.preventDefault();
    ref.current?.querySelector<HTMLButtonElement>(`[data-r="${nr}"][data-c="${nc}"]`)?.focus();
  }

  const pctX = (c: number) => ((c + 0.5) / cols) * 100;
  const pctY = (r: number) => ((r + 0.5) / rows) * 100;

  const boardVars: CSSVars = {
    '--rows': rows,
    '--cols': cols,
    // Flying orbs are positioned against the whole board, so their size is the
    // cell-relative 64% divided across the columns. Keep in sync with `.orb`.
    '--flying-orb-size': `${(64 / cols).toFixed(3)}%`,
  };

  return (
    <div className="board-wrap" style={{ aspectRatio: `${cols} / ${rows}` }}>
      <div
        className="board"
        ref={ref}
        style={boardVars}
        onKeyDown={handleKeyDown}
        role="grid"
        aria-label="Game board"
      >
        {board.map((row, r) =>
          row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              r={r}
              c={c}
              cell={cell}
              colorOf={colorOf}
              canPlay={canPlay(r, c)}
              locked={locked}
              exploding={exploding.has(`${r},${c}`)}
              isLast={lastMove?.r === r && lastMove?.c === c}
              onClick={onCellClick}
            />
          )),
        )}
        {effects.flying.map((f) => (
          <span
            key={f.id}
            className="flying-orb"
            style={
              {
                '--from-x': `${pctX(f.fromC)}%`,
                '--from-y': `${pctY(f.fromR)}%`,
                '--to-x': `${pctX(f.toC)}%`,
                '--to-y': `${pctY(f.toR)}%`,
                '--orb-color': colorOf(f.owner),
                '--fly': `${effects.fly}ms`,
              } as CSSVars
            }
          />
        ))}
      </div>
    </div>
  );
}
