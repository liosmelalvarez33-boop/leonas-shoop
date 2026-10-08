# Leonas Shoop 🦁

Tienda online de artículos de primera y segunda mano (ropa, zapatos y más).
Los clientes arman su pedido en la web y lo envían **directo a WhatsApp** — sin registros
ni pasarelas de pago.

- **Stack:** Astro (sitio 100% estático) + Cloudflare Functions
- **Carrito:** guardado en el navegador (`localStorage`), sin servidor
- **Pedidos:** se registran en la nube (con estados: pendiente → confirmado → entregado)
  y el mensaje va directo a `wa.me/5354704764`
- **Panel en la nube:** <https://leonas-shoop.pages.dev/admin> — se gestiona desde el
  celular, sin prender la PC; los cambios se ven al instante
- **Modo oscuro:** botón ☀/🌙 en el encabezado; respeta la preferencia del visitante y la recuerda
- **Marca:** logo en `public/img/logo.svg` (cambiarlo por el definitivo junto a `public/favicon.svg`)
- **Hosting:** Cloudflare Pages (gratis, uso comercial permitido) + KV para los datos

---

## Comandos

```bash
npm install          # instalar dependencias (solo la primera vez)
npm run dev          # desarrollo en http://localhost:4321
npm run build        # generar el sitio en dist/
npm run preview      # ver dist/ en local
node scripts/seed.mjs --ui   # subir la interfaz del panel a la nube (tras editar admin.html)
npm run placeholders # regenerar fotos de ejemplo (no borra las tuyas)
npm run icons        # regenerar los íconos de la app (PWA)
npx astro check      # revisar tipos/errores
```

El panel **no** se ejecuta en local: vive en la nube (`/admin`) y habla con las
Functions + KV de Cloudflare.

---

## Cómo agregar un producto

### Desde el panel (recomendado)

1. Abre **<https://leonas-shoop.pages.dev/admin>** desde el celular o la PC
   (también desde el acceso directo de la PWA) y entra con la contraseña
   guardada en `~/.config/leonas-shoop/admin.pass`.
2. Pestaña **Productos** → **＋ Nuevo producto**: rellena título, precio, tallas, etc.
   (el ID de la URL se genera solo del título; arrastra las fotos y se reducen solas a 1200 px en WebP).
3. **Guardar** → el producto aparece en la web **al instante** (no hay que publicar nada).

Con el panel también puedes **Editar** y **Eliminar** cualquier producto, buscar o
filtrar por categoría, y en la pestaña **Pedidos** ver los pedidos entrantes y
cambiarles el estado (pendiente → confirmado → entregado / cancelado).

Los datos viven en **Cloudflare KV** (respaldo: `src/data/*.json` en el repo; si la KV
estuviera vacía, la web usa ese respaldo automática y el panel se rellena con
`node scripts/seed.mjs`).

### A mano (opcional)

> Lo normal es editar desde el panel. Si tocas `src/data/products.json` a mano,
> aplica los cambios en la nube con `node scripts/seed.mjs --forzar` (reemplaza la
> KV por el JSON del repo) y publica el sitio para que también cambie el primer pintado.

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

> Si usas el panel, no hagas nada de esto: **arrastra las fotos** al formulario y él las
> redimensiona, las convierte a `.webp` y las registra por ti.

1. **Prepara las fotos:** máximo **1200 px** de ancho, formato **`.webp`** (o `.jpg`).
   En el celular: comparte → "mejor calidad" → redimensiona con alguna app antes de subir.
   Peso ideal: **menos de 200 KB** por foto (importante para quien navegue con datos en Cuba).
2. Cópialas a la carpeta **`public/img/productos/`**.
3. Pon en `"imagenes"` el nombre exacto del archivo, por ejemplo `"mi-vestido.webp"`.
4. Para varias fotos del mismo artículo, agrégalas todas:
   `"imagenes": ["vestido-1.webp", "vestido-2.webp"]` (la primera es la principal).

Borra las fotos de ejemplo que quieras reemplazar (`public/img/productos/*.svg`).

