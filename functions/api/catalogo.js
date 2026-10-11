// Catálogo en vivo: productos + configuración (lo que muestra la tienda).
// Fase 1: lee de D1 si está disponible, si no cae a KV/archivos.
import { getProductos, getConfig, json } from '../_lib.js';
import { getProductosD1, getConfigD1 } from '../_d1.js';

export async function onRequestGet({ env }) {
  const [productosD1, configD1] = await Promise.all([
    getProductosD1(env),
    getConfigD1(env, null),
  ]);
  if (productosD1 && configD1) {
    return json({ productos: productosD1, config: configD1, fuente: 'd1' });
  }
  const [productos, config] = await Promise.all([getProductos(env), getConfig(env)]);
  return json({ productos, config, fuente: 'kv' });
}
