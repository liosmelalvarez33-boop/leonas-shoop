// Datos completos del panel: productos, configuración y pedidos.
import { json, exigirSesion, getProductos, getConfig, getPedidos } from '../../_lib.js';

export async function onRequestGet({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  const [productos, config, pedidos] = await Promise.all([
    getProductos(env),
    getConfig(env),
    getPedidos(env),
  ]);

  return json({
    productos,
    categorias: config.categorias ?? [],
    simbolo: config.simbolo,
    moneda: config.moneda,
    config,
    pedidos,
  });
}
