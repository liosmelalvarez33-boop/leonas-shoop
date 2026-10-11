// D1 Database client with typed queries for Leonas Shoop
// Usage: import { db } from './db'; const products = await db.getProducts();

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw(): Promise<unknown[]>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
  error?: string;
}

export interface Product {
  id: string;
  titulo: string;
  categoria: string;
  precio: number; // centavos
  condicion: 'nuevo' | 'segundo-uso';
  estado: 'disponible' | 'reservado' | 'vendido';
  descripcion: string;
  destacado: number;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: string;
  talla: string;
  stock: number;
  sku: string;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: number;
  product_id: string;
  r2_key: string;
  r2_key_webp: string | null;
  r2_key_avif: string | null;
  orden: number;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface Order {
  id: string;
  numero: number;
  fecha: string;
  nombre: string;
  entrega: string;
  notas: string | null;
  total: number; // centavos
  estado: 'pendiente' | 'confirmado' | 'en_preparacion' | 'en_camino' | 'entregado' | 'cancelado';
  metodo_pago: 'efectivo' | 'transfermovil';
  pago_confirmado: number;
  pago_comprobante_r2_key: string | null;
  cliente_telefono: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: string;
  product_id: string | null;
  titulo: string;
  precio: number;
  cantidad: number;
  talla: string | null;
  imagen_r2_key: string | null;
  created_at: string;
}

export interface SiteConfig {
  key: string;
  value: string;
  updated_at: string;
}

export interface DailySummary {
  dia: string;
  total_pedidos: number;
  ingresos_totales: number;
  pagos_transfermovil: number;
  pagos_efectivo: number;
  ticket_promedio: number;
}

export interface TopProduct {
  product_id: string | null;
  titulo: string | null;
  categoria: string | null;
  unidades_vendidas: number;
  ingresos_totales: number;
  pedidos_con_producto: number;
}

// Create typed database client
export function createDb(db: D1Database) {
  return {
    // Products
    async getProducts(filters?: {
      categoria?: string;
      estado?: string;
      condicion?: string;
      destacado?: boolean;
      limit?: number;
      offset?: number;
      orderBy?: 'created_at' | 'precio' | 'titulo';
      orderDir?: 'ASC' | 'DESC';
    }): Promise<Product[]> {
      let query = 'SELECT * FROM products WHERE 1=1';
      const params: unknown[] = [];

      if (filters?.categoria) {
        query += ' AND categoria = ?';
        params.push(filters.categoria);
      }
      if (filters?.estado) {
        query += ' AND estado = ?';
        params.push(filters.estado);
      }
      if (filters?.condicion) {
        query += ' AND condicion = ?';
        params.push(filters.condicion);
      }
      if (filters?.destacado) {
        query += ' AND destacado = 1';
      }

      const orderBy = filters?.orderBy || 'created_at';
      const orderDir = filters?.orderDir || 'DESC';
      query += ` ORDER BY ${orderBy} ${orderDir}`;

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }
      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }

      const result = await db.prepare(query).bind(...params).all<Product>();
      return result.results;
    },

    async getProductById(id: string): Promise<Product | null> {
      return db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<Product>();
    },

    async getProductBySlug(slug: string): Promise<Product | null> {
      return db.prepare('SELECT * FROM products WHERE slug = ?').bind(slug).first<Product>();
    },

    async getProductWithDetails(id: string): Promise<{
      product: Product | null;
      variants: ProductVariant[];
      images: ProductImage[];
    }> {
      const product = await this.getProductById(id);
      if (!product) return { product: null, variants: [], images: [] };

      const [variants, images] = await Promise.all([
        db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY talla')
          .bind(id).all<ProductVariant>(),
        db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY orden')
          .bind(id).all<ProductImage>()
      ]);

      return { product, variants: variants.results, images: images.results };
    },

