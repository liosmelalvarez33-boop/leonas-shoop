// /categoria/<slug> → el catálogo con filtro (?categoria=<slug>).
export async function onRequestGet({ params }) {
  const slug = String(params.slug || '').slice(0, 60);
  return new Response(null, {
    status: 302,
    headers: { Location: `/catalogo?categoria=${encodeURIComponent(slug)}` },
  });
}
