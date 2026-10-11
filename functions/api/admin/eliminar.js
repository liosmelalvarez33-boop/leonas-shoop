// Eliminar producto: D1 (transacción) + KV (respaldo) + R2 (si existe).
import { json, error, leerJson, exigirSesion, getProductos, esTexto } from '../../_lib.js';

export async function onRequestPost({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  let cuerpo;
  try {
    cuerpo = await leerJson(request, 4096);
  } catch {
    return error('Datos no legibles');
  }

  const id = String(cuerpo.id ?? '');
  if (!esTexto(id, 60)) return error('ID no válido');

  const lista = await getProductos(env);
  const indice = lista.findIndex((p) => p.id === id);
  const enKV = indice >= 0;
  const enD1 = await existeEnD1(env, id);
  if (!enKV && !enD1) return error('Ese producto no existe', 404);

  let productoKV = null;
  if (enKV) {
    [productoKV] = lista.splice(indice, 1);
    await env.DATOS.put('productos', JSON.stringify(lista));
  }

  // D1: transacción — primero desvincular pedidos (conserva historial),
  // luego variantes, imágenes, espera y el producto.
  if (enD1) {
    try {
      await env.DB.batch([
        env.DB.prepare('UPDATE order_items SET product_id = NULL WHERE product_id = ?').bind(id),
        env.DB.prepare('DELETE FROM stock_reservas WHERE product_id = ?').bind(id),
        env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(id),
        env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id),
        env.DB.prepare('DELETE FROM lista_espera WHERE product_id = ?').bind(id),
        env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id),
      ]);
    } catch {
      return error('No se pudo eliminar en la base de datos', 500);
    }
  }

  // Borrar sus fotos de KV (si eran estáticas, no pasa nada).
  for (const foto of (productoKV && productoKV.imagenes) || []) {
    await env.DATOS.delete(`fotos:${foto}`).catch(() => {});
  }

  // Borrar sus fotos de R2 (si el binding existe).
  if (env.IMAGES && typeof env.IMAGES.list === 'function') {
    try {
      const listaR2 = await env.IMAGES.list({ prefix: `products/${id}/` });
      for (const obj of listaR2.objects || []) {
        await env.IMAGES.delete(obj.key).catch(() => {});
      }
    } catch {
      /* R2 opcional */
    }
  }

  return json({ ok: true, fuente: enD1 ? 'd1' : 'kv' });
}

async function existeEnD1(env, id) {
  if (!env.DB || typeof env.DB.prepare !== 'function') return false;
  try {
    const r = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
    return Boolean(r);
  } catch {
    return false;
  }
}
