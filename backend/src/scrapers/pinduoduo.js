const BaseScraper = require('./base');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class PinduoduoScraper extends BaseScraper {
  constructor() {
    super('拼多多');
  }

  async scrape(url) {
    try {
      logger.info(`开始爬取拼多多商品: ${url}`);
      
      // 拼多多需要特殊处理，通常需要渲染JavaScript
      // 这里提供基本的静态抓取，实际可能需要Puppeteer
      const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://mobile.yangkeduo.com/',
        'Connection': 'keep-alive'
      };

      // 获取页面内容
      const html = await this.fetchPage(url, { headers });
      const $ = cheerio.load(html);

      // 解析商品信息
      const product = {
        title: this.extractTitle($),
        price: this.extractPrice($),
        image: this.extractImage($),
        brand: this.extractBrand($),
        model: this.extractModel($),
        specifications: this.extractSpecifications($),
        description: this.extractDescription($),
        sales: this.extractSales($),
        rating: this.extractRating($),
        reviewCount: this.extractReviewCount($),
        availability: this.extractAvailability($),
        params: this.extractParams($)
      };

      logger.info(`拼多多商品爬取成功: ${product.title}`);
      return product;

    } catch (error) {
      logger.error(`拼多多商品爬取失败 [${url}]:`, error);
      
      // 拼多多可能需要更复杂的处理，这里返回基本信息
      logger.info('拼多多商品解析失败，返回基础信息');
      return this.generateFallbackProduct(url);
    }
  }

  // 提取商品标题
  extractTitle($) {
    const selectors = [
      '.goods-title',
      '.product-title',
      'h1.title',
      '.item-title'
    ];
    
    return this.cleanText(this.extractBySelectors($, selectors)) || '未知商品';
  }

  // 提取商品价格
  extractPrice($) {
    const selectors = [
      '.price .current-price',
      '.goods-price .price',
      '.price-num',
      '.current'
    ];
    
    const priceText = this.extractBySelectors($, selectors);
    return this.normalizePrice(priceText);
  }

  // 提取商品图片
  extractImage($) {
    const selectors = [
      '.goods-image img',
      '.product-image img',
      '.main-pic img'
    ];
    
    for (const selector of selectors) {
      const img = $(selector).first();
      if (img.length) {
        let src = img.attr('src') || img.attr('data-src');
        if (src) {
          if (src.startsWith('//')) src = 'https:' + src;
          return src;
        }
      }
    }
    
    return '';
  }

  // 提取品牌信息
  extractBrand($) {
    const selectors = [
      '.brand-name',
      '.store-name',
      '.shop-name'
    ];
    
    return this.extractBySelectors($, selectors) || '';
  }

  // 提取型号信息
  extractModel($) {
    // 拼多多通常不直接显示型号，从规格中提取
    return '';
  }

  // 提取规格参数
  extractSpecifications($) {
    const specs = {};
    
    // 从商品描述或参数中提取
    $('.spec-list li').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const colonIndex = text.indexOf('：') || text.indexOf(':');
      
      if (colonIndex > -1) {
        const key = text.substring(0, colonIndex).trim();
        const value = text.substring(colonIndex + 1).trim();
        if (key && value) {
          specs[key] = value;
        }
      }
    });

    return specs;
  }

  // 提取商品描述
  extractDescription($) {
    const selectors = [
      '.goods-desc',
      '.product-desc',
      '.description'
    ];
    
    return this.cleanText(this.extractBySelectors($, selectors)) || '';
  }

  // 提取销量信息
  extractSales($) {
    const selectors = [
      '.sales-count',
      '.sold-count',
      '.sales'
    ];
    
    const salesText = this.extractBySelectors($, selectors);
    return this.extractNumber(salesText);
  }

  // 提取评分信息
  extractRating($) {
    const selectors = [
      '.rating-score',
      '.star-score',
      '.score'
    ];
    
    const ratingText = this.extractBySelectors($, selectors);
    return this.extractNumber(ratingText);
  }

  // 提取评价数量
  extractReviewCount($) {
    const selectors = [
      '.review-count',
      '.comment-count',
      '.reviews'
    ];
    
    const reviewText = this.extractBySelectors($, selectors);
    return this.extractNumber(reviewText);
  }

  // 提取库存状态
  extractAvailability($) {
    const stockSelectors = [
      '.buy-btn',
      '.add-cart',
      '.purchase'
    ];
    
    // 检查购买按钮
    if ($(stockSelectors.join(', ')).length > 0) {
      return 'in_stock';
    }
    
    return 'unknown';
  }

  // 提取其他参数
  extractParams($) {
    const params = {};
    
    // 提取SKU选择参数
    $('.sku-item').each((i, elem) => {
      const $elem = $(elem);
      const label = $elem.find('.sku-label').text().trim();
      const value = $elem.find('.selected').text().trim() || 
                   $elem.find('.sku-value').first().text().trim();
      
      if (label && value) {
        params[label] = value;
      }
    });

    return params;
  }

  // 生成备用商品信息（当解析失败时）
  generateFallbackProduct(url) {
    // 从URL中提取商品ID生成基础信息
    const goodsIdMatch = url.match(/goods_id[=\/](\d+)/);
    const goodsId = goodsIdMatch ? goodsIdMatch[1] : 'unknown';
    
    return {
      title: `拼多多商品 ${goodsId}`,
      price: '0.00',
      image: '',
      brand: '',
      model: '',
      specifications: {},
      description: '该商品信息暂时无法获取，请直接访问拼多多查看详情',
      sales: 0,
      rating: 0,
      reviewCount: 0,
      availability: 'unknown',
      params: {
        '提示': '需要访问拼多多官网获取完整信息'
      }
    };
  }
}

module.exports = PinduoduoScraper;