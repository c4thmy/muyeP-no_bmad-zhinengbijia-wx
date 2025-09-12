Component({
  /**
   * 组件属性
   */
  properties: {
    // 商品数据
    product: {
      type: Object,
      value: {}
    },
    
    // 自定义样式类
    className: {
      type: String,
      value: ''
    },
    
    // 是否显示参数
    showParams: {
      type: Boolean,
      value: true
    },
    
    // 是否显示查看按钮
    showViewButton: {
      type: Boolean,
      value: true
    },
    
    // 是否显示比较按钮
    showCompareButton: {
      type: Boolean,
      value: false
    },
    
    // 是否显示移除按钮
    showRemoveButton: {
      type: Boolean,
      value: false
    },
    
    // 是否在比较列表中
    isInCompare: {
      type: Boolean,
      value: false
    },
    
    // 是否加载中
    loading: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件数据
   */
  data: {
    mainParams: []
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 组件生命周期 - 组件实例进入页面节点树时执行
     */
    attached() {
      this.updateMainParams()
    },

    /**
     * 监听属性变化
     */
    observers: {
      'product.params': function(params) {
        this.updateMainParams()
      }
    },

    /**
     * 更新主要参数显示
     */
    updateMainParams() {
      const { product } = this.data
      if (!product.params) {
        this.setData({ mainParams: [] })
        return
      }

      // 定义主要参数的优先级
      const priorityKeys = ['brand', 'storage', 'memory', 'color', 'size']
      const paramLabels = {
        brand: '品牌',
        storage: '存储',
        memory: '内存', 
        color: '颜色',
        size: '尺寸',
        model: '型号'
      }

      const mainParams = priorityKeys
        .filter(key => product.params[key])
        .slice(0, 3) // 最多显示3个主要参数
        .map(key => ({
          key,
          label: paramLabels[key] || key,
          value: product.params[key]
        }))

      this.setData({ mainParams })
    },

    /**
     * 图片加载完成
     */
    onImageLoad(e) {
      this.triggerEvent('imageload', {
        product: this.data.product,
        event: e
      })
    },

    /**
     * 图片加载失败
     */
    onImageError(e) {
      console.warn('商品图片加载失败:', this.data.product.title)
      this.triggerEvent('imageerror', {
        product: this.data.product,
        event: e
      })
    },

    /**
     * 查看商品详情
     */
    onViewProduct(e) {
      e.stopPropagation()
      
      this.triggerEvent('view', {
        product: this.data.product
      })
    },

    /**
     * 比较商品
     */
    onCompareProduct(e) {
      e.stopPropagation()
      
      this.triggerEvent('compare', {
        product: this.data.product,
        isInCompare: this.data.isInCompare
      })
    },

    /**
     * 移除商品
     */
    onRemoveProduct(e) {
      e.stopPropagation()
      
      wx.showModal({
        title: '确认移除',
        content: '确定要移除该商品吗？',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('remove', {
              product: this.data.product
            })
          }
        }
      })
    },

    /**
     * 复制商品链接
     */
    copyProductLink() {
      const { product } = this.data
      
      if (!product.originalLink) {
        wx.showToast({
          title: '链接不存在',
          icon: 'none'
        })
        return
      }

      wx.setClipboardData({
        data: product.originalLink,
        success: () => {
          wx.showToast({
            title: '链接已复制',
            icon: 'success'
          })
        },
        fail: () => {
          wx.showToast({
            title: '复制失败',
            icon: 'none'
          })
        }
      })
    },

    /**
     * 分享商品
     */
    shareProduct() {
      const { product } = this.data
      
      return {
        title: product.title || '商品分享',
        path: `/pages/product/detail?id=${product.id}`,
        imageUrl: product.image
      }
    },

    /**
     * 获取商品摘要信息
     */
    getProductSummary() {
      const { product } = this.data
      
      return {
        id: product.id,
        title: product.title,
        price: product.price,
        platform: product.platform,
        image: product.image,
        url: product.originalLink
      }
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件实例进入页面节点树时执行
      this.updateMainParams()
    },
    
    detached() {
      // 组件实例被从页面节点树移除时执行
    }
  },

  /**
   * 组件所在页面生命周期
   */
  pageLifetimes: {
    show() {
      // 组件所在的页面被展示时执行
    },
    
    hide() {
      // 组件所在的页面被隐藏时执行
    }
  }
})