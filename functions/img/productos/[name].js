// Fotos: R2 (nuevo, optimizadas) → KV (legacy) → ASSETS (repo).
const TIPOS = { webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml' };

export async function onRequestGet({ request, env, params }) {
  const nombre = params.name;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(nombre || '')) return new Response('No encontrado', { status: 404 });

  // 1. R2: buscar en products/*/<nombre> y variantes optimizadas.
  if (env.IMAGES && typeof env.IMAGES.get === 'function') {
    const candidatos = [
      `products/optimizadas/${nombre}`,
      `products/optimizadas/${nombre}.webp`,
    ];
    // Si piden base (xxx.svg), probar también .webp/.avif generados.
    const base = nombre.replace(/\.[a-z0-9]+$/i, '');
    if (base !== nombre) {
      candidatos.push(`products/optimizadas/${base}.webp`, `products/optimizadas/${base}.avif`);
    }
    for (const key of candidatos) {
      try {
        const obj = await env.IMAGES.get(key);
        if (obj) {
          const ext = key.split('.').pop().toLowerCase();
          return new Response(obj.body, {
            headers: {
              'Content-Type': obj.httpMetadata?.contentType || TIPOS[ext] || 'application/octet-stream',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      } catch {
        /* seguir */
      }
    }
    // 2. R2 con prefijo por producto: buscar cualquier key que termine en /<nombre>
    try {
      const lista = await env.IMAGES.list({ prefix: 'products/' });
      const hallada = (lista.objects || []).find((o) => o.key.endsWith(`/${nombre}`));
      if (hallada) {
        const obj = await env.IMAGES.get(hallada.key);
        if (obj) {
          const ext = nombre.split('.').pop().toLowerCase();
          return new Response(obj.body, {
            headers: {
              'Content-Type': obj.httpMetadata?.contentType || TIPOS[ext] || 'application/octet-stream',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      }
    } catch {
      /* seguir a KV */
    }
  }

  // 3. KV legacy.
  const bytes = await env.DATOS.get(`fotos:${nombre}`, 'arrayBuffer');
  if (bytes && bytes.byteLength > 0) {
    const ext = nombre.split('.').pop().toLowerCase();
    return new Response(bytes, {
      headers: {
        'Content-Type': TIPOS[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // 4. Repo (o no existe).
  if (env.ASSETS) return env.ASSETS.fetch(request);
  return new Response('No encontrado', { status: 404 });
}
