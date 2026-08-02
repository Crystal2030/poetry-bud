const app = getApp()

Page({
  data: {
    current: 0,
    selectedAge: '',
    values: [
      { icon: '/static/icons/paper/book.svg', label: '四步学习' },
      { icon: '/static/icons/paper/target.svg', label: '课标125首' },
      { icon: '/static/icons/paper/trophy.svg', label: '徽章收集' },
      { icon: '/static/icons/paper/sprout-small.svg', label: '分龄适读' }
    ]
  },

  selectAge(e) {
    const age = e.currentTarget.dataset.age
    this.setData({ selectedAge: age })
    // 存入 storage
    wx.setStorageSync('pb_age_band', age)
    // 自动滑到屏3
    setTimeout(() => {
      this.setData({ current: 2 })
    }, 400)
  },

  startExplore() {
    if (!this.data.selectedAge) {
      wx.showToast({ title: '先选一下年龄哦～', icon: 'none', duration: 2000 })
      return
    }
    wx.setStorageSync('pb_age_band', this.data.selectedAge)
    wx.setStorageSync('pb_onboarded', true)
    // 跳转首页
    wx.switchTab({ url: '/pages/index/index' })
  },

  onSwiperChange(e) {
    this.setData({ current: e.detail.current })
  },

  onLoad() {
    // 如果已经引导过，直接跳首页
    if (wx.getStorageSync('pb_onboarded')) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  }
})
