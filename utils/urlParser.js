/**
 * 商品链接解析工具
 */

// 支持的电商平台配置
const PLATFORMS = {
  TAOBAO: {
    name: '淘宝',
    domain: 'taobao.com',
    patterns: [
      /item\.taobao\.com\/item\.htm/,
      /detail\.taobao\.com\/item\.htm/,
      /h5\.m\.taobao\.com\/awp\/core\/detail\.htm/,
      /e\.tb\.cn\/h\./,  // 淘宝短链接
      /s\.click\.taobao\.com/,  // 淘宝分享链接
      /uland\.taobao\.com/,  // 淘宝联盟链接
      /m\.tb\.cn/  // 淘宝手机短链接
    ],
    paramExtractors: {
      id: /id=(\d+)/,
      spm: /spm=([^&]+)/,
      tk: /tk=([^&\s]+)/  // 短链接token
    }
  },
  TMALL: {
    name: '天猫',
    domain: 'tmall.com',
    patterns: [
      /detail\.tmall\.com\/item\.htm/,
      /chaoshi\.detail\.tmall\.com\/item\.htm/,
      /h5\.m\.tmall\.com\/awp\/core\/detail\.htm/,
      /e\.tb\.cn\/h\./,  // 天猫也可能使用淘宝短链接
      /s\.click\.tmall\.com/,  // 天猫分享链接
      /uland\.tmall\.com/  // 天猫联盟链接
    ],
    paramExtractors: {
      id: /id=(\d+)/,
      spm: /spm=([^&]+)/,
      tk: /tk=([^&\s]+)/
    }
  },
  JD: {
    name: '京东',
    domain: 'jd.com',
    patterns: [
      /item\.jd\.com\/\d+\.html/,
      /item\.m\.jd\.com\/product\/\d+\.html/,  // 京东手机端
      /h5\.m\.jd\.com\/dev\/3F8tEuEiApvqcqXjb1QgHhP/,
      /u\.jd\.com/,  // 京东短链接
      /3\.cn/,  // 京东短链接
      /item\.jd\.hk/  // 京东香港
    ],
    paramExtractors: {
      id: /\/(\d+)\.html/,  // 从路径提取商品ID
      sku: /sku=(\d+)/,
      utm_source: /utm_source=([^&]+)/,
      utm_campaign: /utm_campaign=([^&]+)/
    }
  },
  PDD: {
    name: '拼多多',
    domain: 'yangkeduo.com',
    patterns: [
      /mobile\.yangkeduo\.com\/goods/,
      /yangkeduo\.com\/goods/,
      /p\.pinduoduo\.com/,  // 拼多多短链接
      /mobile\.pdd\.cn/,  // 拼多多手机短链接
      /pdd\.cn/  // 拼多多短链接域名
    ],
    paramExtractors: {
      id: /goods_id=(\d+)/,
      page_id: /page_id=([^&]+)/,
      goods_sign: /goods_sign=([^&]+)/
    }
  }
}

/**
 * 检测链接平台
 * @param {string} url 商品链接
 * @returns {Object|null} 平台信息
 */
function detectPlatform(url) {
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    for (const pattern of platform.patterns) {
      if (pattern.test(url)) {
        return { key, ...platform }
      }
    }
  }
  return null
}

/**
 * 验证链接格式
 * @param {string} url 链接
 * @returns {Object} 验证结果 {valid: boolean, error: string, platform: Object}
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: '链接不能为空' }
  }

  const trimmedUrl = url.trim()
  
  // 检查基本URL格式 - 使用正则替代new URL()
  const urlPattern = /^https?:\/\/.+/i
  const domainPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i
  
  if (!urlPattern.test(trimmedUrl) && !domainPattern.test(trimmedUrl)) {
    return { valid: false, error: '请输入有效的网址链接' }
  }
  
  // 自动补全协议
  const fullUrl = trimmedUrl.startsWith('http') ? trimmedUrl : 'https://' + trimmedUrl

  // 检查是否为支持的平台
  const platform = detectPlatform(fullUrl)
  if (!platform) {
    return { 
      valid: false, 
      error: '暂不支持该平台，请使用淘宝、天猫、京东或拼多多链接'
    }
  }

  return { valid: true, platform, fullUrl }
}

/**
 * 提取链接参数
 * @param {string} url 链接
 * @param {Object} platform 平台信息
 * @returns {Object} 提取的参数
 */
function extractUrlParams(url, platform) {
  const params = {}
  
  if (platform && platform.paramExtractors) {
    for (const [key, pattern] of Object.entries(platform.paramExtractors)) {
      const match = url.match(pattern)
      if (match) {
        params[key] = match[1]
      }
    }
  }
  
  return params
}

/**
 * 清理链接，移除追踪参数
 * @param {string} url 原始链接
 * @returns {string} 清理后的链接
 */
function cleanUrl(url) {
  try {
    // 简单的参数清理，保留重要参数
    const keepParams = ['id', 'sku', 'goods_id', 'item_id']
    
    // 分离URL主体和参数
    const [baseUrl, queryString] = url.split('?')
    if (!queryString) return url
    
    // 解析参数
    const params = queryString.split('&')
    const cleanParams = []
    
    for (const param of params) {
      const [key] = param.split('=')
      if (keepParams.includes(key)) {
        cleanParams.push(param)
      }
    }
    
    return cleanParams.length > 0 ? `${baseUrl}?${cleanParams.join('&')}` : baseUrl
    
  } catch {
    return url
  }
}

/**
 * 生成短链接标识
 * @param {string} url 链接
 * @returns {string} 短标识
 */
function generateShortId(url) {
  const platform = detectPlatform(url)
  const params = extractUrlParams(url, platform)
  
  if (params.id) {
    return `${platform.key}_${params.id}`
  }
  
  // 生成基于URL的hash
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转为32位整数
  }
  
  return `${platform ? platform.key : 'unknown'}_${Math.abs(hash)}`
}

module.exports = {
  PLATFORMS,
  detectPlatform,
  validateUrl,
  extractUrlParams,
  cleanUrl,
  generateShortId
}