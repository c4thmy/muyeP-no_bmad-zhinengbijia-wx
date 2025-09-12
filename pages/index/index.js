const app = getApp()
const { productParser } = require('../../utils/productParser')
const urlResolver = require('../../utils/urlResolver')  // 新增URL解析器
const { validateUrl } = require('../../utils/urlParser')
const { showToast, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    currentLink: '',
    linkError: '',
    loading: false,
    products: [],
    supportedPlatforms: [
      { name: '淘宝', icon: 'taobao.png' },
      { name: '天猫', icon: 'tmall.png' },
      { name: '京东', icon: 'jd.png' },
      { name: '拼多多', icon: 'pdd.png' }
    ]
  },

  onLoad() {
    // 从全局数据恢复已添加的商品
    const globalProducts = app.globalData.compareProducts || []
    this.setData({
      products: globalProducts
    })
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.refreshProductList()
  },

  // 输入框内容变化
  onLinkInput(e) {
    const value = e.detail.value.trim()
    this.setData({
      currentLink: value,
      linkError: ''
    })
  },

  // 增强的链接验证逻辑
  async validateLink(link) {
    if (!link) {
      return '请输入商品链接'
    }

    // 基础格式验证
    const validation = validateUrl(link)
    if (!validation.valid) {
      return validation.error
    }

    // 使用URL解析器进行更深入的验证
    try {
      console.log('[链接验证] 开始解析URL:', link)
      
      const urlResult = await urlResolver.resolveUrl(link)
      if (!urlResult.success) {
        return this.getFriendlyErrorMessage(urlResult.error)
      }

      // 检查是否已添加过相同的最终商品
      const isDuplicate = this.checkDuplicateProduct(urlResult.finalUrl, link)
      if (isDuplicate) {
        return '该商品已添加，请勿重复添加'
      }

      console.log('[链接验证] 验证通过:', {
        platform: urlResult.platform?.name,
        isShortLink: urlResult.isShortLink
      })

      return null // 验证通过

    } catch (error) {
      console.error('[链接验证] 验证失败:', error)
      return this.getFriendlyErrorMessage(error.message)
    }
  },

  // 检查重复商品
  checkDuplicateProduct(finalUrl, originalUrl) {
    return this.data.products.some(product => {
      // 比较最终URL
      if (product.finalUrl && product.finalUrl === finalUrl) {
        return true
      }
      
      // 比较原始URL
      if (product.originalLink === originalUrl) {
        return true
      }
      
      // 比较清理后的URL
      const cleanedNew = this.cleanUrlForComparison(finalUrl)
      const cleanedExisting = this.cleanUrlForComparison(product.finalUrl || product.originalLink)
      
      return cleanedNew === cleanedExisting
    })
  },

  // 清理URL用于比较（移除参数差异）
  cleanUrlForComparison(url) {
    try {
      // 提取关键信息进行比较
      const [baseUrl] = url.split('?')
      return baseUrl.toLowerCase()
    } catch {
      return url.toLowerCase()
    }
  },

  // 获取友好的错误信息
  getFriendlyErrorMessage(errorMsg) {
    const errorMap = {
      '链接不能为空': '请输入商品链接',
      '请输入有效的网址链接': '请输入正确格式的商品链接',
      '暂不支持该平台': '暂不支持该购物平台，请使用淘宝、天猫、京东或拼多多链接',
      '网络请求失败': '网络异常，请检查网络连接后重试',
      '请求超时': '网络连接超时，请重试',
      '无法解析短链接重定向': '短链接解析失败，请尝试使用完整的商品页面链接',
      'HTTP错误': '服务器响应异常，请稍后重试',
      'URL解析失败': '链接解析失败，请确认链接有效'
    }
    
    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMsg.includes(key)) {
        return value
      }
    }
    
    // 默认错误处理
    if (errorMsg.includes('短链接') || errorMsg.includes('重定向')) {
      return '短链接处理失败，建议使用完整商品页面链接'
    }
    
    if (errorMsg.includes('网络') || errorMsg.includes('请求')) {
      return '网络异常，请检查网络连接后重试'
    }
    
    return errorMsg || '链接验证失败，请重试'
  },

  // 识别平台
  detectPlatform(link) {
    const platforms = app.globalData.supportedPlatforms
    for (let platform of platforms) {
      if (platform.pattern.test(link)) {
        return platform.name
      }
    }
    return '未知平台'
  },

  // 改进的添加商品方法
  async addProduct() {
    const { currentLink } = this.data
    
    console.log('[添加商品] 开始处理:', currentLink)
    
    // 链接验证
    const error = await this.validateLink(currentLink)
    if (error) {
      this.setData({ linkError: error })
      // 添加触觉反馈
      wx.vibrateShort && wx.vibrateShort({ type: 'heavy' })
      return
    }

    this.setData({ loading: true, linkError: '' })
    showLoading('解析商品中...')

    try {
      // 检测网络状态
      const networkType = await this.checkNetwork()
      if (!networkType.isConnected) {
        throw new Error('网络连接异常，请检查网络设置')
      }

      console.log('[添加商品] 开始解析商品信息')
      
      // 使用改进的商品解析器
      const productInfo = await productParser.parseProduct(currentLink)

      if (!productInfo.success) {
        throw new Error(productInfo.error || '商品解析失败')
      }

      // 添加到列表
      const products = [...this.data.products, productInfo]
      this.setData({
        products,
        currentLink: ''
      })

      // 保存到全局数据
      app.globalData.compareProducts = products

      // 成功反馈
      wx.vibrateShort && wx.vibrateShort({ type: 'light' })
      showToast('添加成功', 'success')
      
      console.log('[添加商品] 商品添加成功:', productInfo.title)

    } catch (error) {
      console.error('[添加商品] 添加失败:', error)
      
      // 错误反馈
      wx.vibrateShort && wx.vibrateShort({ type: 'heavy' })
      
      const errorMessage = this.getFriendlyErrorMessage(error.message)
      this.setData({ linkError: errorMessage })
      
      showToast(errorMessage, 'none')
    } finally {
      this.setData({ loading: false })
      hideLoading()
    }
  },

  // 检测网络状态
  async checkNetwork() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          resolve({
            isConnected: res.networkType !== 'none',
            networkType: res.networkType
          })
        },
        fail: () => {
          resolve({
            isConnected: false,
            networkType: 'unknown'
          })
        }
      })
    })
  },

  // 获取友好的错误信息
  getErrorMessage(errorMsg) {
    const errorMap = {
      '链接格式不正确': '请输入正确的商品链接',
      '网络请求失败': '网络异常，请稍后重试',
      '解析失败': '商品信息获取失败，请重试',
      '暂不支持该平台': '暂不支持该购物平台'
    }
    
    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMsg.includes(key)) {
        return value
      }
    }
    
    return errorMsg || '操作失败，请重试'
  },

  // 删除商品
  removeProduct(e) {
    const index = e.currentTarget.dataset.index
    const products = this.data.products.filter((_, i) => i !== index)
    
    this.setData({ products })
    app.globalData.compareProducts = products

    wx.showToast({
      title: '删除成功',
      icon: 'success'
    })
  },

  // 清空所有商品
  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有已添加的商品吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ products: [] })
          app.globalData.compareProducts = []
          
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 开始比较
  startCompare() {
    if (this.data.products.length < 2) {
      wx.showToast({
        title: '至少需要2个商品才能比较',
        icon: 'none'
      })
      return
    }

    // 检查是否有解析失败的商品
    const failedProducts = this.data.products.filter(p => 
      p.title.includes('解析失败') || p.title === '解析中...'
    )

    if (failedProducts.length > 0) {
      wx.showModal({
        title: '提示',
        content: '有商品正在解析或解析失败，是否继续比较？',
        success: (res) => {
          if (res.confirm) {
            this.navigateToCompare()
          }
        }
      })
    } else {
      this.navigateToCompare()
    }
  },

  // 跳转到比较页面
  navigateToCompare() {
    wx.switchTab({
      url: '/pages/compare/compare'
    })
  },

  // 刷新商品列表
  refreshProductList() {
    const globalProducts = app.globalData.compareProducts || []
    this.setData({
      products: globalProducts
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '智能比价小程序',
      path: '/pages/index/index',
      imageUrl: '/images/share-image.png'
    }
  }
})