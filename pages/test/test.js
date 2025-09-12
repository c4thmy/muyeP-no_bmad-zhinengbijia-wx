const { validateUrl } = require('../../utils/urlParser')
const { productParser } = require('../../utils/productParser')

Page({
  data: {
    testUrl: '',
    testResult: null,
    parseResult: null,
    loading: false,
    presetLinks: [
      {
        name: '淘宝商品',
        url: 'https://item.taobao.com/item.htm?id=123456789'
      },
      {
        name: '天猫商品',
        url: 'https://detail.tmall.com/item.htm?id=987654321'
      },
      {
        name: '京东商品',
        url: 'https://item.jd.com/12345.html'
      },
      {
        name: '拼多多商品',
        url: 'https://mobile.yangkeduo.com/goods.html?goods_id=54321'
      },
      {
        name: '相同淘宝商品(测试重复)',
        url: 'https://item.taobao.com/item.htm?id=123456789&spm=a1b2c3'
      },
      {
        name: '无效链接',
        url: 'invalid-url'
      }
    ]
  },

  onLoad() {
    console.log('测试页面加载')
  },

  // 输入链接
  onTestInput(e) {
    this.setData({
      testUrl: e.detail.value,
      testResult: null,
      parseResult: null
    })
  },

  // 验证链接
  testValidation() {
    const { testUrl } = this.data
    
    if (!testUrl.trim()) {
      wx.showToast({
        title: '请输入链接',
        icon: 'none'
      })
      return
    }

    console.log('测试链接:', testUrl)
    
    try {
      const result = validateUrl(testUrl)
      console.log('验证结果:', result)
      
      const testResult = {
        valid: result.valid,
        error: result.error,
        platform: result.platform,
        fullUrl: result.fullUrl,
        message: result.valid ? '链接格式正确，平台支持' : result.error
      }
      
      this.setData({ testResult })
      
    } catch (error) {
      console.error('验证出错:', error)
      this.setData({
        testResult: {
          valid: false,
          error: error.message,
          message: '验证过程出错: ' + error.message
        }
      })
    }
  },

  // 测试解析
  async testParsing() {
    const { testUrl } = this.data
    
    if (!testUrl.trim()) {
      wx.showToast({
        title: '请输入链接',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true, parseResult: null })

    try {
      console.log('开始解析商品:', testUrl)
      const result = await productParser.parseProduct(testUrl)
      console.log('解析结果:', result)
      
      this.setData({
        parseResult: {
          success: true,
          product: result,
          message: '解析成功'
        }
      })
      
    } catch (error) {
      console.error('解析出错:', error)
      this.setData({
        parseResult: {
          success: false,
          error: error.message,
          message: '解析失败: ' + error.message
        }
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 使用预设链接
  usePresetLink(e) {
    const url = e.currentTarget.dataset.url
    this.setData({
      testUrl: url,
      testResult: null,
      parseResult: null
    })
  }
})