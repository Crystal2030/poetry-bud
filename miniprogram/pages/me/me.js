Page({
  data: {
    readCount: 0,
    favCount: 0
  },

  onShow() {
    const g = getApp().globalData
    this.setData({
      readCount: g.readCount,
      favCount: g.favorites.length
    })
  },

  resetData() {
    wx.showModal({
      title: '确认',
      content: '确定要清除所有学习记录吗？不可恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('pb_read')
          wx.removeStorageSync('pb_fav')
          const g = getApp().globalData
          g.readCount = 0
          g.favorites = []
          this.setData({ readCount: 0, favCount: 0 })
          wx.showToast({ title: '已清除', icon: 'none' })
        }
      }
    })
  }
})
