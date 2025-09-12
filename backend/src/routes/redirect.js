const express = require('express')
const axios = require('axios')
const router = express.Router()
const logger = require('../utils/logger')
const cache = require('../utils/cache')

/**
 * URL重定向跟踪路由
 * 处理短链接重定向，获取最终URL
 */

/**
 * 解析短链接重定向
 * POST /api/resolve-redirect
 */
router.post('/resolve-redirect', async (req, res) => {
  const { url } = req.body
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: '请提供要解析的URL'
    })
  }

  try {
    logger.info(`开始解析短链接重定向: ${url}`)
    
    // 检查缓存
    const cacheKey = `redirect_${Buffer.from(url).toString('base64')}`
    const cached = cache.get(cacheKey)
    
    if (cached) {
      logger.info('从缓存获取重定向结果')
      return res.json({
        success: true,
        ...cached,
        fromCache: true
      })
    }

    // 执行重定向跟踪
    const redirectResult = await followRedirects(url)
    
    // 缓存结果 (5分钟)
    cache.set(cacheKey, redirectResult, 300)
    
    logger.info(`重定向解析完成: ${url} -> ${redirectResult.finalUrl}`)
    
    res.json({
      success: true,
      ...redirectResult,
      fromCache: false
    })

  } catch (error) {
    logger.error(`重定向解析失败 [${url}]:`, error)
    
    res.status(500).json({
      success: false,
      error: error.message,
      originalUrl: url
    })
  }
})

/**
 * 跟踪URL重定向链路
 * @param {string} originalUrl 原始URL
 * @param {number} maxRedirects 最大重定向次数
 * @returns {Promise<Object>} 重定向结果
 */
async function followRedirects(originalUrl, maxRedirects = 10) {
  const redirectPath = [originalUrl]
  let currentUrl = originalUrl
  let redirectCount = 0
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }

  while (redirectCount < maxRedirects) {
    try {
      logger.info(`第${redirectCount + 1}次请求: ${currentUrl}`)
      
      const response = await axios.get(currentUrl, {
        headers,
        timeout: 10000,
        maxRedirects: 0, // 我们手动处理重定向
        validateStatus: function (status) {
          return status >= 200 && status < 400 // 允许重定向状态码
        }
      })

      // 检查是否是重定向状态码
      if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.location || response.headers.Location
        
        if (!redirectUrl) {
          throw new Error(`重定向响应缺少Location头: ${response.status}`)
        }

        // 处理相对URL
        const absoluteRedirectUrl = new URL(redirectUrl, currentUrl).href
        
        logger.info(`检测到重定向: ${currentUrl} -> ${absoluteRedirectUrl}`)
        
        redirectPath.push(absoluteRedirectUrl)
        currentUrl = absoluteRedirectUrl
        redirectCount++
        
        // 短暂延迟，避免过于频繁的请求
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } else {
        // 达到最终页面
        logger.info(`重定向跟踪完成，最终URL: ${currentUrl}`)
        
        return {
          finalUrl: currentUrl,
          redirectPath,
          redirectCount,
          contentType: response.headers['content-type'] || '',
          statusCode: response.status
        }
      }
      
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时')
      } else if (error.response) {
        // 处理HTTP错误响应
        if (error.response.status >= 300 && error.response.status < 400) {
          // 这是一个重定向，但axios没有正确处理
          const redirectUrl = error.response.headers.location || error.response.headers.Location
          if (redirectUrl) {
            const absoluteRedirectUrl = new URL(redirectUrl, currentUrl).href
            redirectPath.push(absoluteRedirectUrl)
            currentUrl = absoluteRedirectUrl
            redirectCount++
            continue
          }
        }
        
        throw new Error(`HTTP错误: ${error.response.status} ${error.response.statusText}`)
      } else {
        throw new Error(`网络请求失败: ${error.message}`)
      }
    }
  }
  
  // 达到最大重定向次数
  logger.warn(`达到最大重定向次数 (${maxRedirects}), 当前URL: ${currentUrl}`)
  
  return {
    finalUrl: currentUrl,
    redirectPath,
    redirectCount,
    warning: `达到最大重定向次数限制 (${maxRedirects})`
  }
}

/**
 * 批量解析重定向
 * POST /api/batch-resolve-redirect
 */
router.post('/batch-resolve-redirect', async (req, res) => {
  const { urls } = req.body
  
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      success: false,
      error: '请提供URL数组'
    })
  }

  if (urls.length > 20) {
    return res.status(400).json({
      success: false,
      error: '批量解析最多支持20个URL'
    })
  }

  try {
    logger.info(`开始批量解析重定向，共 ${urls.length} 个URL`)
    
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const result = await followRedirects(url)
          return { success: true, url, ...result }
        } catch (error) {
          return { success: false, url, error: error.message }
        }
      })
    )

    const processedResults = results.map(result => result.value)
    const successCount = processedResults.filter(r => r.success).length
    
    logger.info(`批量重定向解析完成: ${successCount}/${urls.length} 成功`)
    
    res.json({
      success: true,
      results: processedResults,
      summary: {
        total: urls.length,
        success: successCount,
        failed: urls.length - successCount
      }
    })

  } catch (error) {
    logger.error('批量重定向解析失败:', error)
    
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取URL信息（不跟踪重定向）
 * POST /api/url-info
 */
router.post('/url-info', async (req, res) => {
  const { url } = req.body
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: '请提供要查询的URL'
    })
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    const response = await axios.head(url, {
      headers,
      timeout: 5000,
      validateStatus: function (status) {
        return status >= 200 && status < 500
      }
    })

    res.json({
      success: true,
      url,
      statusCode: response.status,
      headers: {
        'content-type': response.headers['content-type'],
        'content-length': response.headers['content-length'],
        'last-modified': response.headers['last-modified'],
        'location': response.headers['location']
      },
      redirected: response.status >= 300 && response.status < 400
    })

  } catch (error) {
    logger.error(`URL信息查询失败 [${url}]:`, error)
    
    res.status(500).json({
      success: false,
      error: error.message,
      url
    })
  }
})

module.exports = router