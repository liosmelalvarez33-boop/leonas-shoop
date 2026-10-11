-- Migración 0003: lista de espera ("avísame cuando esté disponible").

CREATE TABLE IF NOT EXISTS lista_espera (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  creada_en TEXT NOT NULL DEFAULT (datetime('now')),
  avisado_en TEXT
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_producto ON lista_espera(product_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_creada ON lista_espera(creada_en DESC);
