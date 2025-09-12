const TaobaeScraper = require('./taobao');
const TmallScraper = require('./tmall');
const JDScraper = require('./jd');
const PinduoduoScraper = require('./pinduoduo');

class ScraperManager {
  constructor() {
    this.scrapers = {
      '淘宝': new TaobaeScraper(),
      '天猫': new TmallScraper(),
      '京东': new JDScraper(),
      '拼多多': new PinduoduoScraper()
    };
  }

  // 获取指定平台的爬虫
  getScraper(platform) {
    return this.scrapers[platform] || null;
  }

  // 获取所有支持的平台
  getSupportedPlatforms() {
    return Object.keys(this.scrapers);
  }

  // 检查平台是否支持
  isSupported(platform) {
    return platform in this.scrapers;
  }
}

module.exports = new ScraperManager();