import type { CSSProperties } from 'react';

/** CSSProperties that also allows CSS custom properties (e.g. `--orb-color`). */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;
