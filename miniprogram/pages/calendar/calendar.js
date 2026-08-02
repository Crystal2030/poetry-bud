Page({
  data: {
    year: 2026,
    month: 8,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarGrid: [],
    streakDays: 0,
    maxStreak: 0,
    monthCheckins: 0,
    freezeCards: 0,
    freezeSlots: [],
    sproutMessage: '每天读一首诗，芽芽陪着你～'
  },

  onShow() {
    this.loadCalendarData()
  },

  loadCalendarData() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = now.getDate()

    // 读取打卡记录（与 store.js 共享 pb_checkin 键，格式: { "YYYY-MM-DD": { poems:N, ts:N } }）
    let checkinDates = {}
    try {
      checkinDates = JSON.parse(wx.getStorageSync('pb_checkin') || '{}')
    } catch(e) {}

    // 读取冻结记录
    let freezeDates = {}
    try {
      freezeDates = wx.getStorageSync('pb_freeze_dates') || {}
    } catch(e) {}

    // 生成日历网格
    const firstDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const prevMonthDays = new Date(year, month - 1, 0).getDate()

    const grid = []
    let week = []

    // 上月填充
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      week.push(this.makeDay(year, month - 1, d, false, false, false))
    }

    // 本月
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday = d === today
      const isFuture = d > today
      const isCheckedIn = !!checkinDates[dateStr]
      const isFrozen = !!freezeDates[dateStr]

      week.push({
        day: d, dateStr,
        isToday, isFuture, isCheckedIn, isFrozen,
        inMonth: true,
        heatColor: isCheckedIn ? this.getHeatColor(checkinDates[dateStr]?.poems || 1) : ''
      })

      if (week.length === 7) {
        grid.push(week)
        week = []
      }
    }

    // 下月填充
    let nextD = 1
    while (week.length > 0 && week.length < 7) {
      week.push(this.makeDay(year, month + 1, nextD, false, false, true))
      nextD++
    }
    if (week.length > 0) grid.push(week)

    // 计算 streak
    const { streakDays, maxStreak } = this.calcStreak(checkinDates, freezeDates)

    // 本月打卡天数
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    let monthCheckins = 0
    Object.keys(checkinDates).forEach(k => {
      if (k.startsWith(monthKey)) monthCheckins++
    })

    // 冻结卡
    const { freezeCards, freezeSlots } = this.calcFreezeCards(freezeDates)

    // 芽芽问候
    const msgs = {
      0: '每天读一首诗，芽芽陪着你～',
      3: '已经连续3天啦，小种子在发芽',
      7: '一周啦！芽芽为你骄傲',
      14: '两周不间断，你是小诗人啦',
      30: '一个月！诗径花园繁花盛开',
      60: '两个月！芽芽已经被你感动了',
      100: '100天！你是诗芽传奇'
    }
    let sproutMessage = msgs[0]
    const msgKeys = Object.keys(msgs).map(Number).sort((a,b) => a-b)
    let bestMsg = msgs[0]
    for (const k of msgKeys) {
      if (streakDays >= k) bestMsg = msgs[k]
    }
    sproutMessage = bestMsg

    this.setData({ year, month, calendarGrid: grid, streakDays, maxStreak, monthCheckins, freezeCards, freezeSlots, sproutMessage })
  },

  makeDay(year, month, day, isToday, isCheckedIn, isFuture) {
    const m = month < 1 ? 12 : month > 12 ? 1 : month
    const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return { day, dateStr, isToday, isCheckedIn, isFuture, inMonth: false, heatColor: '' }
  },

  getHeatColor(count) {
    if (count >= 3) return '#C0553F'
    if (count >= 2) return '#D9A6A0'
    return '#EDE0C8'
  },

  calcStreak(checkinDates, freezeDates) {
    const now = new Date()
    let streakDays = 0
    let maxStreak = 0
    let currentStreak = 0

    // 从今天往回算
    for (let i = 0; i < 365; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (checkinDates[ds] || freezeDates[ds]) {
        currentStreak++
      } else if (i === 0) {
        // 今天还没打卡不算断
        continue
      } else {
        break
      }
    }
    streakDays = currentStreak

    // 全局最长
    const allDates = Object.keys(checkinDates).sort()
    let run = 0
    for (let i = 0; i < allDates.length; i++) {
      run++
      if (i < allDates.length - 1) {
        const curr = new Date(allDates[i])
        const next = new Date(allDates[i+1])
        const diff = (next - curr) / (1000*60*60*24)
        if (diff > 2) { // 允许跳过1天（可能是冻结）
          maxStreak = Math.max(maxStreak, run)
          run = 0
        }
      }
    }
    maxStreak = Math.max(maxStreak, run, streakDays)

    return { streakDays, maxStreak }
  },

  calcFreezeCards(freezeDates) {
    // 每周一自动发放 1 张
    const frozenStr = wx.getStorageSync('pb_freeze_count') || '0'
    let freezeCards = parseInt(frozenStr)

    // 检查是否需要发放（每周一）
    const lastIssueDate = wx.getStorageSync('pb_freeze_last_issue') || ''
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    monday.setHours(0,0,0,0)
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`

    if (lastIssueDate !== mondayStr) {
      freezeCards += 1
      wx.setStorageSync('pb_freeze_count', String(freezeCards))
      wx.setStorageSync('pb_freeze_last_issue', mondayStr)
    }

    // 展示槽位（已冻结的 + 可用的）
    const usedFreezes = Object.keys(freezeDates).length
    const freezeSlots = []
    for (let i = 0; i < Math.min(3, freezeCards + usedFreezes); i++) {
      freezeSlots.push({ available: i < freezeCards })
    }

    return { freezeCards, freezeSlots }
  },

  activateFreeze() {
    wx.showModal({
      title: '激活冻结卡',
      content: '激活后，今天不打卡也不会断连续记录哦。确定要激活吗？',
      success: (res) => {
        if (res.confirm) {
          const now = new Date()
          const ds = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

          let freezeDates = {}
          try { freezeDates = wx.getStorageSync('pb_freeze_dates') || {} } catch(e) {}
          freezeDates[ds] = true
          wx.setStorageSync('pb_freeze_dates', freezeDates)

          let count = parseInt(wx.getStorageSync('pb_freeze_count') || '0')
          count = Math.max(0, count - 1)
          wx.setStorageSync('pb_freeze_count', String(count))

          wx.showToast({ title: '已激活冻结卡', icon: 'none' })
          this.loadCalendarData()
        }
      }
    })
  },

  onDayTap(e) {
    const ds = e.currentTarget.dataset.date
    let checkinDates = {}
    try { checkinDates = JSON.parse(wx.getStorageSync('pb_checkin') || '{}') } catch(e) {}
    
    if (checkinDates[ds]) {
      wx.showToast({ title: '这天已经打卡啦', icon: 'none' })
    } else {
      wx.showToast({ title: '去读一首诗来打卡吧～', icon: 'none' })
    }
  },

  prevMonth() {
    let { year, month } = this.data
    month--
    if (month < 1) { month = 12; year-- }
    this.setData({ year, month }, () => this.loadCalendarData())
  },

  nextMonth() {
    let { year, month } = this.data
    month++
    if (month > 12) { month = 1; year++ }
    this.setData({ year, month }, () => this.loadCalendarData())
  }
})
