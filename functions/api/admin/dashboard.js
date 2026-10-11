// Dashboard del panel: métricas en tiempo real.
// GET /api/admin/dashboard -> { hoy, semana, mes, top, stockBajo, pendientes, abandonados }
import { json, exigirSesion, getProductos, getPedidos } from '../../_lib.js';

function aPesos(centavos) {
  return Math.round(Number(centavos || 0) / 100);
}

export async function onRequestGet({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  // D1: consultas agregadas.
  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const hace7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const [pedHoy, ped7, ped30, top, stockBajo, pend, ing30, porMetodo, abandonados, embudo] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) as n, COALESCE(SUM(total),0) as t FROM orders WHERE date(fecha) = ? AND estado != 'cancelado'`).bind(hoy).first(),
        env.DB.prepare(`SELECT COUNT(*) as n, COALESCE(SUM(total),0) as t FROM orders WHERE date(fecha) >= ? AND estado != 'cancelado'`).bind(hace7).first(),
        env.DB.prepare(`SELECT COUNT(*) as n, COALESCE(SUM(total),0) as t FROM orders WHERE date(fecha) >= ? AND estado != 'cancelado'`).bind(hace30).first(),
        env.DB.prepare('SELECT * FROM top_products_sold LIMIT 10').all().catch(() => ({ results: [] })),
        env.DB.prepare(`SELECT p.id, p.titulo, v.talla, v.stock FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.stock <= 2 ORDER BY v.stock ASC LIMIT 20`).all().catch(() => ({ results: [] })),
        env.DB.prepare(`SELECT COUNT(*) as n FROM orders WHERE estado = 'pendiente'`).first().catch(() => ({ n: 0 })),
        env.DB.prepare(`SELECT date(fecha) as dia, COUNT(*) as pedidos, SUM(total) as ingresos FROM orders WHERE date(fecha) >= ? AND estado != 'cancelado' GROUP BY date(fecha) ORDER BY dia ASC`).bind(hace30).all().catch(() => ({ results: [] })),
        env.DB.prepare(`SELECT metodo_pago, COUNT(*) as n, SUM(total) as t FROM orders WHERE date(fecha) >= ? AND estado != 'cancelado' GROUP BY metodo_pago`).bind(hace30).all().catch(() => ({ results: [] })),
        env.DB.prepare(`SELECT COUNT(*) as n FROM abandoned_carts WHERE recovered_at IS NULL`).first().catch(() => ({ n: 0 })),
        env.DB.prepare(`SELECT tipo, COUNT(*) as n FROM eventos WHERE creada_en >= date('now', '-30 days') GROUP BY tipo`).all().catch(() => ({ results: [] })),
      ]);

      return json({
        fuente: 'd1',
        hoy: { pedidos: pedHoy?.n ?? 0, ingresos: aPesos(pedHoy?.t ?? 0) },
        semana: { pedidos: ped7?.n ?? 0, ingresos: aPesos(ped7?.t ?? 0) },
        mes: { pedidos: ped30?.n ?? 0, ingresos: aPesos(ped30?.t ?? 0) },
        ticketPromedio: ped30?.n ? Math.round(aPesos(ped30.t) / ped30.n) : 0,
        pendientes: pend?.n ?? 0,
        abandonados: abandonados?.n ?? 0,
        porMetodo: (porMetodo.results || []).map((r) => ({ metodo: r.metodo_pago, pedidos: r.n, ingresos: aPesos(r.t) })),
        top: (top.results || []).map((r) => ({ ...r, ingresos_totales: aPesos(r.ingresos_totales) })),
        embudo: Object.fromEntries((embudo.results || []).map((r) => [r.tipo, r.n])),
        stockBajo: stockBajo.results || [],
        serie30d: (ing30.results || []).map((r) => ({ dia: r.dia, pedidos: r.pedidos, ingresos: aPesos(r.ingresos) })),
      });
    } catch {
      /* caer a KV */
    }
  }

  // KV fallback: calcular desde listas en memoria.
  const [productos, pedidos] = await Promise.all([getProductos(env), getPedidos(env)]);
  const ahora = Date.now();
  const enRango = (f, dias) => ahora - new Date(f).getTime() <= dias * 86400000;
  const validos = pedidos.filter((p) => p.estado !== 'cancelado');
  const calc = (dias) => {
    const l = validos.filter((p) => enRango(p.fecha, dias));
    return { pedidos: l.length, ingresos: l.reduce((a, p) => a + Number(p.total || 0), 0) };
  };
  const mes = calc(30);
  const porProd = {};
  for (const p of validos) {
    for (const it of p.items || []) {
      const k = it.titulo;
      porProd[k] = porProd[k] || { titulo: k, unidades_vendidas: 0, ingresos_totales: 0 };
      porProd[k].unidades_vendidas += Number(it.cantidad || 0);
      porProd[k].ingresos_totales += Number(it.precio || 0) * Number(it.cantidad || 0);
    }
  }
  return json({
    fuente: 'kv',
    hoy: calc(1),
    semana: calc(7),
    mes,
    ticketPromedio: mes.pedidos ? Math.round(mes.ingresos / mes.pedidos) : 0,
    pendientes: pedidos.filter((p) => p.estado === 'pendiente').length,
    abandonados: 0,
    porMetodo: [],
    top: Object.values(porProd).sort((a, b) => b.unidades_vendidas - a.unidades_vendidas).slice(0, 10),
    stockBajo: [],
    serie30d: [],
    totalProductos: productos.length,
  });
}
