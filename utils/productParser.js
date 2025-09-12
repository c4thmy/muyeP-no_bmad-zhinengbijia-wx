/**
 * 商品数据解析服务 - 真实抓取版
 * 从商品页面中抓取真实的商品详情信息
 */

const urlParser = require('./urlParser')
const urlResolver = require('./urlResolver')
const realProductScraper = require('./realProductScraper')

/**
 * 商品解析器 - 主类
 */
class ProductParser {
  constructor() {
    this.parsers = {
      TAOBAO: new RealTaobaoParser(),
      TMALL: new RealTmallParser(), 
      JD: new RealJDParser(),
      PDD: new RealPDDParser()
    }
    
    // 解析历史记录
    this.parseHistory = new Map()
    this.maxHistorySize = 100
  }

  /**
   * 解析商品信息 - 主入口方法
   * @param {string} originalUrl 原始商品链接
   * @returns {Promise<Object>} 商品信息
   */
  async parseProduct(originalUrl) {
    const startTime = Date.now()
    const parseId = this.generateParseId(originalUrl)
    
    try {
      console.log(`[商品解析] 开始解析: ${originalUrl}`)
      
      // 1. URL解析和重定向处理
      const urlResult = await urlResolver.resolveUrl(originalUrl)
      
      if (!urlResult.success) {
        throw new Error(urlResult.error)
      }

      console.log(`[URL解析] 解析结果:`, {
        原始链接: urlResult.originalUrl,
        最终链接: urlResult.finalUrl,
        平台: urlResult.platform?.name,
        是否短链接: urlResult.isShortLink,
        重定向路径: urlResult.redirectPath?.length || 1
      })

      // 2. 获取真实商品信息
      const productData = await this.extractRealProductInfo(urlResult)
      
      // 3. 数据标准化
      const normalizedProduct = this.normalizeProductData(productData, urlResult, originalUrl)
      
      // 4. 记录解析历史
      this.recordParseHistory(parseId, {
        success: true,
        duration: Date.now() - startTime,
        urlResult,
        product: normalizedProduct
      })

      console.log(`[商品解析] 解析成功: ${normalizedProduct.title} (${Date.now() - startTime}ms)`)
      return normalizedProduct

    } catch (error) {
      console.error(`[商品解析] 解析失败 [${originalUrl}]:`, error)
      
      // 记录失败历史
      this.recordParseHistory(parseId, {
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      })

      // 返回错误状态的商品数据
      return this.createErrorProduct(originalUrl, error.message)
    }
  }

  /**
   * 提取真实商品信息 - 从实际页面抓取
   * @param {Object} urlResult URL解析结果
   * @returns {Promise<Object>} 商品信息
   */
  async extractRealProductInfo(urlResult) {
    const { finalUrl, platform, isShortLink, extractedParams } = urlResult
    
    if (!platform) {
      throw new Error('无法识别商品平台')
    }

    console.log(`[真实解析] 开始从 ${platform.name} 页面抓取商品信息`)
    
    try {
      // 直接调用真实抓取服务
      const productInfo = await realProductScraper.scrapeProduct(finalUrl, platform)
      
      // 添加解析元数据
      productInfo._meta = {
        platform: platform.name,
        platformKey: platform.key,
        finalUrl,
        isShortLink,
        parseTime: new Date().toISOString(),
        extractedParams,
        scrapeMethod: 'real_page_scraping'
      }

      return productInfo

    } catch (error) {
      console.error(`[真实解析] ${platform.name} 页面抓取失败:`, error.message)
      throw new Error(`无法从商品页面获取真实信息: ${error.message}`)
    }
  }

