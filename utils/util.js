/**
 * 通用工具函数
 */

/**
 * 格式化价格
 * @param {number|string} price 价格
 * @param {string} currency 货币符号
 * @returns {string} 格式化后的价格
 */
function formatPrice(price, currency = '¥') {
  if (!price || isNaN(parseFloat(price))) {
    return '暂无价格'
  }
  
  const numPrice = parseFloat(price)
  return `${currency}${numPrice.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

/**
 * 格式化时间
 * @param {string|Date} date 日期
 * @param {string} format 格式
 * @returns {string} 格式化后的时间
 */
function formatTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date)
  
  if (isNaN(d.getTime())) {
    return '无效时间'
  }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 相对时间格式化
 * @param {string|Date} date 日期
 * @returns {string} 相对时间描述
 */
function formatRelativeTime(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return formatTime(date, 'MM-DD HH:mm')
}

/**
 * 截断文本
 * @param {string} text 文本
 * @param {number} maxLength 最大长度
 * @param {string} suffix 后缀
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLength = 50, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text || ''
  }
  
  return text.substring(0, maxLength) + suffix
}

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间
 * @param {boolean} immediate 是否立即执行
 * @returns {Function} 防抖函数
 */
function debounce(func, wait = 300, immediate = false) {
  let timeout
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func.apply(this, args)
    }
    
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func.apply(this, args)
  }
}

/**
 * 节流函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间
 * @returns {Function} 节流函数
 */
function throttle(func, wait = 300) {
  let inThrottle
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, wait)
    }
  }
}

/**
 * 深拷贝
 * @param {*} obj 要拷贝的对象
 * @returns {*} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

/**
 * 生成唯一ID
 * @param {string} prefix 前缀
 * @returns {string} 唯一ID
 */
function generateId(prefix = '') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}${timestamp}_${random}`
}

/**
 * 存储管理
 */
const storage = {
  /**
   * 设置存储
   * @param {string} key 键
   * @param {*} value 值
   * @param {number} expire 过期时间(毫秒)
   */
  set(key, value, expire = 0) {
    const data = {
      value,
      expire: expire > 0 ? Date.now() + expire : 0
    }
    
    try {
      wx.setStorageSync(key, JSON.stringify(data))
    } catch (error) {
      console.error('存储失败:', error)
    }
  },
  
  /**
   * 获取存储
   * @param {string} key 键
   * @param {*} defaultValue 默认值
   * @returns {*} 存储的值
   */
  get(key, defaultValue = null) {
    try {
      const data = wx.getStorageSync(key)
      if (!data) return defaultValue
      
      const parsed = JSON.parse(data)
      
      // 检查是否过期
      if (parsed.expire > 0 && Date.now() > parsed.expire) {
        this.remove(key)
        return defaultValue
      }
      
      return parsed.value
    } catch (error) {
      console.error('获取存储失败:', error)
      return defaultValue
    }
  },
  
  /**
   * 移除存储
   * @param {string} key 键
   */
  remove(key) {
    try {
      wx.removeStorageSync(key)
    } catch (error) {
      console.error('移除存储失败:', error)
    }
  },
  
  /**
   * 清空存储
   */
  clear() {
    try {
      wx.clearStorageSync()
    } catch (error) {
      console.error('清空存储失败:', error)
    }
  }
}

/**
 * 设备信息检测
 * @returns {Object} 设备信息
 */
function getDeviceInfo() {
  try {
    const systemInfo = wx.getSystemInfoSync()
    return {
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      SDKVersion: systemInfo.SDKVersion,
      brand: systemInfo.brand,
      model: systemInfo.model,
      pixelRatio: systemInfo.pixelRatio,
      screenWidth: systemInfo.screenWidth,
      screenHeight: systemInfo.screenHeight,
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight,
      statusBarHeight: systemInfo.statusBarHeight,
      safeArea: systemInfo.safeArea
    }
  } catch (error) {
    console.error('获取设备信息失败:', error)
    return {}
  }
}

/**
 * 显示提示信息
 * @param {string} title 提示文字
 * @param {string} icon 图标
 * @param {number} duration 持续时间
 */
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration,
    mask: true
  })
}

/**
 * 显示加载提示
 * @param {string} title 提示文字
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

module.exports = {
  formatPrice,
  formatTime,
  formatRelativeTime,
  truncateText,
  debounce,
  throttle,
  deepClone,
  generateId,
  storage,
  getDeviceInfo,
  showToast,
  showLoading,
  hideLoading
}