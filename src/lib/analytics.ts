// Tracking de embudo: page_view, search, cart_add, checkout_*, tm_opened, fav_add, espera_add.
// Sin cookies de terceros. Falla en silencio si no hay red.
export type TipoEvento =
  | 'page_view'
  | 'search'
  | 'cart_add'
  | 'checkout_start'
  | 'checkout_complete'
  | 'tm_opened'
  | 'fav_add'
  | 'espera_add';

export function track(
  tipo: TipoEvento,
  datos: { pagina?: string; producto_id?: string; pedido_id?: string; monto?: number; metodo?: string } = {}
): void {
  try {
    const cuerpo = JSON.stringify({ tipo, pagina: location.pathname, ...datos });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/eventos', new Blob([cuerpo], { type: 'application/json' }));
    } else {
      fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* analítica nunca rompe la tienda */
  }
}
