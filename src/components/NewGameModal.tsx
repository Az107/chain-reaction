import { useState } from 'react';
import { MAX_PLAYERS, MAX_SIZE, MIN_PLAYERS, MIN_SIZE, specsFor } from '../config';
import type { NewGameOptions } from '../engine/game';
import type { CSSVars } from './cssVars';

interface NewGameModalProps {
  initial: NewGameOptions;
  allowCancel: boolean;
  onStart: (options: NewGameOptions) => void;
  onClose: () => void;
}

export function NewGameModal({ initial, allowCancel, onStart, onClose }: NewGameModalProps) {
  const [size, setSize] = useState(initial.rows);
  const [playerCount, setPlayerCount] = useState(initial.playerCount);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="New game">
      <div className="card">
        <h2 className="card__title">New game</h2>

        <label className="field">
          <span className="field__label">
            Board size <b>{size} × {size}</b>
          </span>
          <input
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span className="field__label">
            Players <b>{playerCount}</b>
          </span>
          <input
            type="range"
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
          />
        </label>

        <div className="swatches">
          {specsFor(playerCount).map((s) => (
            <span
              key={s.id}
              className="swatch"
              style={{ '--orb-color': s.color } as CSSVars}
              title={s.name}
            />
          ))}
        </div>

        <div className="card__actions">
          {allowCancel && (
            <button className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            className="btn"
            onClick={() => onStart({ rows: size, cols: size, playerCount })}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
