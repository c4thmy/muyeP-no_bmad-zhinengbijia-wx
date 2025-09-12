/**
 * 系统状态监控工具
 */

// 设备信息收集
export function collectDeviceInfo() {
  try {
    const systemInfo = wx.getSystemInfoSync()
    return {
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      brand: systemInfo.brand,
      model: systemInfo.model,
      pixelRatio: systemInfo.pixelRatio,
      screenWidth: systemInfo.screenWidth,
      screenHeight: systemInfo.screenHeight,
      language: systemInfo.language,
      SDKVersion: systemInfo.SDKVersion,
      benchmarkLevel: systemInfo.benchmarkLevel
    }
  } catch (error) {
    console.error('获取设备信息失败:', error)
    return {}
  }
}

// 网络状态监控
export function startNetworkMonitoring() {
  // 监听网络状态变化
  wx.onNetworkStatusChange((res) => {
    console.log('网络状态变化:', res)
    
    if (!res.isConnected) {
      wx.showToast({
        title: '网络连接中断',
        icon: 'none',
        duration: 3000
      })
    } else {
      console.log('网络已恢复:', res.networkType)
    }
  })
}

// 页面性能监控
export function createPerformanceTracker(pageName) {
  const startTime = Date.now()
  let firstRenderTime = null
  
  return {
    // 记录首次渲染时间
    markFirstRender() {
      firstRenderTime = Date.now()
      console.log(`${pageName} 首次渲染耗时: ${firstRenderTime - startTime}ms`)
    },
    
    // 记录完全加载时间
    markFullyLoaded() {
      const endTime = Date.now()
      console.log(`${pageName} 完全加载耗时: ${endTime - startTime}ms`)
      
      // 性能数据上报（可选）
      return {
        pageName,
        startTime,
        firstRenderTime,
        endTime,
        totalTime: endTime - startTime,
        renderTime: firstRenderTime ? firstRenderTime - startTime : null
      }
    }
  }
}

// 内存使用监控
export function checkMemoryUsage() {
  try {
    const performance = wx.getPerformance?.()
    if (performance && performance.getMemory) {
      const memory = performance.getMemory()
      console.log('内存使用情况:', {
        used: Math.round(memory.usedHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalHeapSize / 1024 / 1024) + 'MB',
        usage: Math.round(memory.usedHeapSize / memory.totalHeapSize * 100) + '%'
      })
      return memory
    }
  } catch (error) {
    console.error('获取内存信息失败:', error)
  }
  return null
}

// 启动监控
export function initMonitoring() {
  console.log('启动系统监控...')
  
  // 收集设备信息
  const deviceInfo = collectDeviceInfo()
  console.log('设备信息:', deviceInfo)
  
  // 启动网络监控
  startNetworkMonitoring()
  
  // 定期检查内存使用
  setInterval(() => {
    checkMemoryUsage()
  }, 30000) // 每30秒检查一次
  
  return deviceInfo
}