// Configuración de la tienda (WhatsApp, horario, categorías) para hidratar la web.
// Fase 1: D1 primero, KV como respaldo.
import { getConfig, json } from '../_lib.js';
import { getConfigD1 } from '../_d1.js';

export async function onRequestGet({ env }) {
  const viva = await getConfigD1(env, null);
  if (viva) return json(viva);
  return json(await getConfig(env));
}
