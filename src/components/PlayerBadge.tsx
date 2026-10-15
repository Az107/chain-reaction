import type { Player } from '../engine/types';
import type { CSSVars } from './cssVars';

interface PlayerBadgeProps {
  player: Player;
  orbs: number;
  isCurrent: boolean;
}

export function PlayerBadge({ player, orbs, isCurrent }: PlayerBadgeProps) {
  const classes = ['badge'];
  if (isCurrent) classes.push('badge--current');
  if (!player.alive) classes.push('badge--out');

  return (
    <div className={classes.join(' ')} style={{ '--orb-color': player.color } as CSSVars}>
      <span className="badge__dot" />
      <span className="badge__name">{player.name}</span>
      <span className="badge__orbs">{orbs}</span>
      {!player.alive && <span className="badge__out">out</span>}
    </div>
  );
}
