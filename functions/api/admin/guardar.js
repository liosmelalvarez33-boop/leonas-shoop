// Crear o editar producto (y subir fotos nuevas a KV).
import {
  json,
  error,
  leerJson,
  exigirSesion,
  getProductos,
  validarProducto,
} from '../../_lib.js';
import { auditar } from '../../_d1.js';

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

  const anteriores = existente >= 0 && Array.isArray(lista[existente].imagenes) ? lista[existente].imagenes : [];
  if (existente >= 0) {
    lista[existente] = limpio;
  } else {
    lista.push(limpio);
  }

  await env.DATOS.put('productos', JSON.stringify(lista));

  // Fotos quitadas en el panel: borrar sus blobs para que no reaparezcan
  // en la tienda (solo si ningún otro producto las usa).
  const quitadas = anteriores.filter((f) => !imagenes.includes(f));
  if (quitadas.length) {
    const enUso = new Set();
    for (const p of lista) for (const f of p.imagenes || []) enUso.add(f);
    for (const f of quitadas) {
      if (enUso.has(f)) continue;
      await env.DATOS.delete(`fotos:${f}`).catch(() => {});
      if (env.IMAGES && typeof env.IMAGES.delete === 'function') {
        await env.IMAGES.delete(`products/${producto.id}/${f}`).catch(() => {});
      }
    }
  }

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
      // Imágenes: sincronizar D1 con la lista final del formulario.
      // - Registra las nuevas (R2 o KV, con clave products/<id>/<archivo>).
      // - Borra las filas que ya no están (si no, reaparecen en la tienda).
      // - Reordena según la posición en el formulario.
      const filas = await env.DB.prepare(
        'SELECT id, r2_key, orden FROM product_images WHERE product_id = ?'
      ).bind(producto.id).all().catch(() => ({ results: [] }));
      const existentesImg = filas.results || [];
      const nombreDe = (key) => String(key || '').split('/').pop() || '';
      const porNombre = new Map(existentesImg.map((r) => [nombreDe(r.r2_key), r]));
      const finales = (imagenes || []).slice(0, 10);

      const nuevas = [];
      for (const f of finales) {
        if (porNombre.has(f)) continue;
        const key = r2Keys.find((k) => nombreDe(k) === f) || `products/${producto.id}/${f}`;
        nuevas.push(
          env.DB.prepare(
            'INSERT INTO product_images (product_id, r2_key, orden, alt_text) VALUES (?, ?, ?, ?)'
          ).bind(producto.id, key, 0, producto.titulo)
        );
      }
      if (nuevas.length) await env.DB.batch(nuevas);

      const sobrantes = existentesImg.filter((r) => !finales.includes(nombreDe(r.r2_key)));
      if (sobrantes.length) {
        await env.DB.batch(
          sobrantes.map((r) => env.DB.prepare('DELETE FROM product_images WHERE id = ?').bind(r.id))
        );
      }

      const reorden = [];
      const likeEsc = (s) => String(s).replace(/[\\%_]/g, (c) => '\\' + c);
      finales.forEach((f, i) => {
        reorden.push(
          env.DB.prepare(`UPDATE product_images SET orden = ?, alt_text = ? WHERE product_id = ? AND r2_key LIKE ? ESCAPE '\\'`)
            .bind(i, producto.titulo, producto.id, `%/` + likeEsc(f))
        );
      });
      if (reorden.length) await env.DB.batch(reorden);
    } catch {
      /* D1 opcional en Fase 1 */
    }
  }

  await auditar(env, modo === 'crear' ? 'admin_crear_producto' : 'admin_editar_producto', { producto_id: producto.id });
  return json({ ok: true, producto: limpio });
}
