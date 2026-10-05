let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(mensaje: string, tono: 'exito' | 'info' | 'error' = 'exito'): void {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.setAttribute('role', 'status');
    el.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:1.5rem',
      'transform:translateX(-50%)',
      'z-index:60',
      'max-width:calc(100vw - 2rem)',
      'border-radius:0.75rem',
      'padding:0.75rem 1.25rem',
      'font-size:0.875rem',
      'font-weight:600',
      'color:#fff',
      'box-shadow:0 10px 25px rgba(0,0,0,.15)',
      'transition:opacity .2s ease',
    ].join(';');
    document.body.appendChild(el);
  }

  const colores: Record<string, string> = {
    exito: '#16a34a',
    info: '#1c1917',
    error: '#dc2626',
  };
  el.style.backgroundColor = colores[tono] ?? colores.info;
  el.textContent = mensaje;
  el.style.opacity = '1';

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.opacity = '0';
  }, 2600);
}