### Cambiar datos de la tienda

**Desde el panel** (recomendado): pestaña **⚙️ Tienda** → nombre, WhatsApp, horario,
entregas, pagos, ubicación, redes y categorías (añadir/borrar) → **Guardar**. Se ve
al instante en toda la web.

De respaldo, lo mismo está en **`src/data/config.json`**:

- `whatsapp` → número con código de país, solo dígitos (ej. `5354704764`)
- `whatsappVisible` → cómo se muestra (ej. `+53 54704764`)
- `site` → URL definitiva de la tienda (cambiarla cuando tengas el dominio)
- `horario`, `entregas`, `pagos`, `redes`, `categorias`

---

## La app (PWA)

La tienda se puede **instalar como app** en el celular y la PC, y ver el catálogo
**sin internet**:

- **Android (Chrome):** toca el botón **📲 Instalar** del encabezado o el menú ⋮ →
  «Instalar aplicación». El ícono de la leona aparece en la pantalla de inicio.
- **iPhone (Safari):** botón **📲 Instalar** → «Compartir ▲» → «Añadir a pantalla de inicio».
- **PC (Chrome/Edge):** botón **📲 Instalar** del encabezado.

**Funciona sin datos:** el service worker (`public/sw.js`) guarda el catálogo y las fotos;
los cambios del panel se ven al instante (las páginas y los datos van primero por la red).
Si cambias el nombre de la caché en `sw.js` (`leonas-v2` → `v3`), los
usuarios descargan la versión nueva automáticamente.

Archivos: `public/manifest.webmanifest` (qué app es), `public/icons/` (íconos, se
regeneran con `npm run icons` desde `public/img/logo.svg`) y `public/sw.js` (caché
offline).

### APK para Android (app «de verdad»)

Además de la PWA, hay un **APK** descargable e instalable, ideal para compartirlo
por WhatsApp:

- **Descarga:** <https://leonas-shoop.pages.dev/apps/leonas-shoop.apk>
- **Instalar en el celular:** abrir el link → «Descargar» → abrir el archivo →
  Android pedirá permitir **«Instalar apps de origen desconocido»** para el
  navegador → aceptar y **Instalar**. El ícono de la leona aparece en el menú.
- El APK es una «cáscara» que abre la web: **los precios y productos se actualizan
  solos** sin volver a instalar nada.

Detalles técnicos: paquete `com.leonasshoop.app`, generado con Bubblewrap (TWA),
firmado con la clave `~/.keys/leonas-shoop.keystore` (¡guardar esa clave y su
contraseña para siempre: si se pierde, no se puede actualizar la app instalada!).
`public/.well-known/assetlinks.json` permite que Chrome abra la web a pantalla
completa dentro del APK.

Para regenerar el APK (solo si cambia el nombre, los íconos o la URL):

```bash
bash scripts/build-apk.sh   # genera, compila y firma → public/apps/leonas-shoop.apk
```

(La primera vez descarga Gradle y dependencias de Android: ~20-40 minutos con
conexión lenta. Requiere `JAVA_HOME` y `ANDROID_HOME` como los define el script.)

---

## Publicar en Cloudflare Pages (gratis)

Los cambios del **panel** no necesitan publicación: se guardan en KV y se ven al
instante. Publicar solo hace falta cuando cambia el **código** del sitio:

```bash
npm run build
node node_modules/wrangler/bin/wrangler.js pages deploy dist --project-name=leonas-shoop --branch main
```

La primera vez te pide iniciar sesión en Cloudflare (ya está hecho en esta compu).
Si te dice que falló la resolución de DNS, antepón
`NODE_OPTIONS="--dns-result-order=ipv4first"` al comando.

<details>
<summary>Historial: cómo se creó el sitio (solo referencia)</summary>

