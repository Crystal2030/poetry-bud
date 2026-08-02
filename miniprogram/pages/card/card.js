const U = require('../../utils/store')

Page({
  data: {
    poem: null,
    poemBg: '',
    waveHeights: []
  },

  onLoad(options) {
    const id = options.id
    const p = getApp().globalData.poems.find(p => p.id === id)
    if (!p) return
    // 生成随机波形高度
    const heights = []
    for (let i = 0; i < 15; i++) heights.push(Math.floor(10 + Math.random() * 34))
    this.setData({
      poem: p,
      poemBg: U.getPoemBg(p),
      waveHeights: heights
    })
  },

  goBack() { wx.navigateBack() },
  saveCard() { U.showToast('卡片已保存') },
  shareCard() {
    // 小程序分享
    wx.showShareMenu({ withShareTicket: true })
    U.showToast('点击右上角分享')
  },
  printCard() {
    wx.showToast({ title: '请截图后打印', icon: 'none', duration: 2000 })
  }
})
