-- Migración 0002: reservas de stock + expiración de pedidos pendientes
-- Para checkout robusto: reservar stock 15 min, liberar si no se confirma.

CREATE TABLE IF NOT EXISTS stock_reservas (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  talla TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  expira_en TEXT NOT NULL,
  creada_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_reservas_expira ON stock_reservas(expira_en);
CREATE INDEX IF NOT EXISTS idx_stock_reservas_order ON stock_reservas(order_id);

-- Añadir columnas a orders si no existen (D1 no soporta IF NOT EXISTS en ADD COLUMN en versiones viejas;
-- por eso usamos truco: intentar añadir, ignorar error si ya existe al aplicar manualmente).
-- Wrangler aplicará y fallará si existe; por eso dividimos en pasos seguros vía SELECT.
-- Para simplificar: estas columnas ya las previmos en 0001 salvo expira_en. Añadimos:
-- expira_reserva_en para saber cuándo liberar stock.

-- D1 soporta ADD COLUMN sin IF NOT EXISTS desde 2024. Lo intentamos:
-- Si falla porque ya existe, edita este archivo y comenta la línea.
ALTER TABLE orders ADD COLUMN expira_reserva_en TEXT;
ALTER TABLE orders ADD COLUMN reserva_liberada INTEGER NOT NULL DEFAULT 0;