1. **Cuenta:** [dash.cloudflare.com](https://dash.cloudflare.com) (correo y contraseña, sin tarjeta).
2. **Proyecto Pages** creado desde la API de Cloudflare (nombre: `leonas-shoop`).
3. **Despliegue** con wrangler en local, sin conexión a GitHub.
4. `src/data/config.json` → `"site": "https://leonas-shoop.pages.dev"` (para SEO y enlaces).

</details>

### Después de cada publicación

- Editar productos, fotos, datos de la tienda o pedidos → desde el panel, **al instante**.
- Cambios de código/interfaz → `npm run build` + deploy (arriba). Si editaste
  `scripts/admin.html`, además `node scripts/seed.mjs --ui`.

### Dominio propio (opcional, después)

En Cloudflare → **Domain Registration** → compra tu `.com` (~$10-15/año) y asígnalo a tu
proyecto Pages. Actualiza `site` en `config.json`.

---

## Cómo funciona el pedido por WhatsApp

1. Cliente elige talla y cantidad → **Añadir al carrito**.
2. En **/carrito** escribe nombre y lugar de entrega → **Enviar pedido por WhatsApp**.
3. El pedido queda **registrado en la tienda** (aparece en el panel con el número
   `#N` y estado *pendiente*) **y** se abre WhatsApp con el mensaje ya armado:
   ```
   Hola Leonas Shoop! Quiero hacer un pedido:

   1. Camisa floral (talla M) x2 - $3.600

   Total: $3.600

   Nombre: María Pérez
   Entrega: Vedado, La Habana
   ```
4. Ustedes confirman disponibilidad y coordinan pago (Transfermóvil, EnZona o efectivo)
   y entrega en el chat, y van marcando el pedido en el panel: **confirmado**,
   **entregado** o **cancelado**.

También hay un **botón flotante verde** en todas las páginas para consultas generales,
y un botón **"Pedir por WhatsApp"** en cada ficha de producto.

---

## Estructura del proyecto

```
leonas-shoop/
├── src/
│   ├── data/
│   │   ├── config.json        ← respaldo de la tienda (WhatsApp, horario, categorías)
│   │   └── products.json      ← respaldo del catálogo
│   ├── pages/
│   │   ├── index.astro        ← inicio
│   │   ├── catalogo.astro     ← catálogo + filtros + ficha en diálogo (?p=)
│   │   ├── carrito.astro      ← registro el pedido y abre WhatsApp
│   │   └── contacto.astro
│   ├── components/            ← Header, Footer, tarjetas, botón flotante
│   ├── lib/                   ← carrito, WhatsApp, datos en vivo (vivo.ts, detalle.ts)
│   └── layouts/Base.astro
├── functions/                 ← Cloudflare Functions (API del panel y de la web)
│   ├── _lib.js                ← datos KV, sesión, validaciones, rate limit
│   ├── api/                   ← /api/catalogo, /api/pedidos, /api/admin/*
│   ├── admin/index.js         ← /admin (login + panel desde KV)
│   ├── producto/[id].js       ← 302 → /catalogo?p=
│   └── categoria/[slug].js    ← 302 → /catalogo?categoria=
├── public/
│   ├── img/productos/         ← fotos de los artículos
│   ├── icons/                 ← íconos de la app (npm run icons)
│   ├── manifest.webmanifest   ← manifiesto de la PWA
│   ├── sw.js                  ← service worker (catálogo offline)
│   ├── apps/leonas-shoop.apk  ← app para Android
│   └── .well-known/assetlinks.json ← firma para pantalla completa en el APK
├── apk/
│   ├── twa-manifest.json      ← configuración del APK
│   └── android/               ← proyecto Android (regenerable, no versionado)
└── scripts/
    ├── admin.html             ← interfaz del panel (se sube a KV: seed.mjs --ui)
    ├── seed.mjs               ← siembra la KV (datos + panel)
    ├── build-apk.sh           ← regenera y firma el APK
    ├── gen-icons.mjs          ← íconos de la app (npm run icons)
    └── gen-placeholders.mjs
```

## Próximas ideas (no incluidas aún)

- Página "Cómo pagar" con los QR de Transfermóvil y EnZona.
- Aviso push al celular del vendedor cuando entra un pedido nuevo.
