const BaseScraper = require('./base');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class TaobaoScraper extends BaseScraper {
  constructor() {
    super('淘宝');
  }

  async scrape(url) {
    try {
      logger.info(`开始爬取淘宝商品: ${url}`);
      
      // 设置淘宝特定的请求头
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
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

      logger.info(`淘宝商品爬取成功: ${product.title}`);
      return product;

    } catch (error) {
      logger.error(`淘宝商品爬取失败 [${url}]:`, error);
      throw new Error(`淘宝商品解析失败: ${error.message}`);
    }
  }

  // 提取商品标题
  extractTitle($) {
    const selectors = [
      '.tb-detail-hd h1',
      '.item-title-text',
      'h1[data-spm="1000983"]',
      '.tb-main-title'
    ];
    
    return this.extractBySelectors($, selectors) || '未知商品';
  }

  // 提取商品价格
  extractPrice($) {
    const selectors = [
      '.tm-price-panel .tm-price',
      '.tb-rmb-num',
      '.price .notranslate',
      '.tm-promo-price .tm-price'
    ];
    
    const priceText = this.extractBySelectors($, selectors);
    return this.normalizePrice(priceText);
  }

  // 提取商品图片
  extractImage($) {
    const selectors = [
      '#J_ImgBooth img',
      '.tb-booth .tb-pic img',
      '.img-detail img'
    ];
    
    for (const selector of selectors) {
      const img = $(selector).first();
      if (img.length) {
        let src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
        if (src) {
          // 处理相对路径和协议
          if (src.startsWith('//')) src = 'https:' + src;
          if (src.startsWith('/')) src = 'https://img.alicdn.com' + src;
          return src;
        }
      }
    }
    
    return '';
  }

  // 提取品牌信息
  extractBrand($) {
    const selectors = [
      '.tb-property-cont .tm-clear:contains("品牌") .tb-property-value',
      '.attributes-list li:contains("品牌") .attrval',
      '.brand-name'
    ];
    
    return this.extractBySelectors($, selectors) || '';
  }

  // 提取型号信息
  extractModel($) {
    const selectors = [
      '.tb-property-cont .tm-clear:contains("型号") .tb-property-value',
      '.attributes-list li:contains("型号") .attrval'
    ];
    
    return this.extractBySelectors($, selectors) || '';
  }

  // 提取规格参数
  extractSpecifications($) {
    const specs = {};
    
    // 尝试从属性表中提取
    $('.tb-property-cont .tm-clear').each((i, elem) => {
      const $elem = $(elem);
      const key = $elem.find('.tb-property-type').text().trim().replace(':', '');
      const value = $elem.find('.tb-property-value').text().trim();
      
      if (key && value && key !== '品牌') {
        specs[key] = value;
      }
    });

    return specs;
  }

  // 提取商品描述
  extractDescription($) {
    const selectors = [
      '.tb-detail-desc',
      '.description',
      '.item-desc'
    ];
    
    return this.extractBySelectors($, selectors) || '';
  }

  // 提取销量信息
  extractSales($) {
    const selectors = [
      '.tb-count',
      '.sold-count',
      '.sales-amount'
    ];
    
    const salesText = this.extractBySelectors($, selectors);
    if (salesText) {
      const match = salesText.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    
    return 0;
  }

  // 提取评分信息
  extractRating($) {
    const selectors = [
      '.rate-score',
      '.rating-score',
      '.tb-rate .score'
    ];
    
    const ratingText = this.extractBySelectors($, selectors);
    return ratingText ? parseFloat(ratingText) : 0;
  }

  // 提取评价数量
  extractReviewCount($) {
    const selectors = [
      '.rate-count',
      '.review-count',
      '.comment-count'
    ];
    
    const reviewText = this.extractBySelectors($, selectors);
    if (reviewText) {
      const match = reviewText.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    
    return 0;
  }

  // 提取库存状态
  extractAvailability($) {
    const stockSelectors = [
      '.tb-action .tb-btn-buy',
      '.purchase-btn',
      '.stock-info'
    ];
    
    for (const selector of stockSelectors) {
      const elem = $(selector);
      if (elem.length && elem.text().includes('现货')) {
        return 'in_stock';
      }
      if (elem.length && elem.text().includes('缺货')) {
        return 'out_of_stock';
      }
    }
    
    return 'unknown';
  }

  // 提取其他参数
  extractParams($) {
    const params = {};
    
    // 提取关键参数
    $('.tb-key .tb-prop .tb-img').each((i, elem) => {
      const $elem = $(elem);
      const key = $elem.find('a').attr('title') || $elem.text().trim();
      if (key) {
        params[`选项${i + 1}`] = key;
      }
    });

    return params;
  }
}

module.exports = TaobaoScraper;