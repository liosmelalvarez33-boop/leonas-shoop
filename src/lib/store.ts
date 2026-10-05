import type { CartItem } from './types';

const KEY = 'leonas_shoop_cart_v1';

export function getCart(): CartItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function setCart(items: CartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(
    new CustomEvent('cart:changed', {
      detail: { count: contar(items), total: totalDe(items) },
    }),
  );
}

export function contar(items?: CartItem[]): number {
  const list = items ?? getCart();
  return list.reduce((acc, i) => acc + i.cantidad, 0);
}

export function totalDe(items?: CartItem[]): number {
  const list = items ?? getCart();
  return list.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
}

export function addToCart(item: CartItem): void {
  const cart = getCart();
  const existente = cart.find((c) => c.id === item.id && c.talla === item.talla);
  if (existente) {
    existente.cantidad += item.cantidad;
  } else {
    cart.push(item);
  }
  setCart(cart);
}

export function updateQty(index: number, cantidad: number): void {
  const cart = getCart();
  if (!cart[index]) return;
  if (cantidad <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].cantidad = Math.min(cantidad, 99);
  }
  setCart(cart);
}

export function removeFromCart(index: number): void {
  const cart = getCart();
  cart.splice(index, 1);
  setCart(cart);
}

export function clearCart(): void {
  setCart([]);
}
