import type { Player } from '../engine/types';
import type { CSSVars } from './cssVars';

interface GameOverModalProps {
  winner: Player | null;
  onNewGame: () => void;
}

export function GameOverModal({ winner, onNewGame }: GameOverModalProps) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="card card--center">
        <span
          className="winner-dot"
          style={winner ? ({ '--orb-color': winner.color } as CSSVars) : undefined}
        />
        <h2 className="card__title">{winner ? `${winner.name} wins!` : 'Game over'}</h2>
        <p className="card__text">Every other orb was wiped out.</p>
        <div className="card__actions">
          <button className="btn" onClick={onNewGame}>
            New game
          </button>
        </div>
      </div>
    </div>
  );
}
