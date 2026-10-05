const agrupador = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

export function formatPrice(value: number): string {
  return agrupador.format(value);
}