  /**
   * 标准化商品数据
   * @param {Object} productInfo 原始商品信息
   * @param {Object} urlResult URL解析结果  
   * @param {string} originalUrl 原始链接
   * @returns {Object} 标准化后的商品信息
   */
  normalizeProductData(productInfo, urlResult, originalUrl) {
    const platform = urlResult.platform
    
    // 生成唯一ID
    const productId = this.generateProductId(productInfo, urlResult, originalUrl)
    
    return {
      id: productId,
      title: productInfo.title || '商品标题获取失败',
      price: this.normalizePrice(productInfo.price),
      originalPrice: this.normalizePrice(productInfo.originalPrice),
      image: productInfo.images && productInfo.images.length > 0 ? productInfo.images[0] : null,
      images: productInfo.images || [],
      platform: platform.name,
      platformKey: platform.key,
      originalLink: originalUrl,
      cleanLink: urlResult.finalUrl,
      finalUrl: urlResult.finalUrl,
      isShortLink: urlResult.isShortLink,
      brand: productInfo.brand || '',
      model: productInfo.model || '',
      specifications: productInfo.specifications || {},
      description: productInfo.description || '',
      shop: productInfo.shop || {},
      shopName: productInfo.shop?.name || '',
      location: productInfo.location || '',
      rating: this.normalizeRating(productInfo.rating),
      sales: this.normalizeSales(productInfo.sales),
      reviewCount: this.normalizeNumber(productInfo.reviewCount),
      availability: productInfo.availability || 'unknown',
      shipping: productInfo.shipping || '',
      warranty: productInfo.warranty || '',
      parseTime: new Date().toISOString(),
      success: true,
      scrapeSource: 'real_page',
      _meta: productInfo._meta
    }
  }

  /**
   * 生成商品唯一ID
   */
  generateProductId(productInfo, urlResult, originalUrl) {
    // 优先使用从URL提取的商品ID
    const extractedId = urlResult.extractedParams?.id || 
                       urlResult.extractedParams?.goods_id ||
                       productInfo.productId
    
    if (extractedId) {
      return `${urlResult.platform.key}_${extractedId}`
    }
    
    // 备用方案：基于URL生成哈希
    return `${urlResult.platform.key}_${this.generateUrlHash(originalUrl)}`
  }

  /**
   * 生成URL的哈希值
   */
  generateUrlHash(url) {
    let hash = 0
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString()
  }

  /**
   * 标准化价格
   */
  normalizePrice(price) {
    if (!price) return null
    
    const numPrice = parseFloat(String(price).replace(/[^\d.]/g, ''))
    return isNaN(numPrice) ? null : numPrice.toFixed(2)
  }

  /**
   * 标准化评分
   */
  normalizeRating(rating) {
    if (!rating) return null
    const numRating = parseFloat(rating)
    return (isNaN(numRating) || numRating < 0 || numRating > 5) ? null : numRating
  }

  /**
   * 标准化销量
   */
  normalizeSales(sales) {
    if (!sales) return null
    if (typeof sales === 'number') return sales
    
    const salesStr = String(sales)
    const match = salesStr.match(/(\d+(?:\.\d+)?)([万千]?)/)
    if (!match) return null
    
    let num = parseFloat(match[1])
    const unit = match[2]
    
    if (unit === '万') num *= 10000
    else if (unit === '千') num *= 1000
    
    return Math.floor(num)
  }

  /**
   * 标准化数字
   */
  normalizeNumber(value) {
    if (!value) return null
    const num = parseInt(String(value).replace(/[^\d]/g, ''))
    return isNaN(num) ? null : num
  }

  /**
   * 创建错误商品对象
   */
  createErrorProduct(url, error) {
    // 根据错误类型提供更详细的描述
    let errorDescription = '真实页面抓取失败'
    let errorType = 'scraping_failed'
    
    if (error.includes('404') || error.includes('不存在') || error.includes('已下架')) {
      errorDescription = '商品不存在或已下架'
      errorType = 'product_not_found'
    } else if (error.includes('访问受限') || error.includes('需要登录')) {
      errorDescription = '访问受限，需要登录或权限验证'
      errorType = 'access_denied'
    } else if (error.includes('超时') || error.includes('timeout')) {
      errorDescription = '网络超时，请稍后重试'
      errorType = 'network_timeout'
    } else if (error.includes('活动太火爆') || error.includes('前往京东APP')) {
      errorDescription = '该链接需要在APP中打开'
      errorType = 'app_required'
    } else if (error.includes('not in domain list') || 
               error.includes('域名不在') || 
               error.includes('请配置合法域名')) {
      errorDescription = '网络请求受限，需要配置域名白名单'
      errorType = 'domain_not_configured'
    }
    
    // 根据平台提供更准确的平台信息
    let platformInfo = this.getPlatformFromUrl(url)
    
    return {
      id: `error_${Date.now()}`,
      title: '商品解析失败',
      price: null,
      originalPrice: null,
      image: null,
      images: [],
      platform: platformInfo.name || '未知平台',
      platformKey: platformInfo.key || 'unknown',
      originalLink: url,
      cleanLink: url,
      finalUrl: url,
      isShortLink: false,
      brand: '',
      model: '',
      specifications: {},
      description: errorDescription,
      shop: {},
      shopName: '',
      location: '',
      rating: null,
      sales: null,
      reviewCount: null,
      availability: 'unknown',
      shipping: '',
      warranty: '',
      parseTime: new Date().toISOString(),
      success: false,
      error,
      errorType,
      scrapeSource: 'failed',
      _meta: {
        errorDetails: {
          originalError: error,
          errorType,
          timestamp: Date.now(),
          suggestion: this.getErrorSuggestion(errorType),
          isMiniprogramEnv: typeof wx !== 'undefined'
        }
      }
    }
  }

