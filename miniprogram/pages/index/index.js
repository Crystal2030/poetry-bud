const U = require('../../utils/store')

Page({
  data: {
    daily: null,
    dailyBg: '',
    sceneMode: 'light',
    readCount: 0,
    timeGreet: '',
    ageBand: '5-8',    // 默认年龄段
    checkedIn: false,  // 今日已打卡
    streak: 0,         // 连续打卡天数
    reviewCount: 0     // 待复习诗数
  },

  onShow() {
    const g = getApp().globalData
    // 加载保存的年龄偏好
    const savedAge = wx.getStorageSync('pb_age_band') || '5-8'
    const daily = U.getDailyPoem()
    const checkinStatus = U.getCheckinStatus()
    const reviewList = U.getReviewList()
    this.setData({
      daily,
      timeGreet: this.getTimeGreet(),
      sceneMode: daily ? U.getSceneMode(daily.sceneId) : 'light',
      readCount: g.readCount,
      dailyBg: daily ? U.getPoemBg(daily) : '',
      ageBand: savedAge,
      checkedIn: checkinStatus.checkedIn,
      streak: checkinStatus.streak,
      reviewCount: reviewList.length
    })
  },

  getTimeGreet() {
    const h = new Date().getHours()
    if (h < 8)  return '🌙 晚上好'
    if (h < 12) return '☀️ 早上好'
    if (h < 18) return '☀️ 下午好'
    return '🌙 晚上好'
  },

  // ── 分龄切换 ──
  switchAge(e) {
    const age = e.currentTarget.dataset.age
    this.setData({ ageBand: age })
    wx.setStorageSync('pb_age_band', age)
    // 按年龄段过滤每日推荐
    const daily = U.getDailyPoem(age)
    this.setData({
      daily,
      sceneMode: daily ? U.getSceneMode(daily.sceneId) : 'light',
      dailyBg: daily ? U.getPoemBg(daily) : ''
    })
  },

  // ── 每日打卡 ──
  doCheckin(e) {
    e.stopPropagation()  // 不触发 goDetail
    if (this.data.checkedIn) {
      wx.showToast({ title: '今天已经打过卡啦～', icon: 'none', duration: 1500 })
      return
    }
    const result = U.doCheckin()
    this.setData({ checkedIn: true, streak: result.streak })
    wx.showToast({ title: result.streak > 1 ? '连续' + result.streak + '天！🔥' : '今日已打卡 ✓', icon: 'none', duration: 1800 })
    // 连续7天弹出提示
    if (result.streak === 7) {
      setTimeout(() => {
        wx.showModal({
          title: '🎉 坚持之星',
          content: '你已经连续7天读诗啦！芽芽为你骄傲～',
          showCancel: false
        })
      }, 2000)
    }
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
