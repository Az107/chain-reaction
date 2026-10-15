import type { Cell as CellModel, PlayerId } from '../engine/types';
import type { CSSVars } from './cssVars';
import { Orb } from './Orb';

interface CellProps {
  r: number;
  c: number;
  cell: CellModel;
  colorOf: (id: PlayerId) => string;
  canPlay: boolean;
  locked: boolean;
  exploding: boolean;
  isLast: boolean;
  onClick: (r: number, c: number) => void;
}

export function Cell({
  r,
  c,
  cell,
  colorOf,
  canPlay,
  locked,
  exploding,
  isLast,
  onClick,
}: CellProps) {
  const hasOrbs = cell.owner !== null && cell.count > 0;
  const classes = ['cell'];
  if (canPlay && !locked) classes.push('cell--playable');
  if (hasOrbs) classes.push('cell--owned');
  if (exploding) classes.push('cell--exploding');
  if (isLast) classes.push('cell--last');

  const style: CSSVars | undefined = hasOrbs
    ? { '--orb-color': colorOf(cell.owner as PlayerId) }
    : undefined;

  const label = hasOrbs
    ? `Row ${r + 1}, column ${c + 1}, ${cell.count} orb${cell.count === 1 ? '' : 's'}`
    : `Row ${r + 1}, column ${c + 1}, empty`;

  return (
    <button
      type="button"
      className={classes.join(' ')}
      data-r={r}
      data-c={c}
      aria-disabled={!canPlay || locked}
      aria-label={label}
      style={style}
      onClick={() => onClick(r, c)}
    >
      {hasOrbs && <Orb count={cell.count} />}
    </button>
  );
}
