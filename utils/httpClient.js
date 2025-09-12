/**
 * 微信小程序HTTP请求工具
 * 替代axios，使用wx.request
 */

class MiniProgramHttp {
  constructor() {
    this.timeout = 15000
  }

  /**
   * GET请求
   * @param {string} url 请求地址
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  get(url, options = {}) {
    return new Promise((resolve, reject) => {
      const requestOptions = {
        url,
        method: 'GET',
        header: options.headers || {},
        timeout: options.timeout || this.timeout,
        success: (res) => {
          // 模拟axios的响应格式
          resolve({
            data: res.data,
            status: res.statusCode,
            statusText: this.getStatusText(res.statusCode),
            headers: res.header
          })
        },
        fail: (error) => {
          console.error('[HTTP请求] 请求失败:', error)
          reject(new Error(`网络请求失败: ${error.errMsg || 'Unknown error'}`))
        }
      }

      // 验证状态码的函数
      if (options.validateStatus) {
        const originalSuccess = requestOptions.success
        requestOptions.success = (res) => {
          if (options.validateStatus(res.statusCode)) {
            originalSuccess(res)
          } else {
            reject(new Error(`HTTP错误: ${res.statusCode} ${this.getStatusText(res.statusCode)}`))
          }
        }
      }

      // 发起请求
      wx.request(requestOptions)
    })
  }

  /**
   * POST请求
   * @param {string} url 请求地址
   * @param {Object} data 请求数据
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  post(url, data, options = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'POST',
        data,
        header: options.headers || {},
        timeout: options.timeout || this.timeout,
        success: (res) => {
          resolve({
            data: res.data,
            status: res.statusCode,
            statusText: this.getStatusText(res.statusCode),
            headers: res.header
          })
        },
        fail: (error) => {
          console.error('[HTTP请求] POST请求失败:', error)
          reject(new Error(`网络请求失败: ${error.errMsg || 'Unknown error'}`))
        }
      })
    })
  }

  /**
   * 获取状态码对应的状态文本
   * @param {number} statusCode 状态码
   * @returns {string} 状态文本
   */
  getStatusText(statusCode) {
    const statusTexts = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    }
    return statusTexts[statusCode] || 'Unknown Status'
  }

  /**
   * 创建请求实例（兼容axios API）
   * @param {Object} config 配置选项
   * @returns {MiniProgramHttp} 实例
   */
  static create(config = {}) {
    const instance = new MiniProgramHttp()
    if (config.timeout) {
      instance.timeout = config.timeout
    }
    return instance
  }
}

// 创建默认实例，兼容axios的使用方式
const httpClient = new MiniProgramHttp()

module.exports = httpClient