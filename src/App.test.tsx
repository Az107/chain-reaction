// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  // Force reduced motion so cascades resolve synchronously (no timers).
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });

  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(<App />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function cell(r: number, c: number): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>(`[data-r="${r}"][data-c="${c}"]`);
  if (!el) throw new Error(`no cell at ${r},${c}`);
  return el;
}

function click(r: number, c: number): void {
  act(() => {
    cell(r, c).click();
  });
}

function orbs(r: number, c: number): number {
  const text = cell(r, c).textContent?.trim() ?? '';
  return text ? Number(text) : 0;
}

function screen(): string {
  return container.textContent ?? '';
}

describe('App', () => {
  it('renders a 6x6 board with two players', () => {
    expect(container.querySelectorAll('.cell')).toHaveLength(36);
    expect(container.querySelectorAll('.badge')).toHaveLength(2);
    expect(screen()).toContain("Red's turn");
  });

  it('places an orb and passes the turn', () => {
    click(0, 0);
    expect(orbs(0, 0)).toBe(1);
    expect(screen()).toContain("Blue's turn");
  });

  it('explodes a critical corner into its neighbours', () => {
    click(0, 0); // Red -> 1 orb
    click(5, 5); // Blue -> 1 orb
    click(0, 0); // Red -> 2 orbs, reaches critical mass, explodes

    expect(orbs(0, 0)).toBe(0);
    expect(orbs(0, 1)).toBe(1);
    expect(orbs(1, 0)).toBe(1);
    expect(screen()).toContain("Blue's turn");
  });

  it('captures the last opponent orb and ends the game', () => {
    click(0, 0); // Red
    click(0, 1); // Blue's only orb
    click(0, 0); // Red -> explodes, captures (0,1) from Blue

    expect(orbs(0, 1)).toBe(2);
    expect(screen()).toContain('Red wins!');
  });
});
