const app = getApp()

Page({
  data: {
    products: [],
    sortedProducts: [],
    priceSort: '', // 'asc' | 'desc'
    paramCategories: ['全部参数', '基本信息', '硬件配置', '外观设计'],
    selectedParamIndex: 0,
    filteredParams: [],
    lowestPriceProduct: null,
    highestPriceProduct: null,
    priceDifference: 0,
    recommendation: ''
  },

  onLoad() {
    this.loadCompareData()
  },

  onShow() {
    this.loadCompareData()
  },

  // 加载比较数据
  loadCompareData() {
    const products = app.globalData.compareProducts || []
    
    if (products.length === 0) {
      this.setData({ products: [] })
      return
    }

    // 过滤有效商品（价格不为空）
    const validProducts = products.filter(p => p.price && !isNaN(parseFloat(p.price)))
    
    this.setData({
      products: products,
      sortedProducts: validProducts
    })

    this.calculatePriceStats(validProducts)
    this.generateParamTable(products)
    this.generateRecommendation(validProducts)
  },

  // 计算价格统计
  calculatePriceStats(products) {
    if (products.length === 0) return

    // 标记最低价商品
    const productsWithPrice = products.map(p => ({
      ...p,
      numPrice: parseFloat(p.price)
    })).sort((a, b) => a.numPrice - b.numPrice)

    const lowestPrice = productsWithPrice[0]
    const highestPrice = productsWithPrice[productsWithPrice.length - 1]
    
    // 标记最低价
    const sortedProducts = products.map(p => ({
      ...p,
      isLowest: parseFloat(p.price) === lowestPrice.numPrice
    }))

    this.setData({
      sortedProducts,
      lowestPriceProduct: lowestPrice,
      highestPriceProduct: highestPrice,
      priceDifference: (highestPrice.numPrice - lowestPrice.numPrice).toFixed(2)
    })
  },

  // 价格排序
  sortByPrice(e) {
    const order = e.currentTarget.dataset.order
    const products = [...this.data.sortedProducts]
    
    products.sort((a, b) => {
      const priceA = parseFloat(a.price) || 0
      const priceB = parseFloat(b.price) || 0
      
      return order === 'asc' ? priceA - priceB : priceB - priceA
    })

    this.setData({
      sortedProducts: products,
      priceSort: order
    })
  },

  // 生成参数对比表
  generateParamTable(products) {
    if (products.length === 0) return

    // 收集所有参数
    const allParams = new Set()
    products.forEach(product => {
      if (product.params) {
        Object.keys(product.params).forEach(key => allParams.add(key))
      }
    })

    // 参数分类映射
    const paramCategories = {
      '基本信息': ['brand', 'model', 'name'],
      '硬件配置': ['storage', 'memory', 'cpu', 'gpu', 'screen'],
      '外观设计': ['color', 'size', 'weight', 'material']
    }

    // 生成参数列表
    const paramList = Array.from(allParams).map(key => ({
      key,
      label: this.getParamLabel(key),
      category: this.getParamCategory(key, paramCategories)
    }))

    this.setData({
      allParams: paramList,
      filteredParams: paramList
    })
  },

  // 获取参数标签
  getParamLabel(key) {
    const labels = {
      brand: '品牌',
      model: '型号', 
      name: '名称',
      storage: '存储容量',
      memory: '内存',
      cpu: '处理器',
      gpu: '显卡',
      screen: '屏幕',
      color: '颜色',
      size: '尺寸',
      weight: '重量',
      material: '材质'
    }
    return labels[key] || key
  },

  // 获取参数分类
  getParamCategory(key, categories) {
    for (let [category, keys] of Object.entries(categories)) {
      if (keys.includes(key)) {
        return category
      }
    }
    return '其他'
  },

  // 参数筛选
  onParamFilterChange(e) {
    const index = e.detail.value
    const category = this.data.paramCategories[index]
    
    let filteredParams = this.data.allParams || []
    
    if (category !== '全部参数') {
      filteredParams = filteredParams.filter(param => 
        param.category === category
      )
    }

    this.setData({
      selectedParamIndex: index,
      filteredParams
    })
  },

  // 获取参数值样式类
  getParamValueClass(value, key) {
    if (!value || value === '未知') return ''
    
    // 根据参数类型添加不同样式
    if (key === 'storage' && value.includes('1TB')) return 'highlight'
    if (key === 'memory' && parseInt(value) >= 16) return 'highlight'
    
    return ''
  },

  // 获取主要参数
  getMainParams(params) {
    if (!params) return []
    
    const mainKeys = ['brand', 'storage', 'color', 'memory']
    return mainKeys
      .filter(key => params[key])
      .slice(0, 3)
      .map(key => ({
        key,
        label: this.getParamLabel(key),
        value: params[key]
      }))
  },

  // 生成推荐理由
  generateRecommendation(products) {
    if (products.length === 0) return

    const lowest = this.data.lowestPriceProduct
    if (!lowest) return

    const recommendations = [
      `基于价格分析，${lowest.title} 具有最优的性价比`,
      '该商品在同类产品中价格优势明显',
      '建议根据个人需求和预算进行最终选择'
    ]

    this.setData({
      recommendation: recommendations.join('，') + '。'
    })
  },

  // 查看商品详情
  viewProductDetail(e) {
    const product = e.currentTarget.dataset.product
    
    wx.showModal({
      title: product.title,
      content: `平台：${product.platform}\n价格：¥${product.price}\n点击确定复制链接`,
      success: (res) => {
        if (res.confirm) {
          this.copyLink({ currentTarget: { dataset: { link: product.originalLink } } })
        }
      }
    })
  },

  // 复制链接
  copyLink(e) {
    const link = e.currentTarget.dataset.link
    
    wx.setClipboardData({
      data: link,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      }
    })
  },

  // 从比较中移除
  removeFromCompare(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认移除',
      content: '确定要从比较列表中移除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          const products = this.data.products.filter(p => p.id !== id)
          
          // 更新全局数据
          app.globalData.compareProducts = products
          
          // 重新加载数据
          this.loadCompareData()
          
          wx.showToast({
            title: '移除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 导出结果
  exportResult() {
    wx.showActionSheet({
      itemList: ['保存为图片', '生成PDF', '导出Excel'],
      success: (res) => {
        const actions = ['image', 'pdf', 'excel']
        const action = actions[res.tapIndex]
        
        wx.showToast({
          title: `导出${action}功能开发中`,
          icon: 'none'
        })
      }
    })
  },

  // 分享结果
  shareResult() {
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  // 返回首页
  goToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCompareData()
    wx.stopPullDownRefresh()
  },

  // 分享功能
  onShareAppMessage() {
    const productCount = this.data.products.length
    return {
      title: `我正在比较 ${productCount} 个商品的价格和参数`,
      path: '/pages/compare/compare',
      imageUrl: '/images/share-compare.png'
    }
  },

  onShareTimeline() {
    const productCount = this.data.products.length
    return {
      title: `智能比价：${productCount}个商品对比结果`,
      imageUrl: '/images/share-compare.png'
    }
  }
})