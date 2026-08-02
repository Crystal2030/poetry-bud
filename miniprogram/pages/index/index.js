const U = require('../../utils/store')

Page({
  data: {
    daily: null,
    dailyPoem: null,   // v3.0 芽芽推荐诗卡
    dailyBg: '',
    sceneMode: 'light',
    readCount: 0,
    timeGreet: '',
    ageBand: '7-10',    // 默认年龄段
    ageLabel: '7–10岁',  // 芽芽推荐诗卡上的年龄段标签
    checkedIn: false,  // 今日已打卡
    streak: 0,         // 连续打卡天数
    reviewCount: 0,    // 待复习诗数
    hideInfoBar: false  // 是否隐藏信息条
  },

  onShow() {
    const g = getApp().globalData
    // 加载保存的年龄偏好
    const savedAge = wx.getStorageSync('pb_age_band') || '7-10'
    const daily = U.getDailyPoem()
    const checkinStatus = U.getCheckinStatus()
    const reviewList = U.getReviewList()
    this.setData({
      daily,
      dailyPoem: daily,     // v3.0 芽芽推荐诗卡
      timeGreet: this.getTimeGreet(),
      sceneMode: daily ? U.getSceneMode(daily.sceneId) : 'light',
      readCount: g.readCount,
      dailyBg: daily ? U.getPoemBg(daily) : '',
      ageBand: savedAge,
      ageLabel: savedAge.replace('-', '–') + '岁',  // e.g. "5–8岁"
      checkedIn: checkinStatus.checkedIn,
      streak: checkinStatus.streak,
      reviewCount: reviewList.length
    })
  },

  getTimeGreet() {
    const h = new Date().getHours()
    if (h < 8)  return '晚上好'
    if (h < 12) return '早上好'
    if (h < 18) return '下午好'
    return '晚上好'
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

  // ── 每日一诗背景图加载诊断 ──
  onDailyBgLoad() {
    console.log('[每日一诗] 背景图加载成功:', this.data.dailyBg)
  },
  onDailyBgError(e) {
    console.warn('[每日一诗] 背景图加载失败:', this.data.dailyBg, e && e.detail)
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
    wx.showToast({ title: result.streak > 1 ? '连续' + result.streak + '天！' : '今日已打卡', icon: 'none', duration: 1800 })
    // 连续7天弹出提示
    if (result.streak === 7) {
      setTimeout(() => {
        wx.showModal({
          title: '坚持之星',
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
  },

  // ── v3.0 家长 FAQ ──
  openFAQ() {
    wx.showModal({
      title: '关于课标对标',
      content: '诗芽精选 125 首篇目完全覆盖《语文课程标准(2022)》小学阶段必背古诗。分龄推荐系统帮助不同年龄段的孩子找到最适合的篇目。',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
