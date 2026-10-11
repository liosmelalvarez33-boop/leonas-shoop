// Favoritos (wishlist) en localStorage. Sin cuenta: simple y privado.
export interface Favorito {
  id: string;
  titulo: string;
  precio: number;
  imagen: string;
  guardadoEn: string;
}

const KEY = 'leonas_shoop_favs_v1';

export function getFavs(): Favorito[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function setFavs(favs: Favorito[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(favs));
  } catch {
    /* sin almacenamiento */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('favs:changed', { detail: { count: favs.length } }));
  }
}

export function esFav(id: string): boolean {
  return getFavs().some((f) => f.id === id);
}

export function toggleFav(fav: Omit<Favorito, 'guardadoEn'>): boolean {
  const lista = getFavs();
  const i = lista.findIndex((f) => f.id === fav.id);
  if (i >= 0) {
    lista.splice(i, 1);
    setFavs(lista);
    return false;
  }
  lista.unshift({ ...fav, guardadoEn: new Date().toISOString() });
  setFavs(lista.slice(0, 100));
  return true;
}

export function quitarFav(id: string): void {
  setFavs(getFavs().filter((f) => f.id !== id));
}

export function contarFavs(): number {
  return getFavs().length;
}
