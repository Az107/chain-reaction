import { useMemo, useState } from 'react';
import { Board } from './components/Board';
import { GameOverModal } from './components/GameOverModal';
import { NewGameModal } from './components/NewGameModal';
import { PlayerBadge } from './components/PlayerBadge';
import { TurnBanner } from './components/TurnBanner';
import { DEFAULT_OPTIONS } from './config';
import type { NewGameOptions } from './engine/game';
import { isLegal, orbsOf } from './engine/game';
import type { PlayerId } from './engine/types';
import { useGame } from './state/useGame';

export default function App() {
  const { game, board, effects, animating, lastMove, error, play, newGame } = useGame();
  const [showNewGame, setShowNewGame] = useState(false);
  const [options, setOptions] = useState<NewGameOptions>(DEFAULT_OPTIONS);

  const colorOf = useMemo(
    () => (id: PlayerId) => game.players.find((p) => p.id === id)?.color ?? '#94a3b8',
    [game.players],
  );

  const currentPlayer = game.players.find((p) => p.id === game.current) ?? null;
  const winner = game.phase === 'over' ? (game.players.find((p) => p.id === game.winner) ?? null) : null;

  const canPlay = (r: number, c: number) => !animating && isLegal(game, r, c);

  const announcement =
    game.phase === 'over'
      ? winner
        ? `${winner.name} wins!`
        : 'Game over'
      : currentPlayer
        ? `${currentPlayer.name}'s turn`
        : '';

  const startNew = (opts: NewGameOptions) => {
    newGame(opts);
    setOptions(opts);
    setShowNewGame(false);
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Chain Reaction</h1>
        <button className="btn btn--ghost" onClick={() => setShowNewGame(true)}>
          New game
        </button>
      </header>

      <TurnBanner game={game} />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="players">
        {game.players.map((p) => (
          <PlayerBadge
            key={p.id}
            player={p}
            orbs={orbsOf(game, p.id)}
            isCurrent={game.phase === 'playing' && p.id === game.current}
          />
        ))}
      </div>

      <Board
        board={board}
        rows={game.rows}
        cols={game.cols}
        colorOf={colorOf}
        canPlay={canPlay}
        onCellClick={play}
        effects={effects}
        lastMove={lastMove}
        locked={animating}
      />

      <p className="hint">
        Tap an empty cell or one of your own. Fill a cell to its critical mass and it bursts into
        every neighbour — corners hold 1, edges hold 2, the middle holds 3.
      </p>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {showNewGame && (
        <NewGameModal
          initial={options}
          allowCancel={game.moveCount > 0}
          onStart={startNew}
          onClose={() => setShowNewGame(false)}
        />
      )}

      {game.phase === 'over' && !showNewGame && (
        <GameOverModal winner={winner} onNewGame={() => setShowNewGame(true)} />
      )}
    </div>
  );
}
