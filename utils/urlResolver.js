/**
 * URL解析和重定向跟踪工具 - 微信小程序优化版
 * 处理短链接重定向，获取真实商品URL
 */

const { validateUrl, detectPlatform } = require('./urlParser')

class UrlResolver {
  constructor() {
    this.cache = new Map() // 缓存重定向结果
    this.timeout = 10000   // 请求超时时间
  }

  /**
   * 解析URL并获取最终重定向地址
   * @param {string} originalUrl 原始URL
   * @returns {Promise<Object>} 解析结果
   */
  async resolveUrl(originalUrl) {
    try {
      console.log('[URL解析器] 开始解析URL:', originalUrl.substring(0, 100) + '...')
      
      // 检查缓存
      const cacheKey = this.generateCacheKey(originalUrl)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)
        if (Date.now() - cached.timestamp < 300000) { // 5分钟缓存
          console.log('[URL解析器] 使用缓存结果')
          return cached.result
        }
      }

      // 验证原始URL
      const validation = validateUrl(originalUrl)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          originalUrl,
          finalUrl: '',
          platform: null
        }
      }

      // 检查是否为短链接
      const platform = detectPlatform(originalUrl)
      const isShortLink = this.isShortLink(originalUrl, platform)
      
      let finalUrl = originalUrl
      let redirectPath = [originalUrl]

      if (isShortLink) {
        console.log('[URL解析器] 检测到短链接，尝试解析重定向')
        
        // 在小程序环境中，由于限制较多，我们优先使用基础解析
        // 如果需要真实重定向，应该通过后端API处理
        try {
          const redirectResult = await this.resolveRedirectInMiniProgram(originalUrl)
          if (redirectResult.success) {
            finalUrl = redirectResult.finalUrl
            redirectPath = redirectResult.redirectPath
          } else {
            console.warn('[URL解析器] 重定向解析失败，使用原始URL:', redirectResult.error)
            finalUrl = originalUrl
          }
        } catch (error) {
          console.warn('[URL解析器] 重定向处理异常，使用原始URL:', error.message)
          finalUrl = originalUrl
        }
      }

      // 再次验证最终URL
      const finalValidation = validateUrl(finalUrl)
      const finalPlatform = detectPlatform(finalUrl)

      const result = {
        success: true,
        originalUrl,
        finalUrl,
        platform: finalPlatform,
        isShortLink,
        redirectPath,
        urlType: this.classifyUrlType(finalUrl, finalPlatform),
        extractedParams: this.extractParams(finalUrl, finalPlatform)
      }

      // 缓存结果
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now()
      })

      console.log('[URL解析器] 解析完成:', {
        platform: finalPlatform?.name,
        isShortLink,
        finalUrl: finalUrl.substring(0, 100) + '...'
      })

      return result

    } catch (error) {
      console.error('[URL解析器] URL解析失败:', error)
      return {
        success: false,
        error: `URL解析失败: ${error.message}`,
        originalUrl,
        finalUrl: originalUrl, // 失败时返回原始URL
        platform: detectPlatform(originalUrl)
      }
    }
  }

  /**
   * 检查是否为短链接
   */
  isShortLink(url, platform) {
    const shortLinkPatterns = [
      /e\.tb\.cn\/h\./,        // 淘宝短链接
      /s\.click\.taobao\.com/, // 淘宝分享链接
      /uland\.taobao\.com/,    // 淘宝联盟链接
      /m\.tb\.cn/,             // 淘宝手机短链接
      /u\.jd\.com/,            // 京东短链接
      /3\.cn/,                 // 京东短链接
      /p\.pinduoduo\.com/,     // 拼多多短链接
      /pdd\.cn/                // 拼多多短链接
    ]

    return shortLinkPatterns.some(pattern => pattern.test(url))
  }

  /**
   * 在小程序环境中处理重定向（简化版）
   */
  async resolveRedirectInMiniProgram(url) {
    try {
      // 小程序环境的限制较多，这里主要做URL预处理
      // 真正的重定向跟踪应该通过后端API实现
      
      console.log('[URL解析器] 小程序环境重定向处理')
      
      // 尝试通过模式匹配推测最终URL
      const predictedUrl = this.predictFinalUrl(url)
      if (predictedUrl !== url) {
        return {
          success: true,
          finalUrl: predictedUrl,
          redirectPath: [url, predictedUrl]
        }
      }

      // 如果无法预测，返回原URL
      return {
        success: false,
        error: '无法在小程序环境中解析短链接重定向',
        finalUrl: url,
        redirectPath: [url]
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        finalUrl: url,
        redirectPath: [url]
      }
    }
  }

  /**
   * 通过模式匹配预测最终URL
   */
  predictFinalUrl(url) {
    // 这里可以根据已知的短链接模式进行推测
    // 实际项目中应该通过后端API获取真实重定向结果
    
    if (url.includes('e.tb.cn') || url.includes('m.tb.cn')) {
      // 淘宝短链接的处理逻辑
      return url // 暂时返回原URL，实际应该通过API获取
    }
    
    if (url.includes('u.jd.com') || url.includes('3.cn')) {
      // 京东短链接的处理逻辑  
      return url
    }
    
    return url
  }

  /**
   * 分类URL类型
   */
  classifyUrlType(url, platform) {
    if (!platform) return 'unknown'
    
    if (url.includes('item.htm') || url.includes('.html')) {
      return 'product_detail'
    } else if (url.includes('search') || url.includes('s?')) {
      return 'search_result'  
    } else if (this.isShortLink(url, platform)) {
      return 'short_link'
    } else {
      return 'other'
    }
  }

  /**
   * 提取URL参数 - 兼容小程序
   */
  extractParams(url, platform) {
    const params = {}
    
    if (!platform || !platform.paramExtractors) {
      return params
    }

    try {
      // 使用平台特定的参数提取器
      for (const [key, pattern] of Object.entries(platform.paramExtractors)) {
        const match = url.match(pattern)
        if (match && match[1]) {
          params[key] = match[1]
        }
      }

      // 手动解析查询字符串（兼容小程序）
      const queryIndex = url.indexOf('?')
      if (queryIndex !== -1) {
        const queryString = url.substring(queryIndex + 1)
        const pairs = queryString.split('&')
        
        for (const pair of pairs) {
          const [key, value] = pair.split('=')
          if (key && value && !params[key]) {
            params[key] = decodeURIComponent(value)
          }
        }
      }

    } catch (error) {
      console.warn('[URL解析器] 参数提取失败:', error)
    }

    return params
  }

  /**
   * 生成缓存键 - 兼容微信小程序
   */
  generateCacheKey(url) {
    return this.simpleHash(url)
  }

  /**
   * 简单的hash函数，替代btoa
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

module.exports = new UrlResolver()