const mysql = require('mysql2/promise');
const logger = require('./logger');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.connected = false;
  }

  // 初始化数据库连接池
  async connect() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'smart_compare',
        charset: 'utf8mb4',
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        multipleStatements: true
      });

      // 测试连接
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.connected = true;
      logger.info('数据库连接池创建成功');
      
      // 初始化数据库表
      await this.initTables();
      
      return true;
    } catch (error) {
      logger.error('数据库连接失败:', error);
      this.connected = false;
      return false;
    }
  }

  // 初始化数据库表
  async initTables() {
    const createTablesSQL = `
      -- 商品表
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        platform VARCHAR(20) NOT NULL,
        platform_logo VARCHAR(200),
        url TEXT NOT NULL,
        clean_url TEXT,
        image_url TEXT,
        brand VARCHAR(100),
        model VARCHAR(100),
        description TEXT,
        sales INT DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 0.00,
        review_count INT DEFAULT 0,
        availability ENUM('in_stock', 'out_of_stock', 'unknown') DEFAULT 'unknown',
        specifications JSON,
        params JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_platform (platform),
        INDEX idx_title (title(100)),
        INDEX idx_created_at (created_at),
        INDEX idx_price (price)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 价格历史表
      CREATE TABLE IF NOT EXISTS price_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        availability ENUM('in_stock', 'out_of_stock', 'unknown') DEFAULT 'unknown',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_recorded_at (recorded_at),
        INDEX idx_product_time (product_id, recorded_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 用户收藏表（为未来功能预留）
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_product (user_id, product_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 价格提醒表（为未来功能预留）
      CREATE TABLE IF NOT EXISTS price_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        target_price DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        triggered_at TIMESTAMP NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_product_id (product_id),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 系统日志表
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level ENUM('error', 'warn', 'info', 'debug') NOT NULL,
        message TEXT NOT NULL,
        meta JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level (level),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await this.pool.execute(createTablesSQL);
      logger.info('数据库表初始化成功');
    } catch (error) {
      logger.error('数据库表初始化失败:', error);
      throw error;
    }
  }

  // 保存商品信息
  async saveProduct(product) {
    const sql = `
      INSERT INTO products (
        id, title, price, platform, platform_logo, url, clean_url, image_url,
        brand, model, description, sales, rating, review_count, availability,
        specifications, params
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        price = VALUES(price),
        image_url = VALUES(image_url),
        brand = VALUES(brand),
        model = VALUES(model),
        description = VALUES(description),
        sales = VALUES(sales),
        rating = VALUES(rating),
        review_count = VALUES(review_count),
        availability = VALUES(availability),
        specifications = VALUES(specifications),
        params = VALUES(params),
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      product.id,
      product.title,
      parseFloat(product.price) || 0.00,
      product.platform,
      product.platformLogo,
      product.originalLink,
      product.cleanLink,
      product.image,
      product.brand || null,
      product.model || null,
      product.description || null,
      product.sales || 0,
      parseFloat(product.rating) || 0.00,
      product.reviewCount || 0,
      product.availability || 'unknown',
      JSON.stringify(product.specifications || {}),
      JSON.stringify(product.params || {})
    ];

    try {
      const [result] = await this.pool.execute(sql, values);
      
      // 保存价格历史
      await this.savePriceHistory(product.id, parseFloat(product.price), product.availability);
      
      logger.info(`商品保存成功: ${product.title} (${product.id})`);
      return result;
    } catch (error) {
      logger.error(`商品保存失败 [${product.id}]:`, error);
      throw error;
    }
  }

  // 保存价格历史
  async savePriceHistory(productId, price, availability = 'unknown') {
    const sql = `
      INSERT INTO price_history (product_id, price, availability)
      VALUES (?, ?, ?)
    `;

    try {
      const [result] = await this.pool.execute(sql, [productId, price, availability]);
      return result;
    } catch (error) {
      logger.error(`价格历史保存失败 [${productId}]:`, error);
      throw error;
    }
  }

  // 根据ID获取商品
  async getProductById(productId) {
    const sql = `
      SELECT * FROM products WHERE id = ?
    `;

    try {
      const [rows] = await this.pool.execute(sql, [productId]);
      
      if (rows.length > 0) {
        const product = rows[0];
        // 解析JSON字段
        product.specifications = JSON.parse(product.specifications || '{}');
        product.params = JSON.parse(product.params || '{}');
        return product;
      }
      
      return null;
    } catch (error) {
      logger.error(`商品查询失败 [${productId}]:`, error);
      throw error;
    }
  }

  // 获取价格历史
  async getPriceHistory(productId, days = 30) {
    const sql = `
      SELECT price, availability, recorded_at
      FROM price_history
      WHERE product_id = ? AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY recorded_at ASC
    `;

    try {
      const [rows] = await this.pool.execute(sql, [productId, days]);
      return rows.map(row => ({
        price: parseFloat(row.price),
        availability: row.availability,
        date: row.recorded_at
      }));
    } catch (error) {
      logger.error(`价格历史查询失败 [${productId}]:`, error);
      throw error;
    }
  }

  // 搜索商品
  async searchProducts(keyword, platform = null, limit = 20, offset = 0) {
    let sql = `
      SELECT * FROM products
      WHERE title LIKE ?
    `;
    const params = [`%${keyword}%`];

    if (platform) {
      sql += ` AND platform = ?`;
      params.push(platform);
    }

    sql += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
      const [rows] = await this.pool.execute(sql, params);
      
      return rows.map(product => {
        product.specifications = JSON.parse(product.specifications || '{}');
        product.params = JSON.parse(product.params || '{}');
        return product;
      });
    } catch (error) {
      logger.error(`商品搜索失败 [${keyword}]:`, error);
      throw error;
    }
  }

  // 获取热门商品
  async getPopularProducts(platform = null, limit = 10) {
    let sql = `
      SELECT * FROM products
      WHERE sales > 0
    `;
    const params = [];

    if (platform) {
      sql += ` AND platform = ?`;
      params.push(platform);
    }

    sql += ` ORDER BY sales DESC, rating DESC LIMIT ?`;
    params.push(limit);

    try {
      const [rows] = await this.pool.execute(sql, params);
      
      return rows.map(product => {
        product.specifications = JSON.parse(product.specifications || '{}');
        product.params = JSON.parse(product.params || '{}');
        return product;
      });
    } catch (error) {
      logger.error('热门商品查询失败:', error);
      throw error;
    }
  }

  // 获取统计信息
  async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT platform) as platforms,
        AVG(price) as avg_price,
        MAX(price) as max_price,
        MIN(price) as min_price,
        SUM(sales) as total_sales
      FROM products
    `;

    try {
      const [rows] = await this.pool.execute(sql);
      return rows[0];
    } catch (error) {
      logger.error('统计信息查询失败:', error);
      throw error;
    }
  }

  // 清理过期数据
  async cleanupOldData(days = 90) {
    const sql = `
      DELETE FROM price_history 
      WHERE recorded_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    try {
      const [result] = await this.pool.execute(sql, [days]);
      logger.info(`清理过期数据完成，删除 ${result.affectedRows} 条价格历史记录`);
      return result.affectedRows;
    } catch (error) {
      logger.error('清理过期数据失败:', error);
      throw error;
    }
  }

  // 检查连接状态
  isConnected() {
    return this.connected && this.pool;
  }

  // 关闭连接池
  async disconnect() {
    if (this.pool) {
      try {
        await this.pool.end();
        logger.info('数据库连接池已关闭');
      } catch (error) {
        logger.error('关闭数据库连接池失败:', error);
      } finally {
        this.pool = null;
        this.connected = false;
      }
    }
  }

  // 执行原始SQL查询
  async query(sql, params = []) {
    if (!this.isConnected()) {
      throw new Error('数据库未连接');
    }

    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('SQL查询执行失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const database = new DatabaseManager();

// 启动时自动连接
database.connect().catch(error => {
  logger.error('数据库初始化失败:', error);
});

module.exports = database;