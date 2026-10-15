import type { GameState } from '../engine/types';
import type { CSSVars } from './cssVars';

export function TurnBanner({ game }: { game: GameState }) {
  if (game.phase === 'over') {
    const winner = game.players.find((p) => p.id === game.winner);
    return (
      <div
        className="banner banner--over"
        style={winner ? ({ '--orb-color': winner.color } as CSSVars) : undefined}
      >
        {winner ? `${winner.name} wins!` : 'Game over'}
      </div>
    );
  }

  const player = game.players.find((p) => p.id === game.current);
  return (
    <div
      className="banner"
      style={player ? ({ '--orb-color': player.color } as CSSVars) : undefined}
    >
      {player ? `${player.name}'s turn` : ''}
    </div>
  );
}
