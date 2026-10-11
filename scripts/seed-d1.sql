-- Seed data for Leonas Shoop
-- Generated from src/data/products.json and src/data/config.json

-- Insert configuration
UPDATE site_config SET value = 'Leonas Shoop' WHERE key = 'nombre';
UPDATE site_config SET value = 'Ropa, zapatos y artículos variados de primera y segunda mano' WHERE key = 'slogan';
UPDATE site_config SET value = '5354704764' WHERE key = 'whatsapp';
UPDATE site_config SET value = '+53 54704764' WHERE key = 'whatsappVisible';
UPDATE site_config SET value = 'https://leonas-shoop.pages.dev' WHERE key = 'site';
UPDATE site_config SET value = 'CUP' WHERE key = 'moneda';
UPDATE site_config SET value = '$' WHERE key = 'simbolo';
UPDATE site_config SET value = 'Cuba' WHERE key = 'ubicacion';
UPDATE site_config SET value = 'Lunes a sabado: 9:00 AM - 8:00 PM' WHERE key = 'horario';
UPDATE site_config SET value = 'Entregas en la ciudad (coordinamos todo por WhatsApp).' WHERE key = 'entregas';
UPDATE site_config SET value = 'Efectivo al momento de la entrega.' WHERE key = 'pagos';
UPDATE site_config SET value = '{"facebook":"","instagram":"","tiktok":""}' WHERE key = 'redes';
UPDATE site_config SET value = '[{"slug":"ropa","nombre":"Ropa","icono":"ropa","descripcion":"Camisas, vestidos, jeans, blusas y mas."},{"slug":"zapatos","nombre":"Zapatos","icono":"zapatos","descripcion":"Zapatos, tenis y sandalias para todos."},{"slug":"accesorios","nombre":"Accesorios","icono":"accesorios","descripcion":"Bolsos, relojes, mochilas y complementos."},{"slug":"hogar","nombre":"Hogar","icono":"hogar","descripcion":"Articulos para el hogar."},{"slug":"otros","nombre":"Otros","icono":"otros","descripcion":"Articulos variados de segunda mano."}]' WHERE key = 'categorias';

