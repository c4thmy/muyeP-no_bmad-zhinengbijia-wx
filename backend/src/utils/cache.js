const redis = require('redis');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.client = null;
    this.connected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  // 连接Redis
  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis连接被拒绝');
            return new Error('Redis服务器连接被拒绝');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis重试时间超过1小时，停止重试');
            return new Error('重试时间超限');
          }
          if (options.attempt > 10) {
            logger.error('Redis重试次数超过10次，停止重试');
            return new Error('重试次数超限');
          }
          // 指数退避重试
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis连接成功');
        this.connected = true;
        this.retryCount = 0;
      });

      this.client.on('error', (error) => {
        logger.error('Redis连接错误:', error);
        this.connected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis连接已断开');
        this.connected = false;
      });

      this.client.on('reconnecting', () => {
        this.retryCount++;
        logger.info(`Redis重连中... (${this.retryCount}/${this.maxRetries})`);
      });

      await this.client.connect();
      return true;

    } catch (error) {
      logger.error('Redis连接失败:', error);
      this.connected = false;
      return false;
    }
  }

  // 检查连接状态
  isConnected() {
    return this.connected && this.client && this.client.isOpen;
  }

  // 设置缓存
  async set(key, value, ttl = 3600) {
    if (!this.isConnected()) {
      logger.warn('Redis未连接，跳过缓存设置');
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      logger.debug(`缓存设置成功: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`缓存设置失败 [${key}]:`, error);
      return false;
    }
  }

  // 获取缓存
  async get(key) {
    if (!this.isConnected()) {
      logger.warn('Redis未连接，跳过缓存获取');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`缓存命中: ${key}`);
        return JSON.parse(value);
      } else {
        logger.debug(`缓存未命中: ${key}`);
        return null;
      }
    } catch (error) {
      logger.error(`缓存获取失败 [${key}]:`, error);
      return null;
    }
  }

  // 删除缓存
  async del(key) {
    if (!this.isConnected()) {
      logger.warn('Redis未连接，跳过缓存删除');
      return false;
    }

    try {
      await this.client.del(key);
      logger.debug(`缓存删除成功: ${key}`);
      return true;
    } catch (error) {
      logger.error(`缓存删除失败 [${key}]:`, error);
      return false;
    }
  }

  // 检查缓存是否存在
  async exists(key) {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`缓存存在性检查失败 [${key}]:`, error);
      return false;
    }
  }

  // 设置过期时间
  async expire(key, ttl) {
    if (!this.isConnected()) {
      return false;
    }

    try {
      await this.client.expire(key, ttl);
      logger.debug(`缓存过期时间设置成功: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`缓存过期时间设置失败 [${key}]:`, error);
      return false;
    }
  }

  // 获取缓存剩余时间
  async ttl(key) {
    if (!this.isConnected()) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`获取缓存TTL失败 [${key}]:`, error);
      return -1;
    }
  }

  // 批量设置缓存
  async mset(keyValuePairs, ttl = 3600) {
    if (!this.isConnected()) {
      logger.warn('Redis未连接，跳过批量缓存设置');
      return false;
    }

    try {
      const pipeline = this.client.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        pipeline.setEx(key, ttl, serializedValue);
      }
      
      await pipeline.exec();
      logger.debug(`批量缓存设置成功: ${Object.keys(keyValuePairs).length} 个键`);
      return true;
    } catch (error) {
      logger.error('批量缓存设置失败:', error);
      return false;
    }
  }

  // 批量获取缓存
  async mget(keys) {
    if (!this.isConnected()) {
      logger.warn('Redis未连接，跳过批量缓存获取');
      return {};
    }

    try {
      const values = await this.client.mGet(keys);
      const result = {};
      
      keys.forEach((key, index) => {
        if (values[index]) {
          try {
            result[key] = JSON.parse(values[index]);
          } catch (parseError) {
            logger.error(`缓存值解析失败 [${key}]:`, parseError);
            result[key] = null;
          }
        } else {
          result[key] = null;
        }
      });

      logger.debug(`批量缓存获取完成: ${keys.length} 个键`);
      return result;
    } catch (error) {
      logger.error('批量缓存获取失败:', error);
      return {};
    }
  }

  // 清空所有缓存
  async flush() {
    if (!this.isConnected()) {
      logger.warn('Redis未连接，无法清空缓存');
      return false;
    }

    try {
      await this.client.flushDb();
      logger.info('缓存清空成功');
      return true;
    } catch (error) {
      logger.error('缓存清空失败:', error);
      return false;
    }
  }

  // 关闭连接
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis连接已关闭');
      } catch (error) {
        logger.error('Redis关闭连接失败:', error);
      } finally {
        this.client = null;
        this.connected = false;
      }
    }
  }

  // 获取缓存统计信息
  async getStats() {
    if (!this.isConnected()) {
      return null;
    }

    try {
      const info = await this.client.info('stats');
      return {
        connected: this.connected,
        totalConnections: info.total_connections_received,
        totalCommands: info.total_commands_processed,
        keyspaceHits: info.keyspace_hits,
        keyspaceMisses: info.keyspace_misses,
        hitRatio: info.keyspace_hits / (info.keyspace_hits + info.keyspace_misses)
      };
    } catch (error) {
      logger.error('获取缓存统计信息失败:', error);
      return null;
    }
  }
}

// 创建单例实例
const cache = new CacheManager();

// 启动时自动连接
cache.connect().catch(error => {
  logger.error('缓存初始化失败:', error);
});

module.exports = cache;