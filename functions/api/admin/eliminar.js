// Eliminar producto (y sus fotos guardadas en KV).
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
  if (indice < 0) return error('Ese producto no existe', 404);

  const [producto] = lista.splice(indice, 1);
  await env.DATOS.put('productos', JSON.stringify(lista));

  // Borrar sus fotos de KV (si eran estáticas, no pasa nada).
  for (const foto of producto.imagenes || []) {
    await env.DATOS.delete(`fotos:${foto}`);
  }

  return json({ ok: true });
}
