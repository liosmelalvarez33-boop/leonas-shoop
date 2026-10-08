// /admin: muestra el panel (con sesión) o la pantalla de entrada.
import { tieneSesion } from '../_lib.js';

const LOGIN = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Entrar · Panel Leonas Shoop</title>
<style>
  :root { --page:#fafaf9; --panel:#fff; --line:#e7e5e4; --fg:#1c1917; --muted:#57534e; --brand:#d97706; --brand-d:#b45309; --danger:#dc2626; }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--page); color:var(--fg); font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:20px; }
  .caja { width:min(380px,100%); background:var(--panel); border:1px solid var(--line); border-radius:18px; padding:28px 24px; box-shadow:0 18px 44px rgba(0,0,0,.08); }
  img { width:54px; height:54px; border-radius:14px; }
  h1 { font-size:20px; margin:14px 0 4px; }
  h1 span { color:var(--brand-d); }
  p.sub { margin:0 0 20px; color:var(--muted); font-size:13.5px; }
  input { width:100%; border:1px solid var(--line); border-radius:12px; padding:13px 14px; font:inherit; font-size:16px; }
  input:focus { outline:2px solid var(--brand); outline-offset:1px; }
  button { width:100%; margin-top:14px; border:none; border-radius:12px; background:var(--brand); color:#fff; font:inherit; font-weight:700; padding:13px; cursor:pointer; font-size:15px; }
  button:hover { background:var(--brand-d); }
  button:disabled { opacity:.6; cursor:wait; }
  .err { display:none; margin-top:12px; background:#fef2f2; color:var(--danger); border:1px solid #fecaca; border-radius:10px; padding:10px 12px; font-size:13.5px; }
  .volver { display:block; text-align:center; margin-top:16px; color:var(--muted); font-size:13px; text-decoration:none; }
  .volver:hover { color:var(--brand-d); }
</style>
</head>
<body>
  <form class="caja" id="f">
    <img src="/img/logo.svg" alt="" />
    <h1>Leonas <span>Shoop</span></h1>
    <p class="sub">Panel de administración. Escribe tu contraseña para entrar.</p>
    <input type="password" id="p" placeholder="Contraseña" autocomplete="current-password" required autofocus />
    <button type="submit" id="b">Entrar</button>
    <div class="err" id="e"></div>
    <a class="volver" href="/">← Volver a la tienda</a>
  </form>
<script>
  var f = document.getElementById('f');
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var b = document.getElementById('b');
    var e = document.getElementById('e');
    b.disabled = true;
    e.style.display = 'none';
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('p').value })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (x.ok) { location.reload(); return; }
        e.textContent = x.d.error || 'No se pudo entrar';
        e.style.display = 'block';
        b.disabled = false;
      })
      .catch(function () {
        e.textContent = 'Sin conexión. Intenta de nuevo.';
        e.style.display = 'block';
        b.disabled = false;
      });
  });
</script>
</body>
</html>`;

const cabeceras = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex',
  'Cache-Control': 'no-store',
};

export async function onRequestGet({ request, env }) {
  if (!(await tieneSesion(request, env))) {
    return new Response(LOGIN, { headers: cabeceras });
  }
  const html = await env.DATOS.get('ui:admin');
  if (!html) {
    return new Response(
      '<p style="font-family:sans-serif;padding:24px">Falta la interfaz del panel: ejecuta <code>node scripts/seed.mjs</code>.</p>',
      { status: 503, headers: cabeceras },
    );
  }
  return new Response(html, { headers: cabeceras });
}
