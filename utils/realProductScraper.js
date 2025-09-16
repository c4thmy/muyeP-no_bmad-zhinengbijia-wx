/**
 * 真实商品信息抓取服务
 * 从商品页面中抓取真实的商品详情信息
 */

const httpClient = require('./httpClient')

class RealProductScraper {
  constructor() {
    this.timeout = 15000
    this.maxRetries = 3
    
    // 设置请求头，在微信小程序中不能设置 User-Agent
    this.headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0'
    }
  }

  /**
   * 抓取商品页面内容
   * 注意：微信小程序环境下网络请求受到域名白名单限制
   */
  async fetchProductPage(url) {
    console.log(`[页面抓取] 开始抓取商品页面: ${url}`)
    
    try {
      // 检查是否在微信小程序环境
      if (typeof wx !== 'undefined') {
        console.log(`[页面抓取] 检测到微信小程序环境`)
        
        // 微信小程序环境下的特殊处理
        return await this.fetchPageInMiniProgram(url)
      }
      
      // 京东移动端链接转换为PC端链接
      let finalUrl = url
      let isConvertedFromMobile = false
      
      if (url.includes('item.m.jd.com/product/')) {
        const idMatch = url.match(/product\/(\d+)\.html/)
        if (idMatch) {
          finalUrl = `https://item.jd.com/${idMatch[1]}.html`
          isConvertedFromMobile = true
          console.log(`[页面抓取] 转换为PC端链接: ${finalUrl}`)
        }
      }
      
      const response = await httpClient.get(finalUrl, {
        headers: this.headers,
        timeout: this.timeout,
        validateStatus: (status) => status < 500
      })

      if (response.status === 404) {
        throw new Error('商品不存在或已下架 (404)')
      }
      
      if (response.status !== 200) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
      }

      // 检查页面内容是否为有效的商品页面
      const html = response.data
      console.log(`[页面抓取] 页面内容长度: ${html.length}, 前200字符: ${html.substring(0, 200)}`)
      
      const isValidProductPage = this.validateProductPage(html, finalUrl)
      
      if (!isValidProductPage) {
        console.log(`[页面抓取] 检测到无效商品页面`)
        
        // 如果是从移动端转换来的，尝试其他方法
        if (isConvertedFromMobile) {
          console.log(`[页面抓取] 尝试使用不同的请求头重新请求`)
          
          const altHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache'
          }
          
          const altResponse = await httpClient.get(finalUrl, {
            headers: altHeaders,
            timeout: this.timeout,
            validateStatus: (status) => status < 500
          })
          
          const altValidated = this.validateProductPage(altResponse.data, finalUrl)
          if (altValidated) {
            console.log(`[页面抓取] 使用替代请求头成功获取商品页面`)
            return altResponse.data
          }
        }
        
        throw new Error('无法获取有效的商品页面内容')
      }

      console.log(`[页面抓取] 页面抓取成功, 内容长度: ${response.data.length}`)
      return response.data

    } catch (error) {
      console.error(`[页面抓取] 抓取失败:`, error.message)
      throw new Error(`页面抓取失败: ${error.message}`)
    }
  }

  /**
   * 微信小程序环境下的页面抓取
   * 由于域名限制，可能需要通过后端代理或使用备用方案
   */
  async fetchPageInMiniProgram(url) {
    console.log(`[小程序抓取] 微信小程序环境下抓取页面`)
    
    // 方案1: 尝试直接请求（可能因域名限制失败）
    try {
      const response = await httpClient.get(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: this.timeout
      })
      
      if (response.status === 200) {
        console.log(`[小程序抓取] 直接请求成功`)
        return response.data
      }
      
    } catch (error) {
      console.log(`[小程序抓取] 直接请求失败: ${error.message}`)
      
      // 检查是否为域名限制错误
      if (error.message.includes('not in domain list') || 
          error.message.includes('域名不在小程序请求域名列表')) {
        
        console.log(`[小程序抓取] 检测到域名限制，返回模拟数据提示`)
        
        // 返回一个说明页面，告知用户需要配置域名
        return `
          <html>
            <head><title>域名配置提示</title></head>
            <body>
              <div class="domain-config-notice">
                <h1>网络请求受限</h1>
                <p>微信小程序需要在后台配置合法域名才能请求外部网络资源。</p>
                <p>请在小程序管理后台添加以下域名到request合法域名列表：</p>
                <ul>
                  <li>https://item.jd.com</li>
                  <li>https://detail.tmall.com</li>
                  <li>https://item.taobao.com</li>
                  <li>https://mobile.yangkeduo.com</li>
                  <li>https://e.tb.cn</li>
                  <li>https://u.jd.com</li>
                </ul>
                <p>或者通过后端API代理来获取商品信息。</p>
              </div>
            </body>
          </html>
        `
      }
    }
    
    throw new Error('小程序环境下无法获取商品页面，请配置合法域名或使用后端代理')
  }

  /**
   * 验证是否为有效的商品页面
   */
  validateProductPage(html, url) {
    // 检查错误标志
    const errorIndicators = [
      '404', '商品不存在', '已下架', '访问受限', '需要登录',
      '活动太火爆', '前往京东APP', '多快好省，购物上京东'
    ]
    
    for (const indicator of errorIndicators) {
      if (html.includes(indicator)) {
        console.log(`[页面验证] 发现错误标志: ${indicator}`)
        return false
      }
    }
    
    // 检查是否包含商品相关元素
    const productIndicators = [
      'sku-name', 'product-title', 'item-name', 'goods-name', 'p-name',
      'price', 'summary-price', 'J-p-', 'jd-price', 'product-shop',
      'product-detail', 'sku-info', 'itemInfo-wrap'
    ]
    
    let foundIndicators = 0
    for (const indicator of productIndicators) {
      if (html.includes(indicator)) {
        foundIndicators++
      }
    }
    
    // 如果找到足够多的商品指示器，认为是有效页面
    if (foundIndicators >= 2) {
      console.log(`[页面验证] 找到 ${foundIndicators} 个商品指示器，认为是有效商品页面`)
      return true
    }
    
    // 检查页面长度 - 太短可能是错误页面
    if (html.length < 50000) {
      console.log(`[页面验证] 页面内容太短 (${html.length} 字符)，可能不是商品页面`)
      return false
    }
    
    console.log(`[页面验证] 验证不确定，默认认为无效`)
    return false
  }

  /**
   * 解析京东商品页面
   */
  async parseJDProduct(url) {
    const html = await this.fetchProductPage(url)
    
    console.log(`[京东解析] 开始解析商品详情`)
    
    try {
      // 提取商品基本信息
      const title = this.extractJDTitle(html)
      const price = this.extractJDPrice(html)
      const brand = this.extractJDBrand(html)
      const model = this.extractJDModel(html)
      const specifications = this.extractJDSpecifications(html)
      const description = this.extractJDDescription(html)
      const images = this.extractJDImages(html)
      const shopInfo = this.extractJDShopInfo(html)

      const productInfo = {
        title: title || '商品标题获取失败',
        price: price,
        brand: brand || '',
        model: model || '',
        specifications: specifications,
        description: description || '',
        images: images,
        shop: shopInfo,
        platform: '京东',
        scrapeTime: new Date().toISOString(),
        sourceUrl: url
      }

      console.log(`[京东解析] 解析完成:`, {
        title: productInfo.title,
        brand: productInfo.brand,
        specificationsCount: Object.keys(productInfo.specifications).length
      })

      return productInfo

    } catch (error) {
      console.error(`[京东解析] 解析失败:`, error.message)
      throw new Error(`京东商品解析失败: ${error.message}`)
    }
  }

  /**
   * 解析天猫商品页面
   */
  async parseTmallProduct(url) {
    const html = await this.fetchProductPage(url)
    
    console.log(`[天猫解析] 开始解析商品详情`)
    
    try {
      const title = this.extractTmallTitle(html)
      const price = this.extractTmallPrice(html)
      const brand = this.extractTmallBrand(html)
      const specifications = this.extractTmallSpecifications(html)
      const description = this.extractTmallDescription(html)
      const images = this.extractTmallImages(html)
      const shopInfo = this.extractTmallShopInfo(html)

      const productInfo = {
        title: title || '商品标题获取失败',
        price: price,
        brand: brand || '',
        specifications: specifications,
        description: description || '',
        images: images,
        shop: shopInfo,
        platform: '天猫',
        scrapeTime: new Date().toISOString(),
        sourceUrl: url
      }

      console.log(`[天猫解析] 解析完成:`, {
        title: productInfo.title,
        brand: productInfo.brand,
        specificationsCount: Object.keys(productInfo.specifications).length
      })

      return productInfo

    } catch (error) {
      console.error(`[天猫解析] 解析失败:`, error.message)
      throw new Error(`天猫商品解析失败: ${error.message}`)
    }
  }

  /**
   * 解析淘宝商品页面
   */
  async parseTaobaoProduct(url) {
    const html = await this.fetchProductPage(url)
    
    console.log(`[淘宝解析] 开始解析商品详情`)
    
    try {
      const title = this.extractTaobaoTitle(html)
      const price = this.extractTaobaoPrice(html)
      const brand = this.extractTaobaoBrand(html)
      const specifications = this.extractTaobaoSpecifications(html)
      const description = this.extractTaobaoDescription(html)
      const images = this.extractTaobaoImages(html)
      const shopInfo = this.extractTaobaoShopInfo(html)

      const productInfo = {
        title: title || '商品标题获取失败',
        price: price,
        brand: brand || '',
        specifications: specifications,
        description: description || '',
        images: images,
        shop: shopInfo,
        platform: '淘宝',
        scrapeTime: new Date().toISOString(),
        sourceUrl: url
      }

      console.log(`[淘宝解析] 解析完成:`, {
        title: productInfo.title,
        brand: productInfo.brand,
        specificationsCount: Object.keys(productInfo.specifications).length
      })

      return productInfo

    } catch (error) {
      console.error(`[淘宝解析] 解析失败:`, error.message)
      throw new Error(`淘宝商品解析失败: ${error.message}`)
    }
  }

  // === 京东解析方法 ===

  extractJDTitle(html) {
    // 京东PC端和移动端商品标题的常见选择器（优化版）
    const titlePatterns = [
      // PC端页面标题
      /<div[^>]*class="[^"]*sku-name[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<h1[^>]*class="[^"]*sku-name[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<div[^>]*data-hook="product-title"[^>]*>([^<]+)<\/div>/i,
      
      // 移动端页面标题
      /<title>([^<]+?)-京东<\/title>/i,
      /<title>([^<]+?)\s*-\s*京东/i,
      /<title>([^<]+)<\/title>/i,
      
      // JSON数据中的标题
      /"title":"([^"]+)"/i,
      /"productName":"([^"]+)"/i,
      /"skuName":"([^"]+)"/i,
      /"name":"([^"]+)"/i,
      /"wname":"([^"]+)"/i,
      
      // HTML元素中的标题
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class="[^"]*p-name[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/i,
      
      // PC端特殊结构
      /<div[^>]*class="itemInfo-wrap"[^>]*>.*?<div[^>]*class="sku-name"[^>]*>([^<]+)<\/div>/is,
      /<div[^>]*class="product-intro"[^>]*>.*?<div[^>]*class="sku-name"[^>]*>([^<]+)<\/div>/is,
      
      // 特殊格式
      /商品名称[：:]?\s*([^<>\n\r]{10,100})/i,
      /产品名称[：:]?\s*([^<>\n\r]{10,100})/i
    ]

    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 5) {
        let title = this.cleanText(match[1])
        // 过滤掉无意义的标题
        if (!title.includes('京东') && !title.includes('登录') && !title.includes('error') && 
            !title.includes('多快好省') && !title.includes('活动太火爆')) {
          return title
        }
      }
    }

    console.warn('[京东解析] 未找到商品标题')
    return null
  }

  extractJDPrice(html) {
    // 京东价格的常见模式（优化移动端支持）
    const pricePatterns = [
      // 移动端特有价格模式
      /"currentPrice":"?([0-9,]+\.?[0-9]*)"?/i,
      /"p":"?([0-9,]+\.?[0-9]*)"?/i,
      /"price":"?([0-9,]+\.?[0-9]*)"?/i,
      /"jdPrice":"?([0-9,]+\.?[0-9]*)"?/i,
      
      // 移动端HTML结构
      /<div[^>]*class="[^"]*price[^"]*"[^>]*>.*?¥([0-9,]+\.?[0-9]*)/i,
      /<span[^>]*class="[^"]*price[^"]*"[^>]*>.*?¥([0-9,]+\.?[0-9]*)/i,
      /<em[^>]*class="[^"]*price[^"]*"[^>]*>¥?([0-9,]+\.?[0-9]*)</i,
      
      // PC端价格模式  
      /<span[^>]*class="[^"]*price[^"]*"[^>]*>.*?¥?([0-9,]+\.?[0-9]*)<\/span>/i,
      /<em[^>]*class="[^"]*J-p-[^"]*"[^>]*>([0-9,]+\.?[0-9]*)<\/em>/i,
      /<span[^>]*id="jd-price"[^>]*>.*?([0-9,]+\.?[0-9]*)/i,
      /<div[^>]*class="[^"]*summary-price[^"]*"[^>]*>.*?¥([0-9,]+\.?[0-9]*)/i,
      
      // 通用价格匹配
      /¥\s*([0-9,]+\.?[0-9]*)/i,
      /￥\s*([0-9,]+\.?[0-9]*)/i,
      /价格[：:]?\s*¥?\s*([0-9,]+\.?[0-9]*)/i,
      /现价[：:]?\s*¥?\s*([0-9,]+\.?[0-9]*)/i,
      /售价\s*¥?\s*([0-9,]+\.?[0-9]*)/i,
      
      // 特殊格式
      /data-price="([^"]+)"/i,
      /<span[^>]*class="[^"]*price[^"]*"[^>]*>.*?([0-9,]+\.?[0-9]*)/i,
      
      // 从页面标题中提取价格（移动端可能包含）
      /<title>[^<]*¥([0-9,]+\.?[0-9]*)[^<]*<\/title>/i
    ]

    for (const pattern of pricePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const priceStr = match[1].replace(/[^0-9.]/g, '')
        const price = parseFloat(priceStr)
        if (!isNaN(price) && price > 0 && price < 1000000) { // 合理价格范围
          console.log(`[京东解析] 成功提取价格: ${price.toFixed(2)}`)
          return price.toFixed(2)
        }
      }
    }

    // 如果没有找到价格，尝试更宽松的匹配
    const looseMatches = html.match(/([0-9,]+\.?[0-9]*)/g)
    if (looseMatches) {
      for (const match of looseMatches) {
        const price = parseFloat(match.replace(/[^0-9.]/g, ''))
        if (!isNaN(price) && price > 10 && price < 100000) {
          console.log(`[京东解析] 通过宽松匹配提取价格: ${price.toFixed(2)}`)
          return price.toFixed(2)
        }
      }
    }

    console.warn('[京东解析] 未找到商品价格')
    return null
  }

  extractJDBrand(html) {
    const brandPatterns = [
      // JSON数据中的品牌
      /"brand":"([^"]+)"/i,
      /"brandName":"([^"]+)"/i,
      /"manufacturer":"([^"]+)"/i,
      
      // HTML文本中的品牌
      /品牌[：:]?\s*([^<>\n\r，,；;]{2,20})/i,
      /厂商[：:]?\s*([^<>\n\r，,；;]{2,20})/i,
      /制造商[：:]?\s*([^<>\n\r，,；;]{2,20})/i,
      
      // HTML属性
      /data-brand="([^"]+)"/i,
      
      // HTML结构中的品牌
      /<li[^>]*>品牌[：:]?\s*<[^>]*>([^<]+)</i,
      /<span[^>]*class="[^"]*brand[^"]*"[^>]*>([^<]+)</i,
      /<div[^>]*class="[^"]*brand[^"]*"[^>]*>([^<]+)</i,
      
      // 从标题中提取品牌（常见品牌名称）
      /^(Apple|华为|小米|三星|OPPO|vivo|荣耀|一加|realme|魅族|联想|戴尔|惠普|华硕|宏碁|海尔|美的|格力|TCL|长虹|创维|海信|松下|索尼|LG|飞利浦|西门子|博世|方太|老板|万和|万家乐|史密斯|能率|林内|樱花|火王|帅康|迅达|奥克斯|志高|科龙|容声|新飞|澳柯玛|星星|白雪|冰熊|雪花|雪莲|雪鹿|雪人|雪山|雪原|雪域|雪峰|雪花|雪莲|雪鹿)/i
    ]

    for (const pattern of brandPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const brand = this.cleanText(match[1])
        if (brand && brand.length >= 2 && brand.length <= 20) {
          return brand
        }
      }
    }

    // 尝试从标题中提取品牌
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1]
      const brandMatch = title.match(/^([^\s]+)\s+/i)
      if (brandMatch && brandMatch[1] && brandMatch[1].length >= 2) {
        return this.cleanText(brandMatch[1])
      }
    }

    console.warn('[京东解析] 未找到品牌信息')
    return null
  }

  extractJDModel(html) {
    const modelPatterns = [
      /型号[：:]?\s*([^<>\n\r]+)/i,
      /商品型号[：:]?\s*([^<>\n\r]+)/i,
      /"model":"([^"]+)"/i,
      /<li[^>]*>型号[：:]?\s*<span[^>]*>([^<]+)<\/span>/i
    ]

    for (const pattern of modelPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return this.cleanText(match[1])
      }
    }

    return null
  }

  extractJDSpecifications(html) {
    const specifications = {}
    
    try {
      // 匹配规格参数区域
      const specPatterns = [
        /<div[^>]*class="[^"]*parameter[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<ul[^>]*class="[^"]*parameter[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi,
        /<div[^>]*class="[^"]*spec[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
      ]

      for (const pattern of specPatterns) {
        let match
        while ((match = pattern.exec(html)) !== null) {
          const specHtml = match[1]
          this.parseSpecificationText(specHtml, specifications)
        }
      }

      // 如果没找到规格参数区域，尝试从整个页面提取
      if (Object.keys(specifications).length === 0) {
        this.extractBasicSpecs(html, specifications)
      }

    } catch (error) {
      console.warn('[京东解析] 规格参数解析失败:', error.message)
    }

    return specifications
  }

  extractJDDescription(html) {
    const descPatterns = [
      /"desc":"([^"]+)"/i,
      /<div[^>]*class="[^"]*desc[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<p[^>]*class="[^"]*summary[^"]*"[^>]*>([^<]+)<\/p>/i
    ]

    for (const pattern of descPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return this.cleanText(match[1])
      }
    }

    return null
  }

  extractJDImages(html) {
    const images = []
    const imagePatterns = [
      /"images":\s*\[([^\]]+)\]/i,
      /data-img="([^"]+)"/gi,
      /<img[^>]*src="([^"]*jd[^"]*\.jpg[^"]*)"/gi
    ]

    for (const pattern of imagePatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        if (match[1]) {
          images.push(match[1])
        }
      }
    }

    return [...new Set(images)] // 去重
  }

  extractJDShopInfo(html) {
    const shop = {}
    
    const shopNamePattern = /"shopName":"([^"]+)"/i
    const shopMatch = html.match(shopNamePattern)
    if (shopMatch && shopMatch[1]) {
      shop.name = this.cleanText(shopMatch[1])
    }

    return shop
  }

  // === 天猫解析方法 ===

  extractTmallTitle(html) {
    const titlePatterns = [
      // 天猫商品标题的常见选择器
      /<div[^>]*class="[^"]*tb-detail-hd[^"]*"[^>]*>.*?<h1[^>]*>([^<]+)<\/h1>/is,
      /<h1[^>]*data-spm="[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<div[^>]*class="[^"]*item-title[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<h1[^>]*class="[^"]*tb-main-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      
      // 从页面标题提取
      /<title>([^<]+?)-天猫Tmall\.com<\/title>/i,
      /<title>([^<]+?)-tmall\.com天猫<\/title>/i,
      /<title>([^<]+?)\s*-\s*天猫/i,
      
      // JSON数据中的标题
      /"title":"([^"]+)"/i,
      /"itemTitle":"([^"]+)"/i,
      /"defaultItemName":"([^"]+)"/i,
      
      // 其他可能的结构
      /<div[^>]*class="[^"]*tb-gallery[^"]*"[^>]*>.*?<h1[^>]*>([^<]+)<\/h1>/is,
      /<span[^>]*class="[^"]*tb-item-title[^"]*"[^>]*>([^<]+)<\/span>/i
    ]

    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 3) {
        let title = this.cleanText(match[1])
        // 过滤掉无意义的标题
        if (!title.includes('天猫') && !title.includes('登录') && !title.includes('error') && 
            !title.includes('页面') && title.length > 5 && title.length < 200) {
          return title
        }
      }
    }

    console.warn('[天猫解析] 未找到商品标题')
    return null
  }

  extractTmallPrice(html) {
    const pricePatterns = [
      // 天猫价格的常见模式
      /<span[^>]*class="[^"]*tm-price[^"]*"[^>]*>[^0-9]*([0-9,]+\.?[0-9]*)<\/span>/i,
      /<em[^>]*class="[^"]*tm-price[^"]*"[^>]*>([0-9,]+\.?[0-9]*)<\/em>/i,
      /<span[^>]*class="[^"]*tb-rmb-num[^"]*"[^>]*>([0-9,]+\.?[0-9]*)<\/span>/i,
      /<div[^>]*class="[^"]*tm-price-panel[^"]*"[^>]*>.*?¥([0-9,]+\.?[0-9]*)/is,
      
      // JSON数据中的价格
      /"price":"([^"]+)"/i,
      /"defaultPrice":"([^"]+)"/i,
      /"currentPrice":"([^"]+)"/i,
      
      // HTML中的价格
      /¥\s*([0-9,]+\.?[0-9]*)/i,
      /现价[：:]?\s*¥?\s*([0-9,]+\.?[0-9]*)/i,
      /价格[：:]?\s*¥?\s*([0-9,]+\.?[0-9]*)/i
    ]

    for (const pattern of pricePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const priceStr = match[1].replace(/[^0-9.]/g, '')
        const price = parseFloat(priceStr)
        if (!isNaN(price) && price > 0 && price < 1000000) {
          return price.toFixed(2)
        }
      }
    }

    console.warn('[天猫解析] 未找到商品价格')
    return null
  }

  extractTmallBrand(html) {
    const brandPatterns = [
      // 天猫品牌信息
      /<div[^>]*class="[^"]*tm-shop-name[^"]*"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/is,
      /<a[^>]*class="[^"]*slogo-shopname[^"]*"[^>]*>([^<]+)<\/a>/i,
      /"brandName":"([^"]+)"/i,
      /"brand":"([^"]+)"/i,
      /品牌[：:]?\s*([^<>\n\r，,；;]{2,20})/i,
      /<li[^>]*>品牌[：:]?\s*<[^>]*>([^<]+)</i
    ]

    for (const pattern of brandPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const brand = this.cleanText(match[1])
        if (brand && brand.length >= 2 && brand.length <= 20) {
          return brand
        }
      }
    }

    return null
  }

  extractTmallSpecifications(html) {
    const specifications = {}
    this.extractBasicSpecs(html, specifications)
    return specifications
  }

  extractTmallDescription(html) {
    const descPatterns = [
      /<div[^>]*class="[^"]*tb-detail-desc[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<div[^>]*class="[^"]*tm-desc-detail[^"]*"[^>]*>([^<]+)<\/div>/i,
      /"description":"([^"]+)"/i
    ]

    for (const pattern of descPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return this.cleanText(match[1])
      }
    }

    return null
  }

  extractTmallImages(html) {
    const images = []
    const imagePatterns = [
      /<img[^>]*src="([^"]*tmall[^"]*\.jpg[^"]*)"[^>]*>/gi,
      /<img[^>]*data-src="([^"]+\.jpg[^"]*)"[^>]*>/gi,
      /"images":\s*\[([^\]]+)\]/i
    ]

    for (const pattern of imagePatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        if (match[1]) {
          images.push(match[1])
        }
      }
    }

    return [...new Set(images)]
  }

  extractTmallShopInfo(html) {
    const shop = {}
    
    const shopPatterns = [
      /<a[^>]*class="[^"]*slogo-shopname[^"]*"[^>]*>([^<]+)<\/a>/i,
      /"shopName":"([^"]+)"/i,
      /店铺[：:]?\s*([^<>\n\r]+)/i
    ]

    for (const pattern of shopPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        shop.name = this.cleanText(match[1])
        break
      }
    }

    return shop
  }

  // === 淘宝解析方法 ===

  extractTaobaoTitle(html) {
    const titlePatterns = [
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<title>([^<]+)-淘宝网<\/title>/i,
      /"title":"([^"]+)"/i,
      /data-title="([^"]+)"/i
    ]

    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return this.cleanText(match[1])
      }
    }

    return null
  }

  extractTaobaoPrice(html) {
    const pricePatterns = [
      /现价[：:]?\s*¥([0-9,.]+)/i,
      /价格[：:]?\s*¥([0-9,.]+)/i,
      /"price":"([^"]+)"/i
    ]

    for (const pattern of pricePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const price = parseFloat(match[1].replace(/[^0-9.]/g, ''))
        return isNaN(price) ? null : price.toFixed(2)
      }
    }

    return null
  }

  extractTaobaoBrand(html) {
    const brandPatterns = [
      /品牌[：:]?\s*([^<>\n\r]+)/i,
      /"brand":"([^"]+)"/i
    ]

    for (const pattern of brandPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return this.cleanText(match[1])
      }
    }

    return null
  }

  extractTaobaoSpecifications(html) {
    const specifications = {}
    this.extractBasicSpecs(html, specifications)
    return specifications
  }

  extractTaobaoDescription(html) {
    const descPatterns = [
      /<div[^>]*class="[^"]*desc[^"]*"[^>]*>([^<]+)<\/div>/i,
      /"description":"([^"]+)"/i
    ]

    for (const pattern of descPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return this.cleanText(match[1])
      }
    }

    return null
  }

  extractTaobaoImages(html) {
    const images = []
    const imagePatterns = [
      /<img[^>]*src="([^"]*taobao[^"]*\.jpg[^"]*)"/gi,
      /data-src="([^"]+\.jpg[^"]*)"/gi
    ]

    for (const pattern of imagePatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        if (match[1]) {
          images.push(match[1])
        }
      }
    }

    return [...new Set(images)]
  }

  extractTaobaoShopInfo(html) {
    const shop = {}
    
    const shopPatterns = [
      /店铺[：:]?\s*([^<>\n\r]+)/i,
      /"shopName":"([^"]+)"/i
    ]

    for (const pattern of shopPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        shop.name = this.cleanText(match[1])
        break
      }
    }

    return shop
  }

  // === 通用工具方法 ===

  parseSpecificationText(text, specifications) {
    // 解析规格参数文本
    const specLines = text.split(/[；;，,\n\r]/)
    
    for (const line of specLines) {
      const trimmed = this.cleanText(line)
      if (trimmed.length < 3 || trimmed.length > 100) continue
      
      // 匹配 "参数名：参数值" 格式
      const match = trimmed.match(/^([^：:]+)[：:](.+)$/)
      if (match) {
        const key = this.cleanText(match[1])
        const value = this.cleanText(match[2])
        if (key && value) {
          specifications[key] = value
        }
      }
    }
  }

  extractBasicSpecs(html, specifications) {
    // 提取基本规格信息
    const basicSpecs = [
      { pattern: /品牌[：:]?\s*([^<>\n\r，,；;]{1,50})/i, key: '品牌' },
      { pattern: /型号[：:]?\s*([^<>\n\r，,；;]{1,50})/i, key: '型号' },
      { pattern: /颜色[：:]?\s*([^<>\n\r，,；;]{1,30})/i, key: '颜色' },
      { pattern: /尺寸[：:]?\s*([^<>\n\r，,；;]{1,50})/i, key: '尺寸' },
      { pattern: /重量[：:]?\s*([^<>\n\r，,；;]{1,30})/i, key: '重量' },
      { pattern: /材质[：:]?\s*([^<>\n\r，,；;]{1,50})/i, key: '材质' },
      { pattern: /功率[：:]?\s*([^<>\n\r，,；;]{1,30})/i, key: '功率' },
      { pattern: /容量[：:]?\s*([^<>\n\r，,；;]{1,30})/i, key: '容量' },
    ]

    for (const spec of basicSpecs) {
      const match = html.match(spec.pattern)
      if (match && match[1]) {
        const value = this.cleanText(match[1])
        if (value && !specifications[spec.key]) {
          specifications[spec.key] = value
        }
      }
    }
  }

  cleanText(text) {
    if (!text) return ''
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 根据平台选择对应的解析方法
   */
  async scrapeProduct(url, platform) {
    console.log(`[商品抓取] 开始抓取 ${platform.name} 商品信息`)
    
    try {
      switch (platform.key) {
        case 'JD':
          return await this.parseJDProduct(url)
        case 'TAOBAO':
          return await this.parseTaobaoProduct(url)
        case 'TMALL':
          return await this.parseTmallProduct(url)
        default:
          throw new Error(`暂不支持 ${platform.name} 平台的真实抓取`)
      }
    } catch (error) {
      console.error(`[商品抓取] ${platform.name} 抓取失败:`, error.message)
      throw error
    }
  }
}

module.exports = new RealProductScraper()