-- Insert products
INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'camisa-floral',
  'Camisa floral',
  'ropa',
  180000,
  'nuevo',
  'disponible',
  'Camisa de algodon con estampado floral, tejido ligero y fresco. Perfecta para el dia a dia. Nueva, con etiqueta.',
  1,
  'camisa-floral',
  'Camisa floral | Leonas Shoop',
  'Camisa de algodon con estampado floral, tejido ligero y fresco. Perfecta para el dia a dia. Nueva, con etiqueta.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('camisa-floral', 'S', 5, 'CAMISA-FLORAL-S');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('camisa-floral', 'M', 5, 'CAMISA-FLORAL-M');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('camisa-floral', 'L', 5, 'CAMISA-FLORAL-L');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('camisa-floral', 'products/camisa-floral/camisa-floral.svg', 0, 'Camisa floral');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'jean-clasico',
  'Jeans clasico azul',
  'ropa',
  250000,
  'segundo-uso',
  'disponible',
  'Jeans azul de corte clasico en muy buen estado, sin rotos ni manchas. Segunda mano cuidada, talla real.',
  0,
  'jean-clasico',
  'Jeans clasico azul | Leonas Shoop',
  'Jeans azul de corte clasico en muy buen estado, sin rotos ni manchas. Segunda mano cuidada, talla real.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('jean-clasico', '28', 5, 'JEAN-CLASICO-28');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('jean-clasico', '30', 5, 'JEAN-CLASICO-30');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('jean-clasico', '32', 5, 'JEAN-CLASICO-32');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('jean-clasico', '34', 5, 'JEAN-CLASICO-34');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('jean-clasico', 'products/jean-clasico/jean-clasico.svg', 0, 'Jeans clasico azul');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'vestido-rojo',
  'Vestido rojo elegante',
  'ropa',
  320000,
  'segundo-uso',
  'disponible',
  'Vestido rojo para ocasiones especiales, usado pocas veces. Tejido en excelente estado, sin desgastes.',
  1,
  'vestido-rojo',
  'Vestido rojo elegante | Leonas Shoop',
  'Vestido rojo para ocasiones especiales, usado pocas veces. Tejido en excelente estado, sin desgastes.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('vestido-rojo', 'S', 5, 'VESTIDO-ROJO-S');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('vestido-rojo', 'M', 5, 'VESTIDO-ROJO-M');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('vestido-rojo', 'products/vestido-rojo/vestido-rojo.svg', 0, 'Vestido rojo elegante');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'blusa-seda',
  'Blusa de seda beige',
  'ropa',
  210000,
  'nuevo',
  'disponible',
  'Blusa beige con caida elegante, estilo oficina o salida. Nueva, sin usar.',
  0,
  'blusa-seda',
  'Blusa de seda beige | Leonas Shoop',
  'Blusa beige con caida elegante, estilo oficina o salida. Nueva, sin usar.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('blusa-seda', 'S', 5, 'BLUSA-SEDA-S');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('blusa-seda', 'M', 5, 'BLUSA-SEDA-M');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('blusa-seda', 'L', 5, 'BLUSA-SEDA-L');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('blusa-seda', 'products/blusa-seda/blusa-seda.svg', 0, 'Blusa de seda beige');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'chaqueta-jean',
  'Chaqueta de mezclilla',
  'ropa',
  280000,
  'segundo-uso',
  'disponible',
  'Chaqueta de mezclilla azul clasica, segunda mano en buen estado general. Ideal para el aire acondicionado o las noches.',
  0,
  'chaqueta-jean',
  'Chaqueta de mezclilla | Leonas Shoop',
  'Chaqueta de mezclilla azul clasica, segunda mano en buen estado general. Ideal para el aire acondicionado o las noches.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('chaqueta-jean', 'M', 5, 'CHAQUETA-JEAN-M');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('chaqueta-jean', 'L', 5, 'CHAQUETA-JEAN-L');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('chaqueta-jean', 'products/chaqueta-jean/chaqueta-jean.svg', 0, 'Chaqueta de mezclilla');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'polo-deportivo',
  'Polo deportivo',
  'ropa',
  120000,
  'nuevo',
  'vendido',
  'Polo deportivo transpirable. Nueva con etiqueta. Ya vendido! Escribenos por si llega otra talla.',
  0,
  'polo-deportivo',
  'Polo deportivo | Leonas Shoop',
  'Polo deportivo transpirable. Nueva con etiqueta. Ya vendido! Escribenos por si llega otra talla.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('polo-deportivo', 'M', 0, 'POLO-DEPORTIVO-M');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('polo-deportivo', 'L', 0, 'POLO-DEPORTIVO-L');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('polo-deportivo', 'XL', 0, 'POLO-DEPORTIVO-XL');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('polo-deportivo', 'products/polo-deportivo/polo-deportivo.svg', 0, 'Polo deportivo');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'zapatos-tacon',
  'Zapatos de tacon negro',
  'zapatos',
  420000,
  'nuevo',
  'disponible',
  'Zapatos de tacon negros, clasicos y versatiles. Nuevos, con caja. Tacos comodos de 7 cm.',
  1,
  'zapatos-tacon',
  'Zapatos de tacon negro | Leonas Shoop',
  'Zapatos de tacon negros, clasicos y versatiles. Nuevos, con caja. Tacos comodos de 7 cm.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('zapatos-tacon', '36', 5, 'ZAPATOS-TACON-36');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('zapatos-tacon', '37', 5, 'ZAPATOS-TACON-37');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('zapatos-tacon', '38', 5, 'ZAPATOS-TACON-38');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('zapatos-tacon', '39', 5, 'ZAPATOS-TACON-39');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('zapatos-tacon', '40', 5, 'ZAPATOS-TACON-40');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('zapatos-tacon', 'products/zapatos-tacon/zapatos-tacon.svg', 0, 'Zapatos de tacon negro');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'tenis-blancos',
  'Tenis blancos',
  'zapatos',
  380000,
  'segundo-uso',
  'disponible',
  'Tenis blancos en muy buen estado, suela sin desgaste. Segunda mano, limpios y listos para usar.',
  0,
  'tenis-blancos',
  'Tenis blancos | Leonas Shoop',
  'Tenis blancos en muy buen estado, suela sin desgaste. Segunda mano, limpios y listos para usar.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('tenis-blancos', '38', 5, 'TENIS-BLANCOS-38');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('tenis-blancos', '39', 5, 'TENIS-BLANCOS-39');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('tenis-blancos', '40', 5, 'TENIS-BLANCOS-40');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('tenis-blancos', '41', 5, 'TENIS-BLANCOS-41');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('tenis-blancos', '42', 5, 'TENIS-BLANCOS-42');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('tenis-blancos', '43', 5, 'TENIS-BLANCOS-43');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('tenis-blancos', 'products/tenis-blancos/tenis-blancos.svg', 0, 'Tenis blancos');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'sandalias-playa',
  'Sandalias de playa',
  'zapatos',
  150000,
  'nuevo',
  'disponible',
  'Sandalias comodas para la playa o el hogar. Nuevas, disponibles en varios colores.',
  0,
  'sandalias-playa',
  'Sandalias de playa | Leonas Shoop',
  'Sandalias comodas para la playa o el hogar. Nuevas, disponibles en varios colores.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('sandalias-playa', '36', 5, 'SANDALIAS-PLAYA-36');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('sandalias-playa', '37', 5, 'SANDALIAS-PLAYA-37');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('sandalias-playa', '38', 5, 'SANDALIAS-PLAYA-38');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('sandalias-playa', '39', 5, 'SANDALIAS-PLAYA-39');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('sandalias-playa', '40', 5, 'SANDALIAS-PLAYA-40');
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('sandalias-playa', '41', 5, 'SANDALIAS-PLAYA-41');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('sandalias-playa', 'products/sandalias-playa/sandalias-playa.svg', 0, 'Sandalias de playa');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'bolso-cuero',
  'Bolso de cuero',
  'accesorios',
  350000,
  'segundo-uso',
  'disponible',
  'Bolso de cuero color vino, con correa ajustable y cierre seguro. Segunda mano, solo una pieza disponible.',
  1,
  'bolso-cuero',
  'Bolso de cuero | Leonas Shoop',
  'Bolso de cuero color vino, con correa ajustable y cierre seguro. Segunda mano, solo una pieza disponible.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('bolso-cuero', 'Unica', 1, 'BOLSO-CUERO-UNICA');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('bolso-cuero', 'products/bolso-cuero/bolso-cuero.svg', 0, 'Bolso de cuero');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'reloj-classic',
  'Reloj clasico dorado',
  'accesorios',
  290000,
  'nuevo',
  'reservado',
  'Reloj con correa metalica dorada, funcionando perfecto. Reservado para un cliente; escribenos para lista de espera.',
  0,
  'reloj-classic',
  'Reloj clasico dorado | Leonas Shoop',
  'Reloj con correa metalica dorada, funcionando perfecto. Reservado para un cliente; escribenos para lista de espera.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('reloj-classic', 'Unica', 0, 'RELOJ-CLASSIC-UNICA');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('reloj-classic', 'products/reloj-classic/reloj-classic.svg', 0, 'Reloj clasico dorado');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'mochila-escolar',
  'Mochila escolar',
  'accesorios',
  190000,
  'nuevo',
  'disponible',
  'Mochila resistente con varios compartimentos, ideal para la escuela o el trabajo. Nueva.',
  0,
  'mochila-escolar',
  'Mochila escolar | Leonas Shoop',
  'Mochila resistente con varios compartimentos, ideal para la escuela o el trabajo. Nueva.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('mochila-escolar', 'Unica', 5, 'MOCHILA-ESCOLAR-UNICA');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('mochila-escolar', 'products/mochila-escolar/mochila-escolar.svg', 0, 'Mochila escolar');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'cortinas-lino',
  'Cortinas de lino',
  'hogar',
  220000,
  'nuevo',
  'disponible',
  'Juego de cortinas de lino natural, luz suave y caida elegante. Nuevas, en paquete.',
  0,
  'cortinas-lino',
  'Cortinas de lino | Leonas Shoop',
  'Juego de cortinas de lino natural, luz suave y caida elegante. Nuevas, en paquete.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('cortinas-lino', 'Unica', 5, 'CORTINAS-LINO-UNICA');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('cortinas-lino', 'products/cortinas-lino/cortinas-lino.svg', 0, 'Cortinas de lino');

INSERT OR REPLACE INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
VALUES (
  'tablero-ajedrez',
  'Tablero de ajedrez',
  'otros',
  170000,
  'segundo-uso',
  'disponible',
  'Tablero de ajedrez de madera con piezas completas. Segunda mano, todo en su lugar. Un clasico para regalar.',
  0,
  'tablero-ajedrez',
  'Tablero de ajedrez | Leonas Shoop',
  'Tablero de ajedrez de madera con piezas completas. Segunda mano, todo en su lugar. Un clasico para regalar.'
);
INSERT OR IGNORE INTO product_variants (product_id, talla, stock, sku)
VALUES ('tablero-ajedrez', 'Unica', 1, 'TABLERO-AJEDREZ-UNICA');
INSERT OR IGNORE INTO product_images (product_id, r2_key, orden, alt_text)
VALUES ('tablero-ajedrez', 'products/tablero-ajedrez/tablero-ajedrez.svg', 0, 'Tablero de ajedrez');

-- Reset order counter
UPDATE order_counter SET value = 0;