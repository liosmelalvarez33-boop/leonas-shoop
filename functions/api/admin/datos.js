// Datos completos del panel: productos, configuración y pedidos.
// Fase 1: D1 primero, KV como respaldo.
import { json, exigirSesion, getProductos, getConfig, getPedidos } from '../../_lib.js';
import { getProductosD1, getConfigD1, getPedidosD1 } from '../../_d1.js';

export async function onRequestGet({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  const [productosD1, configD1, pedidosD1] = await Promise.all([
    getProductosD1(env),
    getConfigD1(env, null),
    getPedidosD1(env),
  ]);

  if (productosD1 && configD1 && pedidosD1) {
    return json({
      productos: productosD1,
      categorias: configD1.categorias ?? [],
      simbolo: configD1.simbolo,
      moneda: configD1.moneda,
      config: configD1,
      pedidos: pedidosD1,
      fuente: 'd1',
    });
  }

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
    fuente: 'kv',
  });
}
