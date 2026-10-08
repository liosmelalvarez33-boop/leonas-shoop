/* Service worker de Leonas Shoop: guarda el catálogo para verlo sin datos. */
const CACHE = 'leonas-v2';
const PRECACHE = [
  '/',
  '/catalogo',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// HTML: siempre de la red (para ver lo último publicado); sin internet → caché.
const redPrimero = async (peticion) => {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(peticion);
    if (res && res.ok) cache.put(peticion, res.clone()).catch(() => {});
    return res;
  } catch {
    const guardado = await cache.match(peticion, { ignoreSearch: true });
    if (guardado) return guardado;
    return (await cache.match('/')) || Response.error();
  }
};

// APIs de datos: red primero (siempre lo último del panel); sin internet → caché.
const apiPrimero = async (peticion) => {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(peticion);
    if (res && res.ok) cache.put(peticion, res.clone()).catch(() => {});
    return res;
  } catch {
    const guardado = await cache.match(peticion);
    if (guardado) return guardado;
    return new Response(JSON.stringify({ error: 'sin-conexion' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// CSS/JS con hash: caché primero (son inmutables).
const cachéPrimero = async (peticion) => {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(peticion);
  if (guardado) return guardado;
  try {
    const res = await fetch(peticion);
    if (res && res.ok) cache.put(peticion, res.clone()).catch(() => {});
    return res;
  } catch {
    return Response.error();
  }
};

// Fotos de productos: rápidas de la caché y se actualizan en segundo plano.
const actualizaciónDeFondo = async (peticion) => {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(peticion);
  const red = fetch(peticion)
    .then((res) => {
      if (res && res.ok) cache.put(peticion, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => undefined);
  return guardado || (await red) || Response.error();
};

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // El panel y sus APIs nunca pasan por la caché (sesión y datos siempre frescos).
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/admin/')) return;

  if (evento.request.mode === 'navigate') {
    evento.respondWith(redPrimero(evento.request));
    return;
  }
  if (url.pathname === '/api/catalogo' || url.pathname === '/api/config') {
    evento.respondWith(apiPrimero(evento.request));
    return;
  }
  if (url.pathname.startsWith('/img/') || url.pathname.startsWith('/icons/')) {
    evento.respondWith(actualizaciónDeFondo(evento.request));
    return;
  }
  if (
    url.pathname.startsWith('/_astro/') ||
    /\.(?:css|js|woff2?|png|svg|webp|jpg|json|xml)$/.test(url.pathname)
  ) {
    evento.respondWith(cachéPrimero(evento.request));
  }
});
