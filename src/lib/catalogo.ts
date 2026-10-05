import rawProductos from '../data/products.json';
import config from '../data/config.json';
import type { Categoria, Producto } from './types';

export const productos: Producto[] = rawProductos as Producto[];
export const categorias: Categoria[] = config.categorias;

export function getProducto(id: string): Producto | undefined {
  return productos.find((p) => p.id === id);
}

export function porCategoria(slug: string): Producto[] {
  return productos.filter((p) => p.categoria === slug);
}

export function destacados(): Producto[] {
  const lista = productos.filter((p) => p.destacado && p.estado !== 'vendido');
  return lista.length > 0 ? lista : productos.filter((p) => p.estado !== 'vendido').slice(0, 6);
}

export function relacionados(producto: Producto, cantidad = 4): Producto[] {
  const mismos = productos.filter(
    (p) => p.categoria === producto.categoria && p.id !== producto.id && p.estado !== 'vendido',
  );
  const otros = productos.filter(
    (p) => p.categoria !== producto.categoria && p.id !== producto.id && p.estado !== 'vendido',
  );
  return [...mismos, ...otros].slice(0, cantidad);
}

export function conteoPorCategoria(slug: string): number {
  return porCategoria(slug).length;
}

export function categoriaDe(slug: string): Categoria | undefined {
  return categorias.find((c) => c.slug === slug);
}

export const etiquetaCondicion: Record<string, string> = {
  nuevo: 'Nuevo',
  'segundo-uso': 'Segundo uso',
};

export const etiquetaEstado: Record<string, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

export function todasLasTallas(): string[] {
  const set = new Set<string>();
  for (const p of productos) for (const t of p.tallas) set.add(t);
  return [...set].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
}
