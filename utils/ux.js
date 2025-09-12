/**
 * 用户体验优化配置
 */

// 添加触觉反馈
export function addHapticFeedback(type = 'light') {
  if (wx.vibrateShort) {
    wx.vibrateShort({
      type: type // light, medium, heavy
    })
  }
}

// 添加页面加载状态
export function showPageLoading(title = '加载中...') {
  wx.showNavigationBarLoading()
  wx.showLoading({
    title: title,
    mask: true
  })
}

export function hidePageLoading() {
  wx.hideNavigationBarLoading()
  wx.hideLoading()
}

// 网络状态检测
export function checkNetworkStatus() {
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
}

// 性能监控
export function performanceMonitor() {
  const performance = wx.getPerformance()
  
  return {
    // 获取内存信息
    getMemoryInfo() {
      if (performance.getMemory) {
        return performance.getMemory()
      }
      return null
    },
    
    // 监控页面性能
    measurePageLoad(pageName) {
      const startTime = Date.now()
      
      return {
        end() {
          const endTime = Date.now()
          const duration = endTime - startTime
          
          console.log(`页面 ${pageName} 加载耗时: ${duration}ms`)
          
          // 可以上报到分析服务
          return duration
        }
      }
    }
  }
}