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
      // Variantes (tallas): sincronizar con el formulario.
      // - Talla nueva → stock inicial (5 si disponible, 0 si no).
      // - Talla conservada → mantiene su stock actual (no se resetea).
      // - Talla eliminada → se libera su reserva activa y se borra (no queda huérfana).
      if (Array.isArray(producto.tallas)) {
        const actuales = producto.tallas.slice(0, 10).map((t) => String(t));
        const existentes = await env.DB.prepare(
          'SELECT talla FROM product_variants WHERE product_id = ?'
        ).bind(producto.id).all().catch(() => ({ results: [] }));
        const enDB = new Set((existentes.results || []).map((v) => v.talla));
        const enForm = new Set(actuales);

        const altas = [];
        for (const talla of actuales) {
          if (enDB.has(talla)) continue;
          const sku = `${producto.id}-${talla}`.toUpperCase().slice(0, 60);
          const stock = producto.estado === 'disponible' ? 5 : 0;
          altas.push(
            env.DB.prepare(
              'INSERT INTO product_variants (product_id, talla, stock, sku) VALUES (?, ?, ?, ?) ON CONFLICT(product_id, talla) DO NOTHING'
            ).bind(producto.id, talla, stock, sku)
          );
        }
        if (altas.length) await env.DB.batch(altas);

        const bajas = [...enDB].filter((t) => !enForm.has(t));
        if (bajas.length) {
          // La variante desaparece con su stock: solo hay que borrar sus
          // reservas pendientes. Las reservas de tallas vigentes no se tocan.
          const borrar = [];
          for (const talla of bajas) {
            borrar.push(
              env.DB.prepare('DELETE FROM stock_reservas WHERE product_id = ? AND talla = ?').bind(producto.id, talla)
            );
            borrar.push(
              env.DB.prepare('DELETE FROM product_variants WHERE product_id = ? AND talla = ?').bind(producto.id, talla)
            );
          }
          await env.DB.batch(borrar);
        }
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
