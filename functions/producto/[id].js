// /producto/<id> → el detalle vive ahora en el catálogo (?p=<id>).
export async function onRequestGet({ params }) {
  const id = String(params.id || '').slice(0, 80);
  return new Response(null, {
    status: 302,
    headers: { Location: `/catalogo?p=${encodeURIComponent(id)}` },
  });
}
