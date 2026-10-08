// Catálogo en vivo: productos + configuración (lo que muestra la tienda).
import { getProductos, getConfig, json } from '../_lib.js';

export async function onRequestGet({ env }) {
  const [productos, config] = await Promise.all([getProductos(env), getConfig(env)]);
  return json({ productos, config });
}
