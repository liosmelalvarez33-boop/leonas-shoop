# Leonas Shoop 🦁

Tienda online de artículos de primera y segunda mano (ropa, zapatos y más).
Los clientes arman su pedido en la web y lo envían **directo a WhatsApp** — sin registros
ni pasarelas de pago.

- **Stack:** Astro (sitio 100% estático) + Tailwind CSS
- **Carrito:** guardado en el navegador (`localStorage`), sin servidor
- **Pedidos:** mensaje armado hacia `wa.me/5354704764`
- **Modo oscuro:** botón ☀/🌙 en el encabezado; respeta la preferencia del visitante y la recuerda
- **Marca:** logo en `public/img/logo.svg` (cambiarlo por el definitivo junto a `public/favicon.svg`)
- **Hosting:** Cloudflare Pages (gratis, uso comercial permitido)

---

## Comandos

```bash
npm install          # instalar dependencias (solo la primera vez)
npm run dev          # desarrollo en http://localhost:4321
npm run build        # generar el sitio en dist/
npm run preview      # ver dist/ en local
npm run placeholders # regenerar fotos de ejemplo (no borra las tuyas)
npx astro check      # revisar tipos/errores
```

---

## Cómo agregar un producto

1. Abre **`src/data/products.json`**.
2. Copia un bloque existente y pégalo al final (antes del corchete de cierre `]`).
3. Cambia los datos:

```json
{
  "id": "vestido-flores",
  "titulo": "Vestido de flores",
  "categoria": "ropa",
  "precio": 2500,
  "condicion": "nuevo",
  "estado": "disponible",
  "tallas": ["S", "M", "L"],
  "descripcion": "Vestido ligero, talla real, sin manchas.",
  "imagenes": ["vestido-flores.webp"],
  "destacado": false
}
```

| Campo | Qué significa |
|---|---|
| `id` | Identificador único y en minúsculas sin espacios (va en la URL). Si ya existe, no lo reutilices. |
| `titulo` | Nombre del artículo tal como se verá. |
| `categoria` | Una de: `ropa`, `zapatos`, `accesorios`, `hogar`, `otros`. |
| `precio` | Número en CUP, sin `$` ni puntos (ej. `2500`). |
| `condicion` | `nuevo` o `segundo-uso`. |
| `estado` | `disponible`, `reservado` o `vendido` (el vendido se atenúa y no se puede pedir). |
| `tallas` | Lista de tallas; usa `[]` si no aplica (ej. un bolso). |
| `descripcion` | Descripción breve y honesta del estado real del artículo. |
| `imagenes` | Nombres de archivo de las fotos (la primera es la principal). |
| `destacado` | `true` si quieres que aparezca en la página de inicio. |

> ⚠️ Respeta las comas y los corchetes. Si la web deja de compilar, casi siempre es un
> JSON mal cerrado: `npm run build` te dirá en qué línea.

### Cómo agregar sus fotos

1. **Prepara las fotos:** máximo **1200 px** de ancho, formato **`.webp`** (o `.jpg`).
   En el celular: comparte → "mejor calidad" → redimensiona con alguna app antes de subir.
   Peso ideal: **menos de 200 KB** por foto (importante para quien navegue con datos en Cuba).
2. Cópialas a la carpeta **`public/img/productos/`**.
3. Pon en `"imagenes"` el nombre exacto del archivo, por ejemplo `"mi-vestido.webp"`.
4. Para varias fotos del mismo artículo, agrégalas todas:
   `"imagenes": ["vestido-1.webp", "vestido-2.webp"]` (la primera es la principal).

Borra las fotos de ejemplo que quieras reemplazar (`public/img/productos/*.svg`).

### Cambiar datos de la tienda

Todo está en **`src/data/config.json`**:

- `whatsapp` → número con código de país, solo dígitos (ej. `5354704764`)
- `whatsappVisible` → cómo se muestra (ej. `+53 54704764`)
- `site` → URL definitiva de la tienda (cambiarla cuando tengas el dominio)
- `horario`, `entregas`, `pagos`, `redes`, `categorias`

---

## Publicar en Cloudflare Pages (gratis)

1. **Crea la cuenta:** entra a [dash.cloudflare.com](https://dash.cloudflare.com) y regístrate
   (correo y contraseña, sin tarjeta).
2. **Sube el código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Leonas Shoop: tienda con pedidos por WhatsApp"
   ```
   Luego crea un repositorio en [github.com/new](https://github.com/new) (público o privado) y:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/leonas-shoop.git
   git branch -M main
   git push -u origin main
   ```
3. **Conecta Cloudflare:** en Cloudflare Dashboard → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git** → autoriza GitHub → selecciona el repositorio.
4. **Build settings** (deja lo que proponga, pero verifica):
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. **Deploy.** En unos segundos tendrás algo como `https://leonas-shoop.pages.dev`.

### Después del deploy

- En `src/data/config.json` cambia `"site"` a tu URL real (`https://tu-tienda.pages.dev`)
  y vuelve a desplegar (importante para el SEO y los enlaces compartidos).
- Cada vez que edites productos: `git add . && git commit -m "Nuevos productos" && git push`
  → Cloudflare reconstruye y publica solo.

### Dominio propio (opcional, después)

En Cloudflare → **Domain Registration** → compra tu `.com` (~$10-15/año) y asígnalo a tu
proyecto Pages. Actualiza `site` en `config.json`.

---

## Cómo funciona el pedido por WhatsApp

1. Cliente elige talla y cantidad → **Añadir al carrito**.
2. En **/carrito** escribe nombre y lugar de entrega → **Enviar pedido por WhatsApp**.
3. Se abre WhatsApp con el mensaje ya armado:
   ```
   Hola Leonas Shoop! Quiero hacer un pedido:

   1. Camisa floral (talla M) x2 - $3.600

   Total: $3.600

   Nombre: María Pérez
   Entrega: Vedado, La Habana
   ```
4. Ustedes confirman disponibilidad y coordinan pago (Transfermóvil, EnZona o efectivo)
   y entrega en el chat.

También hay un **botón flotante verde** en todas las páginas para consultas generales,
y un botón **"Pedir por WhatsApp"** en cada ficha de producto.

---

## Estructura del proyecto

```
leonas-shoop/
├── src/
│   ├── data/
│   │   ├── config.json        ← datos de la tienda (WhatsApp, horario, categorías)
│   │   └── products.json      ← EL CATÁLOGO (lo edita usted)
│   ├── pages/
│   │   ├── index.astro        ← inicio
│   │   ├── catalogo.astro     ← catálogo + filtros
│   │   ├── categoria/[slug].astro
│   │   ├── producto/[id].astro
│   │   ├── carrito.astro
│   │   └── contacto.astro
│   ├── components/            ← Header, Footer, tarjetas, botón flotante
│   ├── lib/                   ← carrito, mensajes de WhatsApp, catálogo
│   └── layouts/Base.astro
├── public/img/productos/      ← fotos de los artículos
└── scripts/gen-placeholders.mjs
```

## Próximas ideas (no incluidas aún)

- Página "Cómo pagar" con los QR de Transfermóvil y EnZona.
- Panel de administración web para cargar productos sin tocar archivos.
- Estados de pedido guardados (pendiente → confirmado → entregado).
