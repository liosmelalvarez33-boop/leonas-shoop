import { describe, it, expect } from 'vitest';
import { mensajePedido, mensajeProducto, waLink } from '../../src/lib/whatsapp';
import type { CartItem } from '../../src/lib/types';

describe('whatsapp', () => {
  it('waLink codifica el texto', () => {
    const link = waLink('Hola mundo');
    expect(link.startsWith('https://wa.me/')).toBe(true);
    expect(link).toContain(encodeURIComponent('Hola mundo'));
  });

  it('mensajePedido incluye items, total y datos', () => {
    const items: CartItem[] = [
      { id: 'a', titulo: 'Camisa', precio: 1800, talla: 'M', cantidad: 2, imagen: 'a.svg' },
      { id: 'b', titulo: 'Bolso', precio: 3500, talla: null, cantidad: 1, imagen: 'b.svg' },
    ];
    const msg = mensajePedido(items, { nombre: 'María', entrega: 'Vedado', notas: 'Llamar' });
    expect(msg).toContain('Camisa');
    expect(msg).toContain('x2');
    expect(msg).toContain('María');
    expect(msg).toContain('Vedado');
    expect(msg).toContain('Total:');
  });

  it('mensajeProducto pide talla cuando aplica', () => {
    const msg = mensajeProducto({ titulo: 'Tenis', precio: 3800, tallas: ['40'] }, { talla: '40' });
    expect(msg).toContain('Tenis');
    expect(msg).toContain('40');
  });
});
