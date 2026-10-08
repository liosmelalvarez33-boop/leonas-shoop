// Fotos subidas desde el panel: viven en KV; las del repo las sirve Pages.
const TIPOS = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml' };

export async function onRequestGet({ request, env, params }) {
  const nombre = params.name;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(nombre || '')) return new Response('No encontrado', { status: 404 });

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

  // No estaba en KV: es una foto del repositorio (o no existe).
  if (env.ASSETS) return env.ASSETS.fetch(request);
  return new Response('No encontrado', { status: 404 });
}