    async createProduct(product: Omit<Product, 'created_at' | 'updated_at'>): Promise<void> {
      await db.prepare(`
        INSERT INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug, meta_title, meta_description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        product.id, product.titulo, product.categoria, product.precio,
        product.condicion, product.estado, product.descripcion, product.destacado,
        product.slug, product.meta_title, product.meta_description
      ).run();
    },

    async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
      const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
      if (fields.length === 0) return;

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => (updates as Record<string, unknown>)[f]);
      values.push(id);

      await db.prepare(`UPDATE products SET ${setClause} WHERE id = ?`).bind(...values).run();
    },

    async deleteProduct(id: string): Promise<void> {
      await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    },

    // Variants
    async getVariants(productId: string): Promise<ProductVariant[]> {
      const result = await db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY talla')
        .bind(productId).all<ProductVariant>();
      return result.results;
    },

    async getVariant(productId: string, talla: string): Promise<ProductVariant | null> {
      return db.prepare('SELECT * FROM product_variants WHERE product_id = ? AND talla = ?')
        .bind(productId, talla).first<ProductVariant>();
    },

    async upsertVariant(variant: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
      await db.prepare(`
        INSERT INTO product_variants (product_id, talla, stock, sku)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(product_id, talla) DO UPDATE SET stock = excluded.stock, sku = excluded.sku
      `).bind(variant.product_id, variant.talla, variant.stock, variant.sku).run();
    },

    async updateVariantStock(productId: string, talla: string, delta: number): Promise<number> {
      // Atomic stock update with check
      const result = await db.prepare(`
        UPDATE product_variants 
        SET stock = stock + ?, updated_at = datetime('now')
        WHERE product_id = ? AND talla = ? AND stock + ? >= 0
        RETURNING stock
      `).bind(delta, productId, talla, delta).first<{ stock: number }>();
      return result?.stock ?? -1;
    },

    // Images
    async getImages(productId: string): Promise<ProductImage[]> {
      const result = await db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY orden')
        .bind(productId).all<ProductImage>();
      return result.results;
    },

    async addImage(image: Omit<ProductImage, 'id' | 'created_at'>): Promise<number> {
      const result = await db.prepare(`
        INSERT INTO product_images (product_id, r2_key, r2_key_webp, r2_key_avif, orden, alt_text, width, height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `).bind(
        image.product_id, image.r2_key, image.r2_key_webp, image.r2_key_avif,
        image.orden, image.alt_text, image.width, image.height
      ).first<{ id: number }>();
      return result?.id ?? 0;
    },

    async updateImageR2Keys(id: number, webpKey: string, avifKey: string): Promise<void> {
      await db.prepare(`
        UPDATE product_images SET r2_key_webp = ?, r2_key_avif = ? WHERE id = ?
      `).bind(webpKey, avifKey, id).run();
    },

    async deleteImage(id: number): Promise<void> {
      await db.prepare('DELETE FROM product_images WHERE id = ?').bind(id).run();
    },

    async reorderImages(productId: string, imageIds: number[]): Promise<void> {
      const stmt = db.prepare('UPDATE product_images SET orden = ? WHERE id = ? AND product_id = ?');
      const batch = imageIds.map((id, index) => stmt.bind(index, id, productId));
      await db.batch(batch);
    },

    // Orders
    async createOrder(order: Omit<Order, 'created_at' | 'updated_at'>, items: Omit<OrderItem, 'id' | 'created_at' | 'order_id'>[]): Promise<string> {
      // Use transaction via batch
      const statements = [];

      statements.push(db.prepare(`
        INSERT INTO orders (id, numero, fecha, nombre, entrega, notas, total, estado, metodo_pago, pago_confirmado, cliente_telefono)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        order.id, order.numero, order.fecha, order.nombre, order.entrega,
        order.notas, order.total, order.estado, order.metodo_pago,
        order.pago_confirmado, order.cliente_telefono
      ));

      for (const item of items) {
        statements.push(db.prepare(`
          INSERT INTO order_items (order_id, product_id, titulo, precio, cantidad, talla, imagen_r2_key)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(order.id, item.product_id, item.titulo, item.precio, item.cantidad, item.talla, item.imagen_r2_key));
      }

      // Increment counter
      statements.push(db.prepare('UPDATE order_counter SET value = value + 1 WHERE id = 1'));

      await db.batch(statements);
      return order.id;
    },

    async getNextOrderNumber(): Promise<number> {
      const result = await db.prepare('UPDATE order_counter SET value = value + 1 WHERE id = 1 RETURNING value').first<{ value: number }>();
      return result?.value ?? 1;
    },

    async getOrders(filters?: {
      estado?: string;
      metodo_pago?: string;
      limit?: number;
      offset?: number;
      dateFrom?: string;
      dateTo?: string;
    }): Promise<Order[]> {
      let query = 'SELECT * FROM orders WHERE 1=1';
      const params: unknown[] = [];

      if (filters?.estado) {
        query += ' AND estado = ?';
        params.push(filters.estado);
      }
      if (filters?.metodo_pago) {
        query += ' AND metodo_pago = ?';
        params.push(filters.metodo_pago);
      }
      if (filters?.dateFrom) {
        query += ' AND fecha >= ?';
        params.push(filters.dateFrom);
      }
      if (filters?.dateTo) {
        query += ' AND fecha <= ?';
        params.push(filters.dateTo);
      }

      query += ' ORDER BY fecha DESC';

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }
      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }

      const result = await db.prepare(query).bind(...params).all<Order>();
      return result.results;
    },

    async getOrderById(id: string): Promise<Order | null> {
      return db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Order>();
    },

    async getOrderWithItems(id: string): Promise<{ order: Order | null; items: OrderItem[] }> {
      const order = await this.getOrderById(id);
      if (!order) return { order: null, items: [] };

      const itemsResult = await db.prepare('SELECT * FROM order_items WHERE order_id = ?')
        .bind(id).all<OrderItem>();

      return { order, items: itemsResult.results };
    },

    async updateOrderStatus(id: string, estado: Order['estado']): Promise<void> {
      await db.prepare('UPDATE orders SET estado = ? WHERE id = ?').bind(estado, id).run();
    },

    async confirmPayment(id: string, comprobanteKey?: string): Promise<void> {
      if (comprobanteKey) {
        await db.prepare('UPDATE orders SET pago_confirmado = 1, pago_comprobante_r2_key = ? WHERE id = ?')
          .bind(comprobanteKey, id).run();
      } else {
        await db.prepare('UPDATE orders SET pago_confirmado = 1 WHERE id = ?').bind(id).run();
      }
    },

    // Config
    async getConfig(key: string): Promise<string | null> {
      return db.prepare('SELECT value FROM site_config WHERE key = ?').bind(key).first<{ value: string }>()
        .then(r => r?.value ?? null);
    },

    async getAllConfig(): Promise<Record<string, string>> {
      const result = await db.prepare('SELECT key, value FROM site_config').all<{ key: string; value: string }>();
      return Object.fromEntries(result.results.map(r => [r.key, r.value]));
    },

    async setConfig(key: string, value: string): Promise<void> {
      await db.prepare(`
        INSERT INTO site_config (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).bind(key, value).run();
    },

    // Analytics
    async getDailySummary(days = 30): Promise<DailySummary[]> {
      const result = await db.prepare(`
        SELECT * FROM orders_daily_summary WHERE dia >= date('now', ?) ORDER BY dia DESC
      `).bind(`-${days} days`).all<DailySummary>();
      return result.results;
    },

    async getTopProducts(limit = 10): Promise<TopProduct[]> {
      const result = await db.prepare('SELECT * FROM top_products_sold LIMIT ?').bind(limit).all<TopProduct>();
      return result.results;
    },

    async getStats(): Promise<{
      totalProducts: number;
      totalOrders: number;
      totalRevenue: number;
      pendingOrders: number;
      lowStockProducts: number;
    }> {
      const [products, orders, revenue, pending, lowStock] = await Promise.all([
        db.prepare('SELECT COUNT(*) as c FROM products WHERE estado != "vendido"').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM orders WHERE estado != "cancelado"').first<{ c: number }>(),
        db.prepare('SELECT SUM(total) as s FROM orders WHERE estado NOT IN ("cancelado", "pendiente")').first<{ s: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM orders WHERE estado = "pendiente"').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM product_variants WHERE stock <= 2 AND stock > 0').first<{ c: number }>()
      ]);

      return {
        totalProducts: products?.c ?? 0,
        totalOrders: orders?.c ?? 0,
        totalRevenue: revenue?.s ?? 0,
        pendingOrders: pending?.c ?? 0,
        lowStockProducts: lowStock?.c ?? 0
      };
    },

    // Sessions
    async createSession(sessionId: string, expiresAt: string): Promise<void> {
      await db.prepare('INSERT INTO admin_sessions (id, expires_at) VALUES (?, ?)')
        .bind(sessionId, expiresAt).run();
    },

    async getSession(sessionId: string): Promise<{ id: string; expires_at: string } | null> {
      return db.prepare('SELECT id, expires_at FROM admin_sessions WHERE id = ? AND expires_at > datetime("now")')
        .bind(sessionId).first<{ id: string; expires_at: string }>();
    },

    async deleteSession(sessionId: string): Promise<void> {
      await db.prepare('DELETE FROM admin_sessions WHERE id = ?').bind(sessionId).run();
    },

    async cleanupExpiredSessions(): Promise<void> {
      await db.prepare('DELETE FROM admin_sessions WHERE expires_at <= datetime("now")').run();
    },

    // Rate limiting
    async checkRateLimit(key: string, max: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + windowSeconds;

      const existing = await db.prepare('SELECT count, expires_at FROM rate_limits WHERE key = ?')
        .bind(key).first<{ count: number; expires_at: string }>();

      if (existing && Math.floor(new Date(existing.expires_at).getTime() / 1000) > now) {
        if (existing.count >= max) {
          return { allowed: false, remaining: 0 };
        }
        await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
        return { allowed: true, remaining: max - existing.count - 1 };
      }

      await db.prepare(`
        INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET count = 1, expires_at = excluded.expires_at
      `).bind(key, new Date(expiresAt * 1000).toISOString()).run();

      return { allowed: true, remaining: max - 1 };
    },

    // Abandoned carts
    async saveAbandonedCart(cart: {
      id: string;
      session_id: string;
      items: unknown[];
      client_data: { nombre: string; entrega: string } | null;
      total: number;
    }): Promise<void> {
      await db.prepare(`
        INSERT INTO abandoned_carts (id, session_id, items, client_data, total)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET items = excluded.items, client_data = excluded.client_data, total = excluded.total
      `).bind(
        cart.id, cart.session_id, JSON.stringify(cart.items),
        cart.client_data ? JSON.stringify(cart.client_data) : null,
        cart.total
      ).run();
    },

    async getAbandonedCarts(limit = 50): Promise<Array<{
      id: string;
      session_id: string;
      items: unknown[];
      client_data: { nombre: string; entrega: string } | null;
      total: number;
      abandoned_at: string;
      recovered_at: string | null;
    }>> {
      const result = await db.prepare(`
        SELECT * FROM abandoned_carts WHERE recovered_at IS NULL ORDER BY abandoned_at DESC LIMIT ?
      `).bind(limit).all();
      return result.results as any[];
    },

    async markCartRecovered(id: string, method: string): Promise<void> {
      await db.prepare('UPDATE abandoned_carts SET recovered_at = datetime("now"), recovery_method = ? WHERE id = ?')
        .bind(method, id).run();
    }
  };
}

export type DbClient = ReturnType<typeof createDb>;