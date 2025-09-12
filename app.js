const { initMonitoring } = require('./utils/monitor')

App({
  onLaunch() {
    console.log('智能比价小程序启动')
    
    // 启动系统监控
    const deviceInfo = initMonitoring()
    
    // 获取微信版本信息
    const systemInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = systemInfo
    this.globalData.deviceInfo = deviceInfo
    
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      })
    }

    // 检查小程序更新
    this.checkUpdate()
  },

  onShow() {
    console.log('小程序显示')
  },

  onHide() {
    console.log('小程序隐藏')
  },

  onError(error) {
    console.error('小程序出现错误:', error)
    
    // 错误上报（可选）
    this.reportError(error)
  },

  // 检查小程序更新
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果:', res.hasUpdate)
      })
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
      
      updateManager.onUpdateFailed(() => {
        console.error('新版本下载失败')
      })
    }
  },

  // 错误上报
  reportError(error) {
    // 这里可以集成错误监控服务
    console.log('错误上报:', {
      error: error.toString(),
      stack: error.stack,
      time: new Date().toISOString(),
      device: this.globalData.deviceInfo
    })
  },

  globalData: {
    systemInfo: null,
    userInfo: null,
    compareProducts: [], // 用于存储比较的商品数据
    supportedPlatforms: [
      { name: '淘宝', domain: 'taobao.com', pattern: /item\.taobao\.com/ },
      { name: '天猫', domain: 'tmall.com', pattern: /detail\.tmall\.com/ },
      { name: '京东', domain: 'jd.com', pattern: /item\.jd\.com/ },
      { name: '拼多多', domain: 'yangkeduo.com', pattern: /mobile\.yangkeduo\.com/ }
    ]
  }
})