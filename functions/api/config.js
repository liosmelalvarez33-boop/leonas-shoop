// Configuración de la tienda (WhatsApp, horario, categorías) para hidratar la web.
import { getConfig, json } from '../_lib.js';

export async function onRequestGet({ env }) {
  return json(await getConfig(env));
}