  /**
   * 从URL中推断平台信息
   */
  getPlatformFromUrl(url) {
    if (url.includes('jd.com')) {
      return { key: 'JD', name: '京东' }
    } else if (url.includes('tmall.com')) {
      return { key: 'TMALL', name: '天猫' }
    } else if (url.includes('taobao.com') || url.includes('tb.cn')) {
      return { key: 'TAOBAO', name: '淘宝' }
    } else if (url.includes('yangkeduo.com') || url.includes('pdd.')) {
      return { key: 'PDD', name: '拼多多' }
    }
    return { key: 'unknown', name: '未知平台' }
  }
  
  /**
   * 根据错误类型提供解决建议
   */
  getErrorSuggestion(errorType) {
    const suggestions = {
      'product_not_found': '请检查商品链接是否正确，或尝试使用其他商品链接',
      'access_denied': '请尝试使用有效的商品链接，避免使用需要登录的链接',
      'network_timeout': '请检查网络连接，稍后重试',
      'app_required': '请在对应的购物APP中打开此链接',
      'domain_not_configured': '请在小程序管理后台配置request合法域名，或使用后端代理服务',
      'scraping_failed': '请尝试使用其他商品链接，或联系技术支持'
    }
    
    return suggestions[errorType] || '请尝试使用其他商品链接'
  }

  /**
   * 生成解析ID - 兼容微信小程序
   */
  generateParseId(url) {
    // 微信小程序不支持btoa，使用简单hash
    const str = url + Date.now()
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36).slice(0, 16)
  }

  /**
   * 记录解析历史
   */
  recordParseHistory(parseId, record) {
    if (this.parseHistory.size >= this.maxHistorySize) {
      const firstKey = this.parseHistory.keys().next().value
      this.parseHistory.delete(firstKey)
    }
    
    this.parseHistory.set(parseId, {
      ...record,
      timestamp: Date.now()
    })
  }

  /**
   * 获取解析历史统计
   */
  getParseStats() {
    const records = Array.from(this.parseHistory.values())
    const total = records.length
    const success = records.filter(r => r.success).length
    const avgDuration = records.reduce((sum, r) => sum + r.duration, 0) / total || 0
    
    return {
      total,
      success,
      failure: total - success,
      successRate: total > 0 ? (success / total * 100).toFixed(1) + '%' : '0%',
      avgDuration: Math.round(avgDuration) + 'ms'
    }
  }

  /**
   * 批量解析商品
   */
  async parseProducts(urls) {
    const results = []
    
    for (const url of urls) {
      try {
        const product = await this.parseProduct(url)
        results.push(product)
      } catch (error) {
        results.push({
          error: error.message,
          url: url,
          success: false
        })
      }
    }
    
    return results
  }
}

/**
 * 真实淘宝解析器
 */
class RealTaobaoParser {
  async parse(url, platform, options = {}) {
    console.log(`[${platform.name}解析] 开始真实页面抓取`)
    return await realProductScraper.scrapeProduct(url, platform)
  }
}

/**
 * 真实天猫解析器
 */
class RealTmallParser {
  async parse(url, platform, options = {}) {
    console.log(`[${platform.name}解析] 开始真实页面抓取`)
    return await realProductScraper.scrapeProduct(url, platform)
  }
}

/**
 * 真实京东解析器
 */
class RealJDParser {
  async parse(url, platform, options = {}) {
    console.log(`[${platform.name}解析] 开始真实页面抓取`)
    return await realProductScraper.scrapeProduct(url, platform)
  }
}

/**
 * 真实拼多多解析器
 */
class RealPDDParser {
  async parse(url, platform, options = {}) {
    console.log(`[${platform.name}解析] 开始真实页面抓取`)
    return await realProductScraper.scrapeProduct(url, platform)
  }
}

// 创建全局实例
const productParser = new ProductParser()

module.exports = {
  ProductParser,
  productParser,
  RealTaobaoParser,
  RealTmallParser,
  RealJDParser,
  RealPDDParser
}