import { describe, it, expect, beforeEach, vi } from 'vitest';

const datos: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => datos[k] ?? null,
  setItem: (k: string, v: string) => {
    datos[k] = v;
  },
  removeItem: (k: string) => {
    delete datos[k];
  },
});

const oyentes: Record<string, Array<() => void>> = {};
vi.stubGlobal('window', {
  dispatchEvent: (ev: Event) => {
    for (const fn of oyentes[ev.type] || []) fn();
    return true;
  },
  addEventListener: () => {},
});
if (typeof CustomEvent === 'undefined') {
  vi.stubGlobal('CustomEvent', class {
    type: string;
    detail: unknown;
    constructor(t: string, o?: { detail?: unknown }) {
      this.type = t;
      this.detail = o?.detail;
    }
  });
}

import { getFavs, toggleFav, esFav, quitarFav, contarFavs } from '../../src/lib/favoritos';

beforeEach(() => {
  for (const k of Object.keys(datos)) delete datos[k];
});

describe('favoritos', () => {
  it('empieza vacío', () => {
    expect(getFavs()).toEqual([]);
    expect(contarFavs()).toBe(0);
  });

  it('toggle añade y quita', () => {
    const fav = { id: 'a', titulo: 'Camisa', precio: 1800, imagen: 'a.svg' };
    expect(toggleFav(fav)).toBe(true);
    expect(esFav('a')).toBe(true);
    expect(toggleFav(fav)).toBe(false);
    expect(esFav('a')).toBe(false);
  });

  it('quitarFav elimina directo', () => {
    toggleFav({ id: 'b', titulo: 'B', precio: 100, imagen: 'b.svg' });
    quitarFav('b');
    expect(contarFavs()).toBe(0);
  });
});
