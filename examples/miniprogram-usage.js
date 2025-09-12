/**
 * 微信小程序中使用商品解析系统的示例
 * 在 pages/index/index.js 中的使用方法
 */

const { productParser } = require('../../utils/productParser')

Page({
  data: {
    inputUrl: '',
    productInfo: null,
    loading: false,
    errorMessage: ''
  },

  /**
   * 监听输入框内容变化
   */
  onInputChange(e) {
    this.setData({
      inputUrl: e.detail.value
    })
  },

  /**
   * 解析商品链接
   */
  async parseProduct() {
    const { inputUrl } = this.data
    
    if (!inputUrl.trim()) {
      wx.showToast({
        title: '请输入商品链接',
        icon: 'none'
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: '',
      productInfo: null
    })

    try {
      console.log('开始解析商品:', inputUrl)
      const result = await productParser.parseProduct(inputUrl)

      if (result.success) {
        // 解析成功
        this.setData({
          productInfo: result,
          loading: false
        })
        
        wx.showToast({
          title: '解析成功',
          icon: 'success'
        })
      } else {
        // 解析失败，显示错误信息
        this.handleParseError(result)
      }

    } catch (error) {
      console.error('商品解析异常:', error)
      this.setData({
        loading: false,
        errorMessage: '系统异常，请稍后重试'
      })
      
      wx.showToast({
        title: '解析失败',
        icon: 'none'
      })
    }
  },

  /**
   * 处理解析错误
   */
  handleParseError(result) {
    this.setData({
      loading: false,
      errorMessage: result.description || '解析失败'
    })

    // 根据错误类型给出不同的提示
    switch (result.errorType) {
      case 'domain_not_configured':
        this.showDomainConfigDialog()
        break
      
      case 'product_not_found':
        wx.showModal({
          title: '商品不存在',
          content: '该商品可能已下架或链接有误，请检查链接是否正确',
          showCancel: false
        })
        break
      
      case 'app_required':
        wx.showModal({
          title: '需要APP打开',
          content: '该链接需要在对应的购物APP中打开',
          showCancel: false
        })
        break
      
      default:
        wx.showToast({
          title: result.description || '解析失败',
          icon: 'none',
          duration: 3000
        })
    }
  },

  /**
   * 显示域名配置对话框
   */
  showDomainConfigDialog() {
    wx.showModal({
      title: '网络请求受限',
      content: '小程序需要配置request合法域名才能请求商品信息。请在小程序管理后台配置域名或使用后端代理服务。',
      confirmText: '查看帮助',
      success: (res) => {
        if (res.confirm) {
          // 可以跳转到帮助页面或显示更详细的配置指导
          this.showConfigGuide()
        }
      }
    })
  },

  /**
   * 显示配置指南
   */
  showConfigGuide() {
    const domains = [
      'https://item.jd.com',
      'https://detail.tmall.com', 
      'https://item.taobao.com',
      'https://e.tb.cn',
      'https://mobile.yangkeduo.com'
    ]
    
    wx.showModal({
      title: '域名配置指南',
      content: `请在小程序管理后台的"开发设置"中添加以下域名到request合法域名列表：\n\n${domains.join('\n')}`,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  /**
   * 复制商品链接
   */
  copyProductUrl() {
    const { productInfo } = this.data
    if (productInfo && productInfo.originalLink) {
      wx.setClipboardData({
        data: productInfo.originalLink,
        success: () => {
          wx.showToast({
            title: '链接已复制',
            icon: 'success'
          })
        }
      })
    }
  },

  /**
   * 分享商品
   */
  shareProduct() {
    const { productInfo } = this.data
    if (productInfo) {
      return {
        title: productInfo.title,
        path: `/pages/product/product?url=${encodeURIComponent(productInfo.originalLink)}`,
        imageUrl: productInfo.image
      }
    }
  },

  /**
   * 页面生命周期 - 加载完成
   */
  onLoad(options) {
    // 如果从分享链接进入，自动解析商品
    if (options.url) {
      const decodedUrl = decodeURIComponent(options.url)
      this.setData({
        inputUrl: decodedUrl
      })
      // 延迟一点时间再自动解析，让页面加载完成
      setTimeout(() => {
        this.parseProduct()
      }, 500)
    }
  }
})