import config from '../data/config.json';
import { formatPrice } from './format';
import type { CartItem } from './types';

export let WA_NUMBER = config.whatsapp;
export let SIMBOLO = config.simbolo;

// El panel puede cambiar el número o el símbolo; la web los actualiza al cargar.
export function fijarConfigViva(cfg: { whatsapp: string; simbolo: string }): void {
  if (cfg.whatsapp) WA_NUMBER = cfg.whatsapp;
  if (cfg.simbolo) SIMBOLO = cfg.simbolo;
}

export function waLink(texto: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(texto)}`;
}

export function mensajeGeneral(): string {
  return `Hola ${config.nombre}! Me gustaría información sobre sus productos.`;
}

export function mensajeProducto(
  producto: { titulo: string; precio: number; tallas: string[] },
  opts: { talla?: string | null; cantidad?: number } = {},
): string {
  const cantidad = opts.cantidad ?? 1;
  const lineas = [
    `Hola ${config.nombre}! Me interesa este producto:`,
    '',
    `${producto.titulo} - ${SIMBOLO}${formatPrice(producto.precio)}`,
  ];
  if (producto.tallas.length > 0) {
    lineas.push(`Talla: ${opts.talla ?? '(por confirmar)'}`);
  }
  if (cantidad > 1) lineas.push(`Cantidad: ${cantidad}`);
  lineas.push('', '¿Está disponible? Quiero coordinar la entrega y el pago.');
  return lineas.join('\n');
}

export function mensajePedido(
  items: CartItem[],
  meta: { nombre: string; entrega: string; notas?: string },
): string {
  const lineas = [`Hola ${config.nombre}! Quiero hacer un pedido:`];
  items.forEach((item, i) => {
    const detalle = item.talla ? ` (talla ${item.talla})` : '';
    const importe = item.precio * item.cantidad;
    lineas.push(
      `${i + 1}. ${item.titulo}${detalle} x${item.cantidad} - ${SIMBOLO}${formatPrice(importe)}`,
    );
  });
  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  lineas.push('', `Total: ${SIMBOLO}${formatPrice(total)}`);
  lineas.push('', `Nombre: ${meta.nombre}`, `Entrega: ${meta.entrega}`);
  if (meta.notas?.trim()) lineas.push(`Notas: ${meta.notas.trim()}`);
  lineas.push('', 'Quedo atento/a. Gracias!');
  return lineas.join('\n');
}
