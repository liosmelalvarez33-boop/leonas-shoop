// Datos en vivo: trae el catálogo desde la nube y mantiene la web actualizada.
import type { Categoria, Producto } from './types';
import { formatPrice } from './format';

export type ConfigViva = {
  nombre: string;
  slogan: string;
  whatsapp: string;
  whatsappVisible: string;
  site: string;
  moneda: string;
  simbolo: string;
  ubicacion: string;
  horario: string;
  entregas: string;
  pagos: string;
  redes: { facebook: string; instagram: string; tiktok: string };
  categorias: Categoria[];
};

export type CatalogoVivo = { productos: Producto[]; config: ConfigViva };

let enVivo: CatalogoVivo | null = null;

export async function traerCatalogo(): Promise<CatalogoVivo> {
  if (enVivo) return enVivo;
  try {
    const r = await fetch('/api/catalogo', { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    const datos = (await r.json()) as CatalogoVivo;
    if (Array.isArray(datos.productos) && datos.config) enVivo = datos;
  } catch {
    /* sin conexión: la página conserva lo que ya mostraba */
  }
  if (!enVivo) {
    throw new Error('sin-catalogo');
  }
  return enVivo;
}

export async function traerProductos(): Promise<Producto[]> {
  try {
    const { productos } = await traerCatalogo();
    return productos;
  } catch {
    return [];
  }
}

// ---------- Hidratar la página con la configuración viva ----------

let fijadores: Array<(cfg: ConfigViva) => void> = [];

export function alCambiarConfig(fn: (cfg: ConfigViva) => void): void {
  fijadores.push(fn);
  if (enVivo) fn(enVivo.config);
}

export async function hidratar(): Promise<void> {
  let datos: CatalogoVivo;
  try {
    datos = await traerCatalogo();
  } catch {
    return;
  }
  const cfg = datos.config;

  for (const fn of fijadores) fn(cfg);

  // Enlaces de WhatsApp (el número puede cambiar desde el panel).
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me/"]')) {
    a.href = a.href.replace(/wa\.me\/\d+/, `wa.me/${cfg.whatsapp}`);
  }

  // Textos marcados con data-cfg="horario" y similares.
  for (const el of document.querySelectorAll<HTMLElement>('[data-cfg]')) {
    const clave = el.dataset.cfg as keyof ConfigViva;
    const valor = cfg[clave];
    if (typeof valor === 'string' && valor) el.textContent = valor;
  }

  // Menús y rejillas de categorías (pueden crecer desde el panel).
  for (const cont of document.querySelectorAll<HTMLElement>('[data-categorias]')) {
    const variante = cont.dataset.categorias;
    const slugs = [...cont.querySelectorAll('[data-slug]')].map((x) => x.getAttribute('data-slug'));
    const actuales = cfg.categorias.map((c) => c.slug);
    const mismoOrden = slugs.length === actuales.length && slugs.every((s, i) => s === actuales[i]);
    if (mismoOrden) continue;
    cont.innerHTML =
      variante === 'grid'
        ? cfg.categorias.map((c) => tarjetaCategoria(c, datos.productos)).join('')
        : cfg.categorias
            .map(
              (c) =>
                `<a href="/catalogo?categoria=${encodeURIComponent(c.slug)}" data-slug="${c.slug}" class="block rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:bg-brand-50 hover:text-accent">${escapear(c.nombre)}</a>`,
            )
            .join('');
  }

  // Rejilla de destacados de la portada.
  const destacadosEl = document.getElementById('destacados-grid');
  if (destacadosEl) {
    const destacados = listaDestacados(datos.productos);
    destacadosEl.innerHTML = destacados.map((p) => tarjetaProducto(p, cfg)).join('');
  }
}

function escapear(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

export function listaDestacados(productos: Producto[]): Producto[] {
  const destacados = productos.filter((p) => p.destacado && p.estado !== 'vendido');
  const base =
    destacados.length > 0 ? destacados : productos.filter((p) => p.estado !== 'vendido').slice(0, 6);
  return base.slice(0, 8);
}

// ---------- Tarjeta de producto (espejo de ProductCard.astro) ----------

export function tarjetaProducto(p: Producto, cfg: ConfigViva): string {
  const esNuevo = p.condicion === 'nuevo';
  const agotado = p.estado === 'vendido';
  const tallasResumen =
    p.tallas.length > 0
      ? `Tallas ${p.tallas[0]}${p.tallas.length > 1 ? `-${p.tallas[p.tallas.length - 1]}` : ''}`
      : 'Única talla';
  const badgeCond = esNuevo ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-100 text-accent';
  const etiquetaCond = esNuevo ? 'Nuevo' : 'Segundo uso';
  const reservado =
    p.estado !== 'disponible' && p.estado !== 'vendido'
      ? '<span class="badge bg-sky-100 text-sky-800">Reservado</span>'
      : '';
  const vendido = agotado
    ? '<div class="absolute inset-0 flex items-center justify-center bg-black/45"><span class="rounded-full bg-panel px-4 py-1.5 text-sm font-bold text-fg">Vendido</span></div>'
    : '';
  const primera = p.imagenes[0] ? `/img/productos/${encodeURIComponent(p.imagenes[0])}` : '/img/logo.svg';
  return `<article class="group card relative flex flex-col transition duration-200 hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg hover:shadow-black/10${agotado ? ' opacity-75' : ''}">
  <a href="/producto/${encodeURIComponent(p.id)}" class="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
    <div class="relative aspect-[4/5] overflow-hidden bg-sunken">
      <img src="${primera}" alt="${escapear(p.titulo)}" width="800" height="1000" loading="lazy" decoding="async" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
      <div class="absolute left-3 top-3 flex flex-col items-start gap-1.5">
        <span class="badge ${badgeCond}">${etiquetaCond}</span>${reservado}
      </div>${vendido}
    </div>
    <div class="flex flex-1 flex-col p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-fg-faint">${escapear(tallasResumen)}</p>
      <h3 class="mt-1 text-base font-bold leading-snug text-fg transition group-hover:text-accent">${escapear(p.titulo)}</h3>
      <p class="mt-1 line-clamp-2 text-sm text-fg-subtle">${escapear(p.descripcion)}</p>
      <p class="mt-3 text-lg font-extrabold text-fg">${cfg.simbolo}${formatPrice(p.precio)} <span class="ml-1 text-xs font-semibold text-fg-faint">${cfg.moneda}</span></p>
    </div>
  </a>
</article>`;
}

// ---------- Tarjeta de categoría (para la portada) ----------

const ICONOS: Record<string, string> = {
  ropa: '<path d="M9 3l3 2 3-2 5 3.5-2.4 3.4-2.1-1.1V21H8.5V8.8l-2.1 1.1L4 6.5 9 3z" />',
  zapatos:
    '<path d="M2.5 16.6c1.8 0 2.9-1 3.9-2.5 1-1.5 2.4-3.4 4.4-3.4 1.5 0 2.2 1 3.5 1.5 1.4.5 3 .7 4 1.6 1 .8 1.7 1.5 1.7 2.5v1.6H2.5v-1.3z" /><path d="M2.5 19.5h19" />',
  accesorios:
    '<path d="M5.6 8h12.8l-1.2 12.2a1 1 0 01-1 .8H7.8a1 1 0 01-1-.8L5.6 8z" /><path d="M9 8V6.5a3 3 0 016 0V8" />',
  hogar: '<path d="M3 11l9-7 9 7v8.5a1.5 1.5 0 01-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 013 19.5V11z" />',
  otros: '<path d="M3 7.5l9-4.5 9 4.5v9L12 21l-9-4.5v-9z" /><path d="M3 7.5l9 4.5 9-4.5M12 12v9" />',
};

export function iconoSVG(nombre?: string): string {
  const contenido = ICONOS[nombre ?? 'otros'] ?? ICONOS.otros;
  return `<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;
}

function tarjetaCategoria(c: Categoria, productos: Producto[]): string {
  const n = productos.filter((p) => p.categoria === c.slug).length;
  return `<a href="/catalogo?categoria=${encodeURIComponent(c.slug)}" data-slug="${c.slug}" class="card group p-5 transition duration-200 hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg hover:shadow-black/5">
    <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-accent transition group-hover:bg-brand-600 group-hover:text-white">${iconoSVG(c.icono)}</span>
    <span class="mt-4 block text-base font-bold text-fg">${escapear(c.nombre)}</span>
    <span class="mt-1 block text-xs text-fg-subtle">${n} artículo${n === 1 ? '' : 's'}</span>
    <span class="mt-3 inline-block text-xs font-semibold text-accent opacity-0 transition group-hover:opacity-100">Ver →</span>
  </a>`;
}
