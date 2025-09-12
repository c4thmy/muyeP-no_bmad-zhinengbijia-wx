const BaseScraper = require('./base');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class JDScraper extends BaseScraper {
  constructor() {
    super('京东');
  }

  async scrape(url) {
    try {
      logger.info(`开始爬取京东商品: ${url}`);
      
      // 设置京东特定的请求头
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.jd.com/',
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

      logger.info(`京东商品爬取成功: ${product.title}`);
      return product;

    } catch (error) {
      logger.error(`京东商品爬取失败 [${url}]:`, error);
      throw new Error(`京东商品解析失败: ${error.message}`);
    }
  }

  // 提取商品标题
  extractTitle($) {
    const selectors = [
      '.sku-name',
      '#name h1',
      '.product-intro .p-name a',
      '.itemInfo-wrap .sku-name'
    ];
    
    return this.cleanText(this.extractBySelectors($, selectors)) || '未知商品';
  }

  // 提取商品价格
  extractPrice($) {
    const selectors = [
      '.price .p-price .price',
      '#jd-price',
      '.summary-price .p-price',
      '.price-container .current-price'
    ];
    
    const priceText = this.extractBySelectors($, selectors);
    return this.normalizePrice(priceText);
  }

  // 提取商品图片
  extractImage($) {
    const selectors = [
      '#spec-img',
      '.preview .jqzoom img',
      '.product-intro .preview img',
      '.main-img img'
    ];
    
    for (const selector of selectors) {
      const img = $(selector).first();
      if (img.length) {
        let src = img.attr('src') || img.attr('data-lazy-img') || img.attr('data-src');
        if (src) {
          // 处理相对路径
          if (src.startsWith('//')) src = 'https:' + src;
          if (src.includes('n0.jpg')) src = src.replace('n0.jpg', 'n1.jpg'); // 获取更高清图片
          return src;
        }
      }
    }
    
    return '';
  }

  // 提取品牌信息
  extractBrand($) {
    const selectors = [
      '.parameter2 li:contains("品牌") .parameter-value',
      '.p-parameter .brand',
      '.brand-name',
      '.crumb-wrap .brand'
    ];
    
    return this.extractBySelectors($, selectors) || '';
  }

  // 提取型号信息
  extractModel($) {
    const selectors = [
      '.parameter2 li:contains("型号") .parameter-value',
      '.parameter2 li:contains("商品型号") .parameter-value',
      '.model-info'
    ];
    
    return this.extractBySelectors($, selectors) || '';
  }

  // 提取规格参数
  extractSpecifications($) {
    const specs = {};
    
    // 从参数表中提取规格
    $('.parameter2 li').each((i, elem) => {
      const $elem = $(elem);
      const keyElem = $elem.find('.parameter-key');
      const valueElem = $elem.find('.parameter-value');
      
      if (keyElem.length && valueElem.length) {
        const key = keyElem.text().trim().replace('：', '').replace(':', '');
        const value = valueElem.text().trim();
        
        if (key && value) {
          specs[key] = value;
        }
      }
    });

    // 从Ptable中提取更多参数
    $('.Ptable tbody tr').each((i, elem) => {
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
      '.detail .detail-content',
      '.product-detail-desc',
      '.item-desc'
    ];
    
    return this.cleanText(this.extractBySelectors($, selectors)) || '';
  }

  // 提取销量信息
  extractSales($) {
    const selectors = [
      '.comment-item .comment-count',
      '.sales-count',
      '.comment-count .count'
    ];
    
    const salesText = this.extractBySelectors($, selectors);
    return this.extractNumber(salesText);
  }

  // 提取评分信息
  extractRating($) {
    const selectors = [
      '.comment-item .comment-score .score',
      '.rate-score',
      '.product-score'
    ];
    
    const ratingText = this.extractBySelectors($, selectors);
    return this.extractNumber(ratingText);
  }

  // 提取评价数量
  extractReviewCount($) {
    const selectors = [
      '.comment-item .comment-count',
      '.review-count .count',
      '.comment-tab .count'
    ];
    
    const reviewText = this.extractBySelectors($, selectors);
    return this.extractNumber(reviewText);
  }

  // 提取库存状态
  extractAvailability($) {
    const stockSelectors = [
      '#InitCartUrl',
      '.btn-addtocart',
      '.stock-info'
    ];
    
    // 检查是否有购买按钮
    if ($('#InitCartUrl').length || $('.btn-addtocart').length) {
      return 'in_stock';
    }
    
    // 检查缺货信息
    const stockText = $('.stock-info').text();
    if (stockText.includes('缺货') || stockText.includes('无货')) {
      return 'out_of_stock';
    }
    
    return 'unknown';
  }

  // 提取其他参数
  extractParams($) {
    const params = {};
    
    // 提取选择项参数
    $('.choose-attrs .choose-attr').each((i, elem) => {
      const $elem = $(elem);
      const label = $elem.find('.dt').text().trim();
      const selectedValue = $elem.find('.selected').text().trim() || 
                           $elem.find('.choose-item').first().text().trim();
      
      if (label && selectedValue) {
        params[label] = selectedValue;
      }
    });

    return params;
  }
}

module.exports = JDScraper;