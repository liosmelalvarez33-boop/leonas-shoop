// Guardar la configuración de la tienda (WhatsApp, horario, categorías…).
import { json, error, leerJson, exigirSesion, getConfig, validarConfig } from '../../_lib.js';

const CAMPOS = ['nombre', 'slogan', 'whatsapp', 'whatsappVisible', 'horario', 'entregas', 'pagos', 'ubicacion'];
const REDES = ['facebook', 'instagram', 'tiktok'];

export async function onRequestPost({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  let cuerpo;
  try {
    cuerpo = await leerJson(request, 64 * 1024);
  } catch {
    return error('Datos no legibles');
  }

  const actual = await getConfig(env);
  const nueva = { ...actual };

  for (const campo of CAMPOS) {
    if (campo in cuerpo) nueva[campo] = String(cuerpo[campo] ?? '');
  }
  if (cuerpo.whatsapp !== undefined) {
    nueva.whatsapp = String(cuerpo.whatsapp ?? '').replace(/\D/g, '');
  }
  if (cuerpo.redes && typeof cuerpo.redes === 'object') {
    nueva.redes = { ...actual.redes };
    for (const red of REDES) {
      if (red in cuerpo.redes) nueva.redes[red] = String(cuerpo.redes[red] ?? '');
    }
  }
  if (cuerpo.categorias !== undefined) {
    nueva.categorias = cuerpo.categorias;
  }

  const fallo = validarConfig(nueva);
  if (fallo) return error(fallo);

  // Fase 1: guardar en D1 si existe, siempre respaldar en KV.
  if (env.DB && typeof env.DB.batch === 'function') {
    try {
      const stmts = [];
      for (const [k, v] of Object.entries(nueva)) {
        const valor = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
        stmts.push(env.DB.prepare('INSERT INTO site_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, valor));
      }
      await env.DB.batch(stmts);
    } catch {
      /* si D1 falla, KV sigue siendo la fuente */
    }
  }

  await env.DATOS.put('config', JSON.stringify(nueva));
  return json({ ok: true, config: nueva });
}
