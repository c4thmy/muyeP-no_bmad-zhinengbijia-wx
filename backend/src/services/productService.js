const urlParser = require('../utils/urlParser');
const scrapers = require('../scrapers');
const database = require('../utils/database');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const crypto = require('crypto');

class ProductService {
  // 解析单个商品
  async parseProduct(url) {
    try {
      // 验证和清理URL
      const urlInfo = urlParser.parseUrl(url);
      if (!urlInfo.valid) {
        throw new Error(`不支持的商品链接: ${urlInfo.error}`);
      }

      // 生成商品ID
      const productId = this.generateProductId(url);

      // 检查缓存
      const cached = await cache.get(`product:${productId}`);
      if (cached) {
        logger.info(`从缓存获取商品数据: ${productId}`);
        return JSON.parse(cached);
      }

      // 获取对应平台的爬虫
      const scraper = scrapers.getScraper(urlInfo.platform);
      if (!scraper) {
        throw new Error(`暂不支持 ${urlInfo.platform} 平台`);
      }

      // 爬取商品数据
      const productData = await scraper.scrape(urlInfo.cleanUrl);
      
      // 标准化数据格式
      const normalizedProduct = this.normalizeProductData(productData, urlInfo, productId);

      // 保存到数据库
      await database.saveProduct(normalizedProduct);

      // 保存到缓存（缓存1小时）
      await cache.set(`product:${productId}`, JSON.stringify(normalizedProduct), 3600);

      logger.info(`商品解析成功: ${normalizedProduct.title}`);
      return normalizedProduct;

    } catch (error) {
      logger.error(`商品解析失败 [${url}]:`, error);
      throw new Error(`商品解析失败: ${error.message}`);
    }
  }

  // 批量解析商品
  async parseMultipleProducts(urls) {
    const results = [];
    const errors = [];

    for (const url of urls) {
      try {
        const product = await this.parseProduct(url);
        results.push(product);
      } catch (error) {
        errors.push({ url, error: error.message });
        logger.warn(`批量解析中单个商品失败 [${url}]: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      logger.warn(`批量解析完成，${results.length} 成功，${errors.length} 失败`);
    }

    return {
      products: results,
      errors,
      summary: {
        total: urls.length,
        success: results.length,
        failed: errors.length
      }
    };
  }

  // 获取价格历史
  async getPriceHistory(productId, days = 30) {
    try {
      const history = await database.getPriceHistory(productId, days);
      return {
        productId,
        days,
        history,
        trends: this.analyzePriceTrends(history)
      };
    } catch (error) {
      logger.error(`获取价格历史失败 [${productId}]:`, error);
      throw new Error('价格历史获取失败');
    }
  }

  // 根据ID获取商品
  async getProductById(productId) {
    try {
      // 先检查缓存
      const cached = await cache.get(`product:${productId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // 从数据库获取
      const product = await database.getProductById(productId);
      if (!product) {
        throw new Error('商品不存在');
      }

      // 更新缓存
      await cache.set(`product:${productId}`, JSON.stringify(product), 3600);
      
      return product;
    } catch (error) {
      logger.error(`获取商品详情失败 [${productId}]:`, error);
      throw error;
    }
  }

  // 生成商品ID
  generateProductId(url) {
    return crypto.createHash('md5').update(url).digest('hex').substring(0, 16);
  }

  // 标准化商品数据
  normalizeProductData(rawData, urlInfo, productId) {
    return {
      id: productId,
      title: rawData.title || '未知商品',
      price: this.normalizePrice(rawData.price),
      image: rawData.image || '',
      platform: urlInfo.platform,
      platformLogo: this.getPlatformLogo(urlInfo.platform),
      originalLink: urlInfo.originalUrl,
      cleanLink: urlInfo.cleanUrl,
      params: rawData.params || {},
      brand: rawData.brand || '',
      model: rawData.model || '',
      specifications: rawData.specifications || {},
      description: rawData.description || '',
      sales: rawData.sales || 0,
      rating: rawData.rating || 0,
      reviewCount: rawData.reviewCount || 0,
      availability: rawData.availability || 'unknown',
      parseTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  // 价格标准化
  normalizePrice(price) {
    if (!price) return '0.00';
    
    // 提取数字
    const numericPrice = parseFloat(price.toString().replace(/[^\d.]/g, ''));
    return isNaN(numericPrice) ? '0.00' : numericPrice.toFixed(2);
  }

  // 获取平台Logo
  getPlatformLogo(platform) {
    const logos = {
      '淘宝': '/images/taobao.png',
      '天猫': '/images/tmall.png',
      '京东': '/images/jd.png',
      '拼多多': '/images/pdd.png'
    };
    return logos[platform] || '/images/default.png';
  }

  // 分析价格趋势
  analyzePriceTrends(history) {
    if (!history || history.length < 2) {
      return { trend: 'stable', change: 0, analysis: '数据不足' };
    }

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const change = latest.price - previous.price;
    const changePercent = ((change / previous.price) * 100).toFixed(2);

    let trend = 'stable';
    if (change > 0) trend = 'up';
    if (change < 0) trend = 'down';

    return {
      trend,
      change: change.toFixed(2),
      changePercent,
      analysis: this.generateTrendAnalysis(trend, changePercent)
    };
  }

  // 生成趋势分析
  generateTrendAnalysis(trend, changePercent) {
    const absChange = Math.abs(parseFloat(changePercent));
    
    if (trend === 'up') {
      if (absChange > 10) return `价格大幅上涨 ${changePercent}%`;
      if (absChange > 5) return `价格明显上涨 ${changePercent}%`;
      return `价格小幅上涨 ${changePercent}%`;
    } else if (trend === 'down') {
      if (absChange > 10) return `价格大幅下跌 ${changePercent}%`;
      if (absChange > 5) return `价格明显下跌 ${changePercent}%`;
      return `价格小幅下跌 ${changePercent}%`;
    }
    
    return '价格保持稳定';
  }
}

module.exports = new ProductService();