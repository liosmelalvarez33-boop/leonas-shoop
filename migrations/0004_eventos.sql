-- Migración 0004: eventos de analítica propia (embudo de conversión).

CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  pagina TEXT,
  producto_id TEXT,
  pedido_id TEXT,
  monto INTEGER,
  metodo TEXT,
  creada_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_creada ON eventos(creada_en DESC);

-- Embudo últimos 30 días por tipo.
CREATE VIEW IF NOT EXISTS eventos_embudo_30d AS
SELECT tipo, COUNT(*) as n, date(creada_en) as dia
FROM eventos
WHERE creada_en >= date('now', '-30 days')
GROUP BY tipo, date(creada_en)
ORDER BY dia ASC;
