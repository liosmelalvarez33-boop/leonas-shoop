import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock mínimo de localStorage + window para store.ts
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
  addEventListener: (t: string, fn: () => void) => {
    oyentes[t] = [...(oyentes[t] || []), fn];
  },
});
// CustomEvent existe en Node 18+; si no, mock simple.
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

import { getCart, addToCart, updateQty, removeFromCart, clearCart, contar, totalDe } from '../../src/lib/store';

beforeEach(() => {
  for (const k of Object.keys(datos)) delete datos[k];
});

describe('store (carrito)', () => {
  it('empieza vacío', () => {
    expect(getCart()).toEqual([]);
    expect(contar()).toBe(0);
    expect(totalDe()).toBe(0);
  });

  it('añade y acumula misma talla', () => {
    addToCart({ id: 'a', titulo: 'Camisa', precio: 1800, talla: 'M', cantidad: 1, imagen: 'a.svg' });
    addToCart({ id: 'a', titulo: 'Camisa', precio: 1800, talla: 'M', cantidad: 2, imagen: 'a.svg' });
    expect(contar()).toBe(3);
    expect(totalDe()).toBe(5400);
  });

  it('separa tallas distintas', () => {
    addToCart({ id: 'a', titulo: 'Camisa', precio: 1800, talla: 'S', cantidad: 1, imagen: 'a.svg' });
    addToCart({ id: 'a', titulo: 'Camisa', precio: 1800, talla: 'L', cantidad: 1, imagen: 'a.svg' });
    expect(getCart().length).toBe(2);
  });

  it('updateQty a 0 elimina', () => {
    addToCart({ id: 'a', titulo: 'A', precio: 100, talla: null, cantidad: 1, imagen: 'a.svg' });
    updateQty(0, 0);
    expect(getCart().length).toBe(0);
  });

  it('removeFromCart y clearCart', () => {
    addToCart({ id: 'a', titulo: 'A', precio: 100, talla: null, cantidad: 1, imagen: 'a.svg' });
    removeFromCart(0);
    expect(getCart().length).toBe(0);
    addToCart({ id: 'b', titulo: 'B', precio: 200, talla: null, cantidad: 1, imagen: 'b.svg' });
    clearCart();
    expect(getCart().length).toBe(0);
  });
});
