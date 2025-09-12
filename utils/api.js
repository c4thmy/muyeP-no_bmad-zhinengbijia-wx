/**
 * 网络请求工具
 */

// 生产环境API地址（部署后需要修改为实际域名）
const BASE_URL = 'https://your-domain.com' // 替换为实际API地址
// 本地开发环境（可在开发时使用）
// const BASE_URL = 'http://localhost:3000'

/**
 * 网络请求封装
 * @param {Object} options 请求选项
 * @returns {Promise} 请求结果
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const {
      url,
      method = 'GET',
      data = {},
      header = {},
      timeout = 10000
    } = options

    // 添加通用请求头
    const defaultHeader = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...header
    }

    wx.request({
      url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
      method,
      data,
      header: defaultHeader,
      timeout,
      success: (res) => {
        const { statusCode, data: responseData } = res
        
        if (statusCode >= 200 && statusCode < 300) {
          resolve(responseData)
        } else {
          reject(new Error(`请求失败: ${statusCode}`))
        }
      },
      fail: (error) => {
        console.error('网络请求失败:', error)
        reject(new Error('网络请求失败，请检查网络连接'))
      }
    })
  })
}

/**
 * GET请求
 * @param {string} url 请求地址
 * @param {Object} params 请求参数
 * @param {Object} options 其他选项
 * @returns {Promise}
 */
function get(url, params = {}, options = {}) {
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  const fullUrl = queryString ? `${url}?${queryString}` : url
  
  return request({
    url: fullUrl,
    method: 'GET',
    ...options
  })
}

/**
 * POST请求
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他选项
 * @returns {Promise}
 */
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

/**
 * 解析商品信息
 * @param {string} productUrl 商品链接
 * @returns {Promise<Object>} 商品信息
 */
function parseProduct(productUrl) {
  return post('/api/products/parse', { url: productUrl })
}

/**
 * 批量解析商品
 * @param {Array} urls 商品链接数组
 * @returns {Promise<Array>} 商品信息数组
 */
function parseProducts(urls) {
  return post('/api/products/parse-batch', { urls })
}

/**
 * 获取商品价格历史
 * @param {string} productId 商品ID
 * @param {number} days 历史天数，默认30天
 * @returns {Promise<Object>} 价格历史
 */
function getPriceHistory(productId, days = 30) {
  return get(`/api/products/price-history/${productId}`, { days })
}

/**
 * 根据ID获取商品详情
 * @param {string} productId 商品ID
 * @returns {Promise<Object>} 商品详情
 */
function getProductById(productId) {
  return get(`/api/products/${productId}`)
}

/**
 * 检查API服务健康状态
 * @returns {Promise<Object>} 服务状态
 */
function checkHealth() {
  return get('/api/health')
}

/**
 * 模拟网络延迟
 * @param {number} ms 延迟毫秒数
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试机制
 * @param {Function} fn 执行函数
 * @param {number} maxRetries 最大重试次数
 * @param {number} retryDelay 重试延迟
 * @returns {Promise}
 */
async function retry(fn, maxRetries = 3, retryDelay = 1000) {
  let lastError
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (i === maxRetries) {
        throw lastError
      }
      
      await delay(retryDelay * Math.pow(2, i)) // 指数退避
    }
  }
}

/**
 * 错误处理
 * @param {Error} error 错误对象
 * @returns {Object} 处理后的错误信息
 */
function handleError(error) {
  console.error('API Error:', error)
  
  const errorMessages = {
    'Network Error': '网络连接失败，请检查网络设置',
    'Timeout': '请求超时，请重试',
    'Parse Error': '商品信息解析失败',
    'Invalid URL': '商品链接格式错误',
    'Unsupported Platform': '暂不支持该购物平台'
  }
  
  const message = errorMessages[error.message] || error.message || '操作失败，请重试'
  
  return {
    success: false,
    error: message,
    code: error.code || 'UNKNOWN_ERROR'
  }
}

module.exports = {
  request,
  get,
  post,
  parseProduct,
  parseProducts,
  getPriceHistory,
  getProductById,
  checkHealth,
  delay,
  retry,
  handleError
}