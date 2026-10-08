// Inicio de sesión del panel.
import { json, error, leerJson, claveCorrecta, permitido, ipDe, cookieDeSesion } from '../../_lib.js';

export async function onRequestPost({ request, env }) {
  const ip = ipDe(request);
  if (!(await permitido(env, `rl:login:${ip}`, 8, 600))) {
    return error('Demasiados intentos. Espera unos minutos.', 429);
  }

  let cuerpo;
  try {
    cuerpo = await leerJson(request, 4096);
  } catch {
    return error('Datos no legibles');
  }

  const password = String(cuerpo.password ?? '');
  if (!password || !(await claveCorrecta(password, env))) {
    return error('Contraseña incorrecta', 401);
  }

  return json(
    { ok: true },
    200,
    { 'Set-Cookie': await cookieDeSesion(env) },
  );
}
