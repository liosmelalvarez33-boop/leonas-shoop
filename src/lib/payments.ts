// Pagos: efectivo + Transfermóvil (deep links). Fase 1: helpers + mensajes.
import config from '../data/config.json';
import { formatPrice } from './format';

export type MetodoPago = 'efectivo' | 'transfermovil';

export const TRANSFERMOVIL_TELEFONO = '5354704764';

export function transfermovilLink(opts: { monto: number; concepto: string; telefono?: string }): string {
  const tel = (opts.telefono || TRANSFERMOVIL_TELEFONO).replace(/\D/g, '');
  const concepto = opts.concepto.slice(0, 140);
  // Esquema usado por la app en Cuba. Si la app no está instalada, el navegador mostrará error:
  // el checkout debe ofrecer "Copiar datos" como respaldo.
  return `transfermovil://pay?phone=${encodeURIComponent(tel)}&amount=${encodeURIComponent(String(opts.monto))}&concept=${encodeURIComponent(concepto)}`;
}

export function datosTransfermovilTexto(opts: { monto: number; concepto: string; telefono?: string }): string {
  const tel = opts.telefono || TRANSFERMOVIL_TELEFONO;
  return `Transfermóvil\nTel: ${tel}\nMonto: $${formatPrice(opts.monto)} CUP\nConcepto: ${opts.concepto}`;
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Respaldo para navegadores sin clipboard API.
    try {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function mensajePedidoConPago(
  lineasPedido: string,
  metodo: MetodoPago,
  numeroPedido?: number
): string {
  const pago =
    metodo === 'transfermovil'
      ? `\nPago por Transfermóvil al ${TRANSFERMOVIL_TELEFONO}${numeroPedido ? ` (Pedido #${numeroPedido})` : ''}. Envío comprobante por aquí.`
      : `\nPago en efectivo al momento de la entrega.`;
  return `${lineasPedido}${pago}`;
}

export { config };
