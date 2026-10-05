export type Condicion = 'nuevo' | 'segundo-uso';
export type Estado = 'disponible' | 'reservado' | 'vendido';

export type Producto = {
  id: string;
  titulo: string;
  categoria: string;
  precio: number;
  condicion: Condicion;
  estado: Estado;
  tallas: string[];
  descripcion: string;
  imagenes: string[];
  destacado?: boolean;
};

export type Categoria = {
  slug: string;
  nombre: string;
  icono?: string;
  descripcion: string;
};

export type CartItem = {
  id: string;
  titulo: string;
  precio: number;
  talla: string | null;
  cantidad: number;
  imagen: string;
};
