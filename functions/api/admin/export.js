// Export CSV: /api/admin/export?tipo=pedidos|productos
// Descarga directa con Content-Disposition.
import { error, exigirSesion, getProductos, getPedidos } from '../../_lib.js';
import { getPedidosD1, getProductosD1 } from '../../_d1.js';

function csvCelda(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function onRequestGet({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  const url = new URL(request.url);
  const tipo = url.searchParams.get('tipo') || 'pedidos';
  const hoy = new Date().toISOString().slice(0, 10);

  if (tipo === 'productos') {
    const d1 = await getProductosD1(env);
    const lista = d1 || (await getProductos(env));
    const filas = [
      ['id', 'titulo', 'categoria', 'precio', 'condicion', 'estado', 'tallas', 'descripcion', 'destacado', 'imagenes'].join(';'),
      ...lista.map((p) =>
        [
          p.id, p.titulo, p.categoria, p.precio, p.condicion, p.estado,
          (p.tallas || []).join(','), (p.descripcion || '').replace(/\n/g, ' '),
          p.destacado ? '1' : '0', (p.imagenes || []).join(','),
        ].map(csvCelda).join(';')
      ),
    ];
    return new Response('\uFEFF' + filas.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leonas-productos-${hoy}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (tipo === 'pedidos') {
    const d1 = await getPedidosD1(env);
    const lista = d1 || (await getPedidos(env));
    const filas = [
      ['numero', 'fecha', 'nombre', 'entrega', 'notas', 'total', 'estado', 'metodo_pago', 'items'].join(';'),
      ...lista.map((p) =>
        [
          p.n ?? p.numero, p.fecha, p.nombre, p.entrega, (p.notas || '').replace(/\n/g, ' '),
          p.total, p.estado, p.metodo_pago || 'efectivo',
          (p.items || []).map((it) => `${it.titulo}${it.talla ? ` (${it.talla})` : ''} x${it.cantidad}`).join(' | '),
        ].map(csvCelda).join(';')
      ),
    ];
    return new Response('\uFEFF' + filas.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leonas-pedidos-${hoy}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return error('Tipo no válido (usa pedidos o productos)');
}
