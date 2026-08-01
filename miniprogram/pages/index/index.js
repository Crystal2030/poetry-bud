const U = require('../../utils/store')

Page({
  data: {
    daily: null,
    dailyBg: '',
    sceneMode: 'light',
    readCount: 0,
    timeGreet: ''
  },

  onShow() {
    const g = getApp().globalData
    const daily = U.getDailyPoem()
    this.setData({
      daily,
      timeGreet: this.getTimeGreet(),
      sceneMode: daily ? U.getSceneMode(daily.sceneId) : 'light',
      readCount: g.readCount
    })
    // cloud:// → HTTPS 异步解析（<image> 不直接支持 cloud:// 协议）
    if (daily) {
      const bgFileId = U.getPoemBg(daily)
      const g = getApp().globalData
      console.log('[index] poem:', daily.id, 'theme映射:', g.themeMap[daily.id] || '(无)', '→', bgFileId)
      U.resolvePoemBg(daily, url => {
        console.log('[index] 背景图解析结果:', url ? url.substring(0,60)+'...' : '(空)')
        this.setData({ dailyBg: url })
      })
    }
  },

  getTimeGreet() {
    const h = new Date().getHours()
    if (h < 8)  return '🌙 晚上好'
    if (h < 12) return '☀️ 早上好'
    if (h < 18) return '☀️ 下午好'
    return '🌙 晚上好'
  },

  goSearch() {
    wx.switchTab({ url: '/pages/library/library' })
    getApp().globalData._libDim = 'search'
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  goLibrary(e) {
    const dim = e.currentTarget.dataset.dim
    wx.switchTab({ url: '/pages/library/library' })
    getApp().globalData._libDim = dim
  },

  goGarden() {
    wx.switchTab({ url: '/pages/garden/garden' })
  }
})
