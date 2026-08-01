Page({
  data: {
    readCount: 0,
    favCount: 0,
    total: 0,
    progress: 0,
    level: '初芽',
    badges: []
  },

  onShow() {
    const g = getApp().globalData
    const rc = g.readCount
    const fc = g.favorites.length
    const total = g.poems.length
    const progress = total ? Math.min(100, Math.round(rc / total * 100)) : 0
    const level = rc >= 100 ? '诗仙' : rc >= 50 ? '小树' : rc >= 20 ? '结果' : rc >= 10 ? '花开' : rc >= 5 ? '小苗' : '初芽'
    const badges = [
      { name: '初芽', icon: '🌱', desc: '读了第1首诗', earned: rc >= 1 },
      { name: '小苗', icon: '🪴', desc: '读了5首诗', earned: rc >= 5 },
      { name: '花开', icon: '🌸', desc: '读了10首诗', earned: rc >= 10 },
      { name: '结果', icon: '🍎', desc: '读了20首诗', earned: rc >= 20 },
      { name: '小树', icon: '🌳', desc: '读了50首诗', earned: rc >= 50 },
      { name: '诗仙', icon: '🏆', desc: '读了100首诗', earned: rc >= 100 }
    ]
    this.setData({ readCount: rc, favCount: fc, total, progress, level, badges })
  }
})
