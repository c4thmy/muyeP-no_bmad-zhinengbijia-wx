const BaseScraper = require('./base');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class TmallScraper extends BaseScraper {
  constructor() {
    super('天猫');
  }

  async scrape(url) {
    try {
      logger.info(`开始爬取天猫商品: ${url}`);
      
      // 设置天猫特定的请求头
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.tmall.com/',
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

      logger.info(`天猫商品爬取成功: ${product.title}`);
      return product;

    } catch (error) {
      logger.error(`天猫商品爬取失败 [${url}]:`, error);
      throw new Error(`天猫商品解析失败: ${error.message}`);
    }
  }

  // 提取商品标题
  extractTitle($) {
    const selectors = [
      '.tb-detail-hd h1',
      'h1[data-spm]',
      '.item-title',
      '.tb-main-title'
    ];
    
    return this.cleanText(this.extractBySelectors($, selectors)) || '未知商品';
  }

  // 提取商品价格
  extractPrice($) {
    const selectors = [
      '.tm-price-panel .tm-price',
      '.tm-promo-price .tm-price',
      '.tb-rmb-num',
      '.price .notranslate'
    ];
    
    const priceText = this.extractBySelectors($, selectors);
    return this.normalizePrice(priceText);
  }

  // 提取商品图片
  extractImage($) {
    const selectors = [
      '#J_ImgBooth img',
      '.tb-booth .tb-pic img',
      '.J_TSaleProp img'
    ];
    
    for (const selector of selectors) {
      const img = $(selector).first();
      if (img.length) {
        let src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
        if (src) {
          // 处理相对路径和协议
          if (src.startsWith('//')) src = 'https:' + src;
          if (src.startsWith('/')) src = 'https://img.alicdn.com' + src;
          // 获取更大尺寸图片
          src = src.replace(/_\d+x\d+\./, '_800x800.');
          return src;
        }
      }
    }
    
    return '';
  }

  // 提取品牌信息
  extractBrand($) {
    const selectors = [
      '.tm-shop-name .slogo-shopname',
      '.tb-property-cont .tm-clear:contains("品牌") .tb-property-value',
      '.brand-name',
      '.brand-logo'
    ];
    
    return this.extractBySelectors($, selectors) || '';
  }

  // 提取型号信息
  extractModel($) {
    const selectors = [
      '.tb-property-cont .tm-clear:contains("型号") .tb-property-value',
      '.tb-property-cont .tm-clear:contains("货号") .tb-property-value',
      '.model-info'
    ];
    
    return this.extractBySelectors($, selectors) || '';
  }

  // 提取规格参数
  extractSpecifications($) {
    const specs = {};
    
    // 从属性表中提取
    $('.tb-property-cont .tm-clear').each((i, elem) => {
      const $elem = $(elem);
      const key = $elem.find('.tb-property-type').text().trim().replace(':', '');
      const value = $elem.find('.tb-property-value').text().trim();
      
      if (key && value && !key.includes('品牌')) {
        specs[key] = value;
      }
    });

    // 从详细参数表中提取
    $('.tm-tableAttr tbody tr').each((i, elem) => {
      const $elem = $(elem);
      const cells = $elem.find('td');
      
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        
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
      '.tb-detail-desc',
      '.tm-desc-detail',
      '.description'
    ];
    
    return this.cleanText(this.extractBySelectors($, selectors)) || '';
  }

  // 提取销量信息
  extractSales($) {
    const selectors = [
      '.tm-count',
      '.tb-count',
      '.sales-amount'
    ];
    
    const salesText = this.extractBySelectors($, selectors);
    return this.extractNumber(salesText);
  }

  // 提取评分信息
  extractRating($) {
    const selectors = [
      '.rate-score',
      '.tm-rate .score',
      '.rating-score'
    ];
    
    const ratingText = this.extractBySelectors($, selectors);
    return this.extractNumber(ratingText);
  }

  // 提取评价数量
  extractReviewCount($) {
    const selectors = [
      '.rate-count',
      '.tm-rate .count',
      '.review-count'
    ];
    
    const reviewText = this.extractBySelectors($, selectors);
    return this.extractNumber(reviewText);
  }

  // 提取库存状态
  extractAvailability($) {
    const stockSelectors = [
      '.tm-fcs-panel .tm-btn-buy',
      '.tm-action .tm-btn',
      '.purchase-btn'
    ];
    
    // 检查购买按钮是否存在且可用
    for (const selector of stockSelectors) {
      const btn = $(selector);
      if (btn.length) {
        const btnText = btn.text().trim();
        if (btnText.includes('立即购买') || btnText.includes('现货')) {
          return 'in_stock';
        }
        if (btnText.includes('缺货') || btnText.includes('无库存')) {
          return 'out_of_stock';
        }
      }
    }
    
    return 'unknown';
  }

  // 提取其他参数
  extractParams($) {
    const params = {};
    
    // 提取SKU选择参数
    $('.tb-key').each((i, elem) => {
      const $elem = $(elem);
      const label = $elem.find('.tb-metatit').text().trim();
      const selectedValue = $elem.find('.tb-selected').text().trim() ||
                           $elem.find('.tb-img a').first().attr('title') ||
                           $elem.find('.tb-prop a').first().text().trim();
      
      if (label && selectedValue) {
        params[label] = selectedValue;
      }
    });

    // 提取服务信息
    $('.tm-service .tm-service-item').each((i, elem) => {
      const $elem = $(elem);
      const service = $elem.text().trim();
      if (service) {
        params[`服务${i + 1}`] = service;
      }
    });

    return params;
  }
}

module.exports = TmallScraper;