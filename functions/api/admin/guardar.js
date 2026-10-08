// Crear o editar producto (y subir fotos nuevas a KV).
import {
  json,
  error,
  leerJson,
  exigirSesion,
  getProductos,
  validarProducto,
} from '../../_lib.js';

const FORMATOS = [
  { ext: 'webp', prefijo: 'data:image/webp;base64,' },
  { ext: 'jpg', prefijo: 'data:image/jpeg;base64,' },
  { ext: 'png', prefijo: 'data:image/png;base64,' },
];

function decodificarFoto(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > 3 * 1024 * 1024) return null;
  const formato = FORMATOS.find((f) => dataUrl.startsWith(f.prefijo));
  if (!formato) return null;
  try {
    const binario = atob(dataUrl.slice(formato.prefijo.length));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    if (bytes.length < 80) return null;
    return { bytes, ext: formato.ext };
  } catch {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  let cuerpo;
  try {
    cuerpo = await leerJson(request);
  } catch (e) {
    return error(e.message || 'Datos no legibles');
  }

  const { modo, producto, nuevasImagenes } = cuerpo;
  if (!['crear', 'editar'].includes(modo)) return error('Modo no válido');

  const fallo = validarProducto(producto);
  if (fallo) return error(fallo);

  const fotosNuevas = Array.isArray(nuevasImagenes) ? nuevasImagenes : [];
  if (fotosNuevas.length > 10) return error('Demasiadas fotos de una vez');

  const lista = await getProductos(env);
  const existente = lista.findIndex((p) => p.id === producto.id);
  if (modo === 'crear' && existente >= 0) return error('Ya existe un producto con ese ID');

  const imagenes = [...(producto.imagenes || [])];
  for (const foto of fotosNuevas) {
    if (imagenes.length >= 10) break;
    const decodificada = decodificarFoto(foto?.dataUrl);
    if (!decodificada) return error('Hay una foto que no se pudo leer');
    const nombre = `${producto.id}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}.${decodificada.ext}`;
    await env.DATOS.put(`fotos:${nombre}`, decodificada.bytes);
    imagenes.push(nombre);
  }

  const limpio = { ...producto, imagenes };

  if (existente >= 0) {
    lista[existente] = limpio;
  } else {
    lista.push(limpio);
  }

  await env.DATOS.put('productos', JSON.stringify(lista));
  return json({ ok: true, producto: limpio });
}
