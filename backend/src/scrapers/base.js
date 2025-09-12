const axios = require('axios');
const logger = require('../utils/logger');

class BaseScraper {
  constructor(platform) {
    this.platform = platform;
    this.timeout = 30000; // 30秒超时
    this.retryCount = 3;   // 重试3次
    this.delay = 2000;     // 请求间隔2秒
  }

  // 获取页面内容
  async fetchPage(url, options = {}) {
    let lastError = null;
    
    for (let i = 0; i < this.retryCount; i++) {
      try {
        if (i > 0) {
          await this.sleep(this.delay * i); // 递增延迟
        }

        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            ...options.headers
          },
          ...options
        });

        if (response.status === 200) {
          return response.data;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        lastError = error;
        logger.warn(`爬取重试 ${i + 1}/${this.retryCount} [${url}]: ${error.message}`);
        
        if (i === this.retryCount - 1) {
          throw new Error(`页面获取失败，已重试 ${this.retryCount} 次: ${error.message}`);
        }
      }
    }
    
    throw lastError;
  }

  // 睡眠延迟
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取随机User-Agent
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // 通过多个选择器提取内容
  extractBySelectors($, selectors) {
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text) return text;
      }
    }
    return null;
  }

  // 价格标准化
  normalizePrice(priceText) {
    if (!priceText) return '0.00';
    
    // 移除所有非数字和小数点字符，保留第一个有效数字段
    const cleanPrice = priceText.toString()
      .replace(/[^\d.]/g, '') // 只保留数字和小数点
      .replace(/\.{2,}/g, '.') // 多个小数点合并为一个
      .replace(/^\./, '0.'); // 开头小数点补0
    
    const numPrice = parseFloat(cleanPrice);
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  }

  // 提取数字
  extractNumber(text) {
    if (!text) return 0;
    const match = text.toString().match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  // 清理文本
  cleanText(text) {
    if (!text) return '';
    return text.toString()
      .replace(/\s+/g, ' ') // 多个空白字符合并为一个空格
      .replace(/[\r\n\t]/g, ' ') // 替换换行符和制表符
      .trim();
  }

  // 验证URL格式
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 生成绝对URL
  resolveUrl(baseUrl, relativeUrl) {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return relativeUrl;
    }
  }

  // 抽象方法 - 子类必须实现
  async scrape(url) {
    throw new Error(`${this.platform}爬虫的scrape方法必须被子类实现`);
  }
}

module.exports = BaseScraper;