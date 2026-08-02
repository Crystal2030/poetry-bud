const U = require('../../utils/store')

Page({
  data: {
    readCount: 0,
    favCount: 0,
    reviewCount: 0,
    streak: 0,
    calendar: { year: 2026, month: 1, days: [] },
    weekStats: { totalPoems: 0, estMinutes: 0 }
  },

  onShow() {
    const g = getApp().globalData
    const checkin = U.getCheckinStatus()
    const reviewList = U.getReviewList()

    this.setData({
      readCount: g.readCount,
      favCount: g.favorites.length,
      reviewCount: reviewList.length,
      streak: checkin.streak,
      calendar: this._buildCalendar(checkin.dates),
      weekStats: this._buildWeekStats(checkin.dates)
    })
  },

  // ── 构建月历 ──
  _buildCalendar(checkinDates) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = now.getDate()

    const firstDay = new Date(year, month - 1, 1).getDay()  // 0=周日
    const daysInMonth = new Date(year, month, 0).getDate()

    const days = []
    // 填充前置空白
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: '', idx: 'pre-' + i, checked: false, future: false, isToday: false })
    }
    // 填充日期
    const checkinSet = new Set(checkinDates)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0')
      days.push({
        day: d,
        idx: 'd-' + d,
        checked: checkinSet.has(dateStr),
        future: d > today,
        isToday: d === today
      })
    }
    return { year, month, days }
  },

  // ── 构建本周统计 ──
  _buildWeekStats(checkinDates) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    let weekDates = 0
    checkinDates.forEach(d => {
      const cd = new Date(d)
      if (cd >= monday && cd <= now) weekDates++
    })

    return {
      totalPoems: weekDates * 2,  // 估算：每天约读2首
      estMinutes: weekDates * 8   // 估算：每天约8分钟
    }
  },

  // 跳转到待复习
  goReview() {
    if (this.data.reviewCount === 0) {
      wx.showToast({ title: '暂无待复习的诗～', icon: 'none' })
      return
    }
    const reviewList = U.getReviewList()
    if (reviewList.length > 0) {
      wx.navigateTo({ url: '/pages/detail/detail?id=' + reviewList[0] })
    }
  },

  resetData() {
    wx.showModal({
      title: '确认',
      content: '确定要清除所有学习记录吗？不可恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('pb_read')
          wx.removeStorageSync('pb_read_set')
          wx.removeStorageSync('pb_fav')
          wx.removeStorageSync('pb_review_schedule')
          wx.removeStorageSync('pb_checkin')
          wx.removeStorageSync('pb_recite')
          wx.removeStorageSync('pb_mistakes')
          const g = getApp().globalData
          g.readCount = 0
          g.readSet = null
          g.favorites = []
          g.reviewSchedule = null
          g.checkinData = null
          g.reciteData = null
          this.setData({
            readCount: 0, favCount: 0, reviewCount: 0,
            streak: 0, weekStats: { totalPoems: 0, estMinutes: 0 }
          })
          wx.showToast({ title: '已清除', icon: 'none' })
        }
      }
    })
  }
})
