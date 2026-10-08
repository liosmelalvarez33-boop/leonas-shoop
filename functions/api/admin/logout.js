// Cierre de sesión del panel.
import { json, cookieVacia } from '../../_lib.js';

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': cookieVacia() });
}
