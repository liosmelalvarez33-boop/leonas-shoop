-- Migración inicial: Esquema completo para Leonas Shoop
-- Ejecutar: npx wrangler d1 migrations apply leonas-shoop --local (desarrollo)
--          npx wrangler d1 migrations apply leonas-shoop --remote (producción)

-- Tabla de productos
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  precio INTEGER NOT NULL,  -- en centavos CUP (ej: 180000 = 1800 CUP)
  condicion TEXT NOT NULL CHECK(condicion IN ('nuevo', 'segundo-uso')),
  estado TEXT NOT NULL CHECK(estado IN ('disponible', 'reservado', 'vendido')),
  descripcion TEXT NOT NULL DEFAULT '',
  destacado INTEGER NOT NULL DEFAULT 0,
  slug TEXT UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para productos
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_estado ON products(estado);
CREATE INDEX idx_products_destacado ON products(destacado);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Tabla de imágenes de productos (referencias a R2)
CREATE TABLE product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  r2_key_webp TEXT,
  r2_key_avif TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- Tabla de variantes (tallas con stock individual)
CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  talla TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sku TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, talla)
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

-- Tabla de pedidos
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  nombre TEXT NOT NULL,
  entrega TEXT NOT NULL,
  notas TEXT,
  total INTEGER NOT NULL,  -- en centavos CUP
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado')),
  metodo_pago TEXT NOT NULL CHECK(metodo_pago IN ('efectivo', 'transfermovil')),
  pago_confirmado INTEGER NOT NULL DEFAULT 0,
  pago_comprobante_r2_key TEXT,
  cliente_telefono TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_fecha ON orders(fecha DESC);
CREATE INDEX idx_orders_estado ON orders(estado);
CREATE INDEX idx_orders_numero ON orders(numero);
CREATE INDEX idx_orders_metodo_pago ON orders(metodo_pago);

-- Items del pedido
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  titulo TEXT NOT NULL,
  precio INTEGER NOT NULL,  -- precio al momento del pedido (centavos)
  cantidad INTEGER NOT NULL,
  talla TEXT,
  imagen_r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Contador de pedidos (para numero secuencial)
CREATE TABLE order_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO order_counter (id, value) VALUES (1, 0);

-- Tabla de configuración viva (reemplaza KV para config)
CREATE TABLE site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insertar configuración por defecto
INSERT OR IGNORE INTO site_config (key, value) VALUES
  ('nombre', 'Leonas Shoop'),
  ('slogan', 'Ropa, zapatos y artículos variados de primera y segunda mano'),
  ('whatsapp', '5354704764'),
  ('whatsappVisible', '+53 54704764'),
  ('site', 'https://leonas-shoop.pages.dev'),
  ('moneda', 'CUP'),
  ('simbolo', '$'),
  ('ubicacion', 'Cuba'),
  ('horario', 'Lunes a sábado: 9:00 AM - 8:00 PM'),
  ('entregas', 'Entregas en la ciudad (coordinamos todo por WhatsApp).'),
  ('pagos', 'Efectivo al momento de la entrega.'),
  ('redes', '{"facebook":"","instagram":"","tiktok":""}'),
  ('categorias', '[{"slug":"ropa","nombre":"Ropa","icono":"ropa","descripcion":"Camisas, vestidos, jeans, blusas y más."},{"slug":"zapatos","nombre":"Zapatos","icono":"zapatos","descripcion":"Zapatos, tenis y sandalias para todos."},{"slug":"accesorios","nombre":"Accesorios","icono":"accesorios","descripcion":"Bolsos, relojes, mochilas y complementos."},{"slug":"hogar","nombre":"Hogar","icono":"hogar","descripcion":"Artículos para el hogar."},{"slug":"otros","nombre":"Otros","icono":"otros","descripcion":"Artículos variados de segunda mano."}]');

-- Tabla de sesiones admin (reemplaza KV)
CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Tabla de rate limiting (reemplaza KV)
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);

-- Tabla de carritos abandonados (para recovery)
CREATE TABLE abandoned_carts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  items TEXT NOT NULL,  -- JSON
  client_data TEXT,     -- JSON {nombre, entrega}
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  abandoned_at TEXT NOT NULL DEFAULT (datetime('now')),
  recovered_at TEXT,
  recovery_method TEXT  -- 'whatsapp', 'email', 'manual'
);

CREATE INDEX idx_abandoned_carts_abandoned_at ON abandoned_carts(abandoned_at DESC);

-- Vista para analytics: resumen de pedidos por día
CREATE VIEW orders_daily_summary AS
SELECT
  date(fecha) as dia,
  COUNT(*) as total_pedidos,
  SUM(total) as ingresos_totales,
  SUM(CASE WHEN metodo_pago = 'transfermovil' THEN 1 ELSE 0 END) as pagos_transfermovil,
  SUM(CASE WHEN metodo_pago = 'efectivo' THEN 1 ELSE 0 END) as pagos_efectivo,
  AVG(total) as ticket_promedio
FROM orders
WHERE estado != 'cancelado'
GROUP BY date(fecha)
ORDER BY dia DESC;

-- Vista para analytics: top productos vendidos
CREATE VIEW top_products_sold AS
SELECT
  oi.product_id,
  p.titulo,
  p.categoria,
  SUM(oi.cantidad) as unidades_vendidas,
  SUM(oi.precio * oi.cantidad) as ingresos_totales,
  COUNT(DISTINCT oi.order_id) as pedidos_con_producto
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.estado NOT IN ('cancelado', 'pendiente')
GROUP BY oi.product_id, p.titulo, p.categoria
ORDER BY unidades_vendidas DESC;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_products_updated_at
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_product_variants_updated_at
AFTER UPDATE ON product_variants
BEGIN
  UPDATE product_variants SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_orders_updated_at
AFTER UPDATE ON orders
BEGIN
  UPDATE orders SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_site_config_updated_at
AFTER UPDATE ON site_config
BEGIN
  UPDATE site_config SET updated_at = datetime('now') WHERE key = NEW.key;
END;