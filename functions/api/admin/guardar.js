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
  const r2Keys = [];
  for (const foto of fotosNuevas) {
    if (imagenes.length >= 10) break;
    const decodificada = decodificarFoto(foto?.dataUrl);
    if (!decodificada) return error('Hay una foto que no se pudo leer');
    const nombre = `${producto.id}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}.${decodificada.ext}`;
    // Preferir R2; respaldo KV.
    if (env.IMAGES && typeof env.IMAGES.put === 'function') {
      try {
        const key = `products/${producto.id}/${nombre}`;
        await env.IMAGES.put(key, decodificada.bytes, {
          httpMetadata: { contentType: `image/${decodificada.ext === 'jpg' ? 'jpeg' : decodificada.ext}` },
        });
        r2Keys.push(key);
      } catch {
        await env.DATOS.put(`fotos:${nombre}`, decodificada.bytes);
      }
    } else {
      await env.DATOS.put(`fotos:${nombre}`, decodificada.bytes);
    }
    imagenes.push(nombre);
  }

  const limpio = { ...producto, imagenes };

  if (existente >= 0) {
    lista[existente] = limpio;
  } else {
    lista.push(limpio);
  }

  await env.DATOS.put('productos', JSON.stringify(lista));

  // Espejo en D1 (no bloquea si falla).
  if (env.DB && typeof env.DB.batch === 'function') {
    try {
      const precioCentavos = Math.round(Number(producto.precio) * 100);
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET titulo=excluded.titulo, categoria=excluded.categoria, precio=excluded.precio, condicion=excluded.condicion, estado=excluded.estado, descripcion=excluded.descripcion, destacado=excluded.destacado'
        ).bind(
          producto.id,
          producto.titulo,
          producto.categoria,
          precioCentavos,
          producto.condicion,
          producto.estado,
          producto.descripcion || '',
          producto.destacado ? 1 : 0,
          producto.id
        ),
      ]);
      // Variantes (tallas): reponer con stock por defecto 5 si están disponibles.
      if (Array.isArray(producto.tallas)) {
        const stmts = [];
        for (const talla of producto.tallas.slice(0, 10)) {
          const sku = `${producto.id}-${talla}`.toUpperCase().slice(0, 60);
          const stock = producto.estado === 'disponible' ? 5 : 0;
          stmts.push(
            env.DB.prepare(
              'INSERT INTO product_variants (product_id, talla, stock, sku) VALUES (?, ?, ?, ?) ON CONFLICT(product_id, talla) DO UPDATE SET stock=excluded.stock'
            ).bind(producto.id, String(talla), stock, sku)
          );
        }
        if (stmts.length) await env.DB.batch(stmts);
      }
      // Imágenes nuevas a R2 → registrar en D1.
      if (r2Keys.length) {
        const imgStmts = r2Keys.map((key, i) =>
          env.DB.prepare(
            'INSERT INTO product_images (product_id, r2_key, orden, alt_text) VALUES (?, ?, ?, ?)'
          ).bind(producto.id, key, (producto.imagenes?.length || 0) + i, producto.titulo)
        );
        await env.DB.batch(imgStmts);
      }
    } catch {
      /* D1 opcional en Fase 1 */
    }
  }

  return json({ ok: true, producto: limpio });
}
