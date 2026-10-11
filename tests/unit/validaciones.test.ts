import { describe, it, expect } from 'vitest';
// _lib.js es JS plano de Functions; lo importamos directo (ESM).
import {
  validarPedido,
  validarProducto,
  validarConfig,
  esSlug,
  esTexto,
} from '../../functions/_lib.js';

describe('validaciones (_lib)', () => {
  it('esSlug acepta slugs válidos', () => {
    expect(esSlug('camisa-floral')).toBe(true);
    expect(esSlug('Camisa')).toBe(false);
    expect(esSlug('')).toBe(false);
  });

  it('esTexto respeta longitud', () => {
    expect(esTexto('hola', 10)).toBe(true);
    expect(esTexto('hola mundo largo', 5)).toBe(false);
  });

  it('validarPedido acepta pedido correcto', () => {
    const pedido = {
      nombre: 'María Pérez',
      entrega: 'Vedado, La Habana',
      notas: '',
      metodo_pago: 'transfermovil',
      items: [{ titulo: 'Camisa', precio: 1800, cantidad: 2, talla: 'M', imagen: 'a.svg' }],
      total: 3600,
    };
    expect(validarPedido(pedido)).toBeNull();
  });

  it('validarPedido rechaza total manipulado', () => {
    const pedido = {
      nombre: 'X',
      entrega: 'Y',
      items: [{ titulo: 'Camisa', precio: 1800, cantidad: 1 }],
      total: 1,
    };
    expect(validarPedido(pedido)).toBe('El total no coincide');
  });

  it('validarPedido rechaza método de pago inválido', () => {
    const pedido = {
      nombre: 'X',
      entrega: 'Y',
      metodo_pago: 'bitcoin',
      items: [{ titulo: 'A', precio: 100, cantidad: 1 }],
      total: 100,
    };
    expect(validarPedido(pedido)).toBe('Método de pago no válido');
  });

  it('validarProducto rechaza precio negativo', () => {
    const p = {
      id: 'test-1', titulo: 'Test', categoria: 'ropa', precio: -5,
      condicion: 'nuevo', estado: 'disponible', tallas: [], descripcion: '', imagenes: [],
    };
    expect(validarProducto(p)).toBe('Precio no válido');
  });

  it('validarConfig rechaza whatsapp inválido', () => {
    expect(validarConfig({ whatsapp: '123' })).toBe('Número de WhatsApp no válido');
  });
});
