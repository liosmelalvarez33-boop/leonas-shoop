// Detalle de producto que se abre dentro del catálogo (?p=<id>).
import type { Producto } from './types';
import { formatPrice } from './format';
import type { ConfigViva } from './vivo';
import { addToCart } from './store';
import { mensajeProducto, waLink } from './whatsapp';
import { track } from './analytics';

function escapear(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

const ETQ_COND = { nuevo: 'Nuevo', 'segundo-uso': 'Segundo uso' } as const;
const ETQ_EST = { disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido' } as const;

const CHECK =
  '<svg class="mt-0.5 h-4 w-4 shrink-0 text-brand-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clip-rule="evenodd"></path></svg>';

export function detalleHTML(p: Producto, cfg: ConfigViva, relacionados: Producto[] = []): string {
  const disponible = p.estado === 'disponible';
  const esNuevo = p.condicion === 'nuevo';
  const cat = cfg.categorias.find((c) => c.slug === p.categoria);
  const badgeEstado =
    p.estado === 'disponible'
      ? 'bg-emerald-50 text-emerald-700'
      : p.estado === 'reservado'
        ? 'bg-sky-100 text-sky-800'
        : 'bg-rose-100 text-rose-800';
  const galeria = p.imagenes;
  const principal = galeria[0] ? `/img/productos/${encodeURIComponent(galeria[0])}` : '/img/logo.svg';
  const miniaturas =
    galeria.length > 1
      ? `<div class="mt-3 grid grid-cols-4 gap-3">${galeria
          .map(
            (img, i) =>
              `<button type="button" class="overflow-hidden rounded-xl border-2 ${i === 0 ? 'border-brand-600' : 'border-transparent'} bg-sunken" data-miniatura="/img/productos/${encodeURIComponent(img)}" aria-label="Ver imagen ${i + 1}"><img src="/img/productos/${encodeURIComponent(img)}" alt="" width="200" height="250" loading="lazy" class="aspect-[4/5] w-full object-cover" /></button>`,
          )
          .join('')}</div>`
      : '';

  const tallas =
    p.tallas.length > 0
      ? `<div class="mt-6">
        <p class="mb-2 text-sm font-bold text-fg">Talla <span id="talla-elegida" class="font-medium text-fg-subtle">(elige una)</span> <button type="button" data-guia class="ml-1 text-xs font-semibold text-accent hover:underline">Guía de tallas</button></p>
        <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Seleccionar talla">
          ${p.tallas.map((t) => `<button type="button" class="chip" role="radio" aria-checked="false" data-talla="${escapear(t)}">${escapear(t)}</button>`).join('')}
        </div>
      </div>`
      : '';

  const espera =
    !disponible
      ? `<form data-espera="${escapear(p.id)}" class="mt-6 space-y-2 rounded-2xl border border-line bg-sunken p-4">
        <p class="text-sm font-bold text-fg">Avísame cuando esté disponible</p>
        <div class="grid gap-2 sm:grid-cols-2">
          <input name="nombre" required maxlength="120" placeholder="Tu nombre" autocomplete="name" class="input" />
          <input name="telefono" required inputmode="tel" placeholder="Tu WhatsApp" autocomplete="tel" class="input" />
        </div>
        <button type="submit" class="btn-base btn-dark w-full sm:w-auto">Avisarme</button>
        <p data-espera-msg class="hidden text-xs font-semibold"></p>
      </form>`
      : '';

  const cross =
    relacionados.length > 0
      ? `<div class="mt-8 border-t border-line pt-6">
        <p class="text-sm font-extrabold uppercase tracking-wide text-fg">Combina con</p>
        <div class="mt-3 grid grid-cols-2 gap-3">
          ${relacionados.slice(0, 4).map((r) => {
            const img = r.imagenes[0] ? `/img/productos/${encodeURIComponent(r.imagenes[0])}` : '/img/logo.svg';
            return `<a href="/producto/${encodeURIComponent(r.id)}" class="card group overflow-hidden">
              <img src="${img}" alt="${escapear(r.titulo)}" loading="lazy" class="aspect-[4/5] w-full object-cover" onerror="this.onerror=null;this.src='/img/logo.svg'" />
              <span class="block truncate p-2 text-xs font-bold text-fg group-hover:text-accent">${escapear(r.titulo)}</span>
            </a>`;
          }).join('')}
        </div>
      </div>`
      : '';

  const aviso =
    !disponible && p.estado !== 'vendido'
      ? '<p class="text-sm font-semibold text-rose-600">Este artículo está reservado.</p>'
      : '';

  const btnAdd = disponible
    ? '<button type="button" id="btn-add" class="btn-base btn-primary flex-1">Añadir al carrito</button>'
    : '';

  const btnWaTexto = disponible
    ? 'Pedir por WhatsApp'
    : p.estado === 'reservado'
      ? 'Preguntar por lista de espera'
      : 'Preguntar por disponibilidad';

  return `
  <div class="grid gap-8 lg:grid-cols-2" data-detalle data-id="${escapear(p.id)}" data-titulo="${escapear(p.titulo)}" data-precio="${p.precio}" data-estado="${p.estado}" data-tiene-tallas="${p.tallas.length > 0 ? '1' : '0'}">
    <div>
      <div class="overflow-hidden rounded-2xl border border-line bg-sunken">
        <img src="${principal}" alt="${escapear(p.titulo)}" width="800" height="1000" id="imagen-principal" class="aspect-[4/5] w-full object-cover" decoding="async" />
      </div>
      ${miniaturas}
    </div>
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="badge ${esNuevo ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-100 text-accent'}">${ETQ_COND[p.condicion]}</span>
        <span class="badge ${badgeEstado}">${ETQ_EST[p.estado]}</span>
        ${cat ? `<span class="badge bg-sunken text-fg-muted">${escapear(cat.nombre)}</span>` : ''}
      </div>
      <h2 class="mt-3 text-3xl font-extrabold tracking-tight text-fg">${escapear(p.titulo)}</h2>
      <p class="mt-4 flex items-baseline gap-2 text-4xl font-extrabold text-accent">
        <span>${cfg.simbolo}${formatPrice(p.precio)}</span>
        <span class="text-sm font-semibold text-fg-faint">${cfg.moneda}</span>
      </p>
      <p class="mt-4 leading-relaxed text-fg-muted">${escapear(p.descripcion)}</p>
      ${tallas}
      ${espera}
      <div class="mt-6 flex items-center gap-4">
        <div class="flex items-center rounded-xl border border-line-2">
          <button type="button" id="qty-menos" class="px-3.5 py-2.5 text-lg font-bold text-fg-muted hover:text-fg" aria-label="Reducir cantidad">−</button>
          <span id="qty-val" class="min-w-[2.5rem] text-center text-sm font-bold text-fg" aria-live="polite">1</span>
          <button type="button" id="qty-mas" class="px-3.5 py-2.5 text-lg font-bold text-fg-muted hover:text-fg" aria-label="Aumentar cantidad">+</button>
        </div>
        ${aviso}
      </div>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        ${btnAdd}
        <button type="button" id="btn-wa" class="btn-base btn-wa${disponible ? '' : ' flex-1'}">${btnWaTexto}</button>
      </div>
      <ul class="mt-8 space-y-3 border-t border-line pt-6 text-sm text-fg-muted">
        <li class="flex gap-3">${CHECK}<span>${escapear(cfg.entregas)}</span></li>
        <li class="flex gap-3">${CHECK}<span>${escapear(cfg.pagos)}</span></li>
        <li class="flex gap-3">${CHECK}<span>${escapear(cfg.horario)}</span></li>
      </ul>
      ${cross}
    </div>
  </div>`;
}

// Vincula los botones del detalle recién insertado.
export function montarDetalle(
  raiz: HTMLElement,
  p: Producto,
  avisar: (msg: string, tono?: 'exito' | 'info' | 'error') => void,
): void {
  const tieneTallas = p.tallas.length > 0;
  let talla: string | null = null;
  let cantidad = 1;

  const chips = [...raiz.querySelectorAll<HTMLButtonElement>('[data-talla]')];
  const etiquetaTalla = raiz.querySelector<HTMLElement>('#talla-elegida');
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      chips.forEach((c) => {
        c.classList.remove('is-active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('is-active');
      chip.setAttribute('aria-checked', 'true');
      talla = chip.dataset.talla ?? null;
      if (etiquetaTalla) etiquetaTalla.textContent = `(talla ${talla})`;
    });
  }

  const qtyEl = raiz.querySelector<HTMLElement>('#qty-val');
  raiz.querySelector('#qty-menos')?.addEventListener('click', () => {
    cantidad = Math.max(1, cantidad - 1);
    if (qtyEl) qtyEl.textContent = String(cantidad);
  });
  raiz.querySelector('#qty-mas')?.addEventListener('click', () => {
    cantidad = Math.min(20, cantidad + 1);
    if (qtyEl) qtyEl.textContent = String(cantidad);
  });

  const tallaOk = (): boolean => {
    if (tieneTallas && !talla) {
      avisar('Primero elige la talla', 'error');
      return false;
    }
    return true;
  };

  raiz.querySelector('#btn-add')?.addEventListener('click', () => {
    if (!tallaOk()) return;
    addToCart({
      id: p.id,
      titulo: p.titulo,
      precio: p.precio,
      talla,
      cantidad,
      imagen: p.imagenes[0] ?? 'logo.svg',
    });
    track('cart_add', { producto_id: p.id, monto: p.precio * cantidad });
    avisar('Añadido al carrito');
  });

  raiz.querySelector('#btn-wa')?.addEventListener('click', () => {
    if (!tallaOk()) return;
    const texto = mensajeProducto({ titulo: p.titulo, precio: p.precio, tallas: tieneTallas ? ['x'] : [] }, { talla, cantidad });
    window.open(waLink(texto), '_blank', 'noopener');
  });

  const imgPrincipal = raiz.querySelector<HTMLImageElement>('#imagen-principal');
  for (const mini of raiz.querySelectorAll<HTMLButtonElement>('[data-miniatura]')) {
    mini.addEventListener('click', () => {
      if (!imgPrincipal) return;
      imgPrincipal.src = mini.dataset.miniatura ?? imgPrincipal.src;
      raiz
        .querySelectorAll('[data-miniatura]')
        .forEach((m) => m.classList.replace('border-brand-600', 'border-transparent'));
      mini.classList.replace('border-transparent', 'border-brand-600');
    });
  }

  if (p.estado === 'vendido') {
    const add = raiz.querySelector<HTMLButtonElement>('#btn-add');
    if (add) add.disabled = true;
  }

  raiz.querySelector('[data-guia]')?.addEventListener('click', () => {
    (document.getElementById('guia-tallas') as HTMLDialogElement | null)?.showModal();
  });

  for (const form of raiz.querySelectorAll<HTMLFormElement>('form[data-espera]')) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = form.querySelector('[data-espera-msg]') as HTMLElement;
      const fd = new FormData(form);
      try {
        const r = await fetch('/api/lista-espera', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: form.dataset.espera,
            nombre: String(fd.get('nombre') || ''),
            telefono: String(fd.get('telefono') || ''),
          }),
        });
        const d = await r.json().catch(() => null);
        if (r.ok) {
          msg.textContent = '✓ Te avisaremos por WhatsApp.';
          msg.className = 'text-xs font-semibold text-emerald-700';
          track('espera_add', { producto_id: form.dataset.espera || '' });
          avisar('Guardado en lista de espera');
          form.reset();
        } else {
          msg.textContent = d?.error || 'No se pudo guardar.';
          msg.className = 'text-xs font-semibold text-rose-600';
        }
      } catch {
        msg.textContent = 'Sin conexión. Intenta de nuevo.';
        msg.className = 'text-xs font-semibold text-rose-600';
      }
      msg.classList.remove('hidden');
    });
  }
}
