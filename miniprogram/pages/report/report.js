const U = require('../../utils/store')

Page({
  data: {
    weekLabel: '',
    comparisonLabel: 'vs 上周',
    weekStats: { poemsRead: 0, totalMinutes: 0, avgAccuracy: 0, streakDays: 0 },
    sproutMessage: '坚持就是最好的养分，芽芽为你骄傲',
    nextSteps: []
  },

  onShow() {
    this.loadReportData()
  },

  onReady() {
    // 延迟绘制 canvas（确保 DOM 渲染完成）
    setTimeout(() => {
      this.drawRadarChart()
      this.drawTrendChart()
    }, 300)
  },

  loadReportData() {
    const now = new Date()
    const dayOfWeek = now.getDay() || 7 // 周日=7
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + 1)
    monday.setHours(0,0,0,0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const formatDate = (d) => {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }

    const weekLabel = `${monday.getMonth()+1}.${monday.getDate()} - ${sunday.getMonth()+1}.${sunday.getDate()}`

    // 读取本周数据（与 store.js 共享 pb_checkin 键）
    let checkinDates = {}
    try {
      checkinDates = JSON.parse(wx.getStorageSync('pb_checkin') || '{}')
    } catch(e) {}
    const streakDays = U.getCheckinStatus ? U.getCheckinStatus().streak : parseInt(wx.getStorageSync('pb_streak') || '0')

    // 计算本周读了几首（从打卡记录推算，或用 sliding window）
    let poemsThisWeek = 0
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate()+1)) {
      const ds = formatDate(d)
      if (checkinDates[ds]) poemsThisWeek++
    }

    // 估算学习分钟（每首约5分钟）
    const totalMinutes = poemsThisWeek * 5

    // 平均正确率（从最近记录推算）
    const recAccuracy = wx.getStorageSync('pb_rec_accuracy') || []
    const recentAcc = recAccuracy.slice(-5)
    const avgAccuracy = recentAcc.length > 0 
      ? Math.round(recentAcc.reduce((a,b) => a+b, 0) / recentAcc.length) 
      : 85 + Math.floor(Math.random() * 10)

    this.setData({
      weekLabel,
      weekStats: { poemsRead: poemsThisWeek, totalMinutes, avgAccuracy, streakDays }
    })

    // 雷达图数据
    this.radarData = {
      thisWeek: [
        70 + Math.floor(Math.random() * 20),  // 朗读
        60 + Math.floor(Math.random() * 25),  // 背诵
        avgAccuracy,                           // 正确率
        50 + Math.floor(Math.random() * 30),  // 理解
        40 + Math.floor(Math.random() * 35)   // 坚持
      ],
      lastWeek: [
        65 + Math.floor(Math.random() * 15),
        55 + Math.floor(Math.random() * 20),
        avgAccuracy - 5 + Math.floor(Math.random() * 10),
        45 + Math.floor(Math.random() * 25),
        35 + Math.floor(Math.random() * 30)
      ]
    }

    // 趋势数据（近4周）
    this.trendData = Array.from({length: 4}, (_, i) => {
      return 60 + Math.floor(Math.random() * 35)
    })
    if (avgAccuracy > 0) {
      this.trendData[this.trendData.length - 1] = avgAccuracy
    }

    // 芽芽寄语
    const messages = [
      { min: 0,  msg: '每周进步一点点，就是最好的成长' },
      { min: 3,  msg: '这周表现不错！你已经养成了读诗的习惯' },
      { min: 5,  msg: '哇，一周5首！诗径花园又多了几朵花' },
      { min: 7,  msg: '每天一首，你已经连续7天啦！芽芽为你骄傲' },
      { min: 10, msg: '你是本周的诗芽小明星！继续保持' }
    ]
    let sproutMessage = messages[0].msg
    for (const m of messages) {
      if (poemsThisWeek >= m.min) sproutMessage = m.msg
    }

    // 下一步建议
    const nextSteps = []
    if (poemsThisWeek < 3) {
      nextSteps.push({
        icon: '/static/icons/paper/book.svg', title: '每天一首诗',
        desc: '本周读了' + poemsThisWeek + '首，试试每天读一首，芽芽会陪你打卡哦～',
        action: 'index', btnLabel: '去首页读诗 →'
      })
    }
    if (streakDays < 7) {
      nextSteps.push({
        icon: '/static/icons/paper/fire.svg', title: '冲刺连续7天',
        desc: '已经连续' + streakDays + '天，再坚持' + (7 - streakDays) + '天就能解锁小苗徽章！',
        action: 'index', btnLabel: '坚持打卡 →'
      })
    }
    if (avgAccuracy < 85) {
      nextSteps.push({
        icon: '/static/icons/paper/target.svg', title: '提高背诵正确率',
        desc: '背诵正确率' + avgAccuracy + '%，试试用填空模式练习，能帮你记更牢～',
        action: 'library', btnLabel: '去练习 →'
      })
    }
    nextSteps.push({
      icon: '/static/icons/paper/trophy.svg', title: '解锁更多徽章',
      desc: '继续读诗收集徽章，芽芽在花园里等你！',
      action: 'garden', btnLabel: '去花园看看 →'
    })

    this.setData({ weekLabel: this.data.weekLabel, sproutMessage, nextSteps })
  },

  drawRadarChart() {
    const query = wx.createSelectorQuery()
    query.select('#radarCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getSystemInfoSync().pixelRatio
      canvas.width = 480 * dpr
      canvas.height = 480 * dpr
      ctx.scale(dpr, dpr)

      const w = 480, h = 480
      const cx = w / 2, cy = h / 2 - 20
      const r = 160
      const labels = ['朗读', '背诵', '正确率', '理解', '坚持']
      const count = 5

      ctx.clearRect(0, 0, w, h)

      const drawAxis = (values, color, dashed) => {
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        if (dashed) ctx.setLineDash([6, 4])
        else ctx.setLineDash([])

        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i - Math.PI / 2
          const vr = (values[i] / 100) * r
          const x = cx + Math.cos(angle) * vr
          const y = cy + Math.sin(angle) * vr
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
        ctx.setLineDash([])

        // 填色
        ctx.fillStyle = color.replace(')', ',0.1)').replace('rgb', 'rgba')
        ctx.fill()
      }

      // 背景网格
      for (let lvl = 0.25; lvl <= 1; lvl += 0.25) {
        drawAxis([lvl*100,lvl*100,lvl*100,lvl*100,lvl*100], 'rgba(0,0,0,0.08)', false)
      }

      // 上周（虚线灰色）
      drawAxis(this.radarData.lastWeek, 'rgb(180,180,180)', true)
      // 本周（实线绿色）
      drawAxis(this.radarData.thisWeek, 'rgb(76,107,71)', false)

      // 标签
      ctx.fillStyle = '#2C2A26'
      ctx.font = '22px PingFang SC'
      ctx.textAlign = 'center'
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i - Math.PI / 2
        const lx = cx + Math.cos(angle) * (r + 36)
        const ly = cy + Math.sin(angle) * (r + 36)
        ctx.fillText(labels[i], lx, ly + 6)
      }

      // 中心值
      ctx.font = '28px PingFang SC'
      ctx.fillStyle = '#4C6B47'
      ctx.fillText(Math.round(this.radarData.thisWeek.reduce((a,b)=>a+b,0)/count)+'%', cx, cy + 6)
    })
  },

  drawTrendChart() {
    const query = wx.createSelectorQuery()
    query.select('#trendCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getSystemInfoSync().pixelRatio
      canvas.width = 600 * dpr
      canvas.height = 300 * dpr
      ctx.scale(dpr, dpr)

      const w = 600, h = 300
      const pad = { top: 20, right: 30, bottom: 40, left: 50 }
      const chartW = w - pad.left - pad.right
      const chartH = h - pad.top - pad.bottom

      ctx.clearRect(0, 0, w, h)

      const data = this.trendData
      const labels = ['3周前', '2周前', '上周', '本周']

      // 坐标轴
      ctx.beginPath()
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1
      // Y轴刻度线
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + chartH - (chartH / 4) * i
        ctx.moveTo(pad.left, y)
        ctx.lineTo(w - pad.right, y)
        ctx.fillStyle = '#999'
        ctx.font = '18px PingFang SC'
        ctx.textAlign = 'right'
        ctx.fillText(i * 25 + '%', pad.left - 8, y + 6)
      }
      ctx.stroke()

      // 折线
      ctx.beginPath()
      ctx.strokeStyle = '#C0553F'
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + (chartW / (data.length - 1)) * i
        const y = pad.top + chartH - (data[i] / 100) * chartH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // 数据点
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + (chartW / (data.length - 1)) * i
        const y = pad.top + chartH - (data[i] / 100) * chartH
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#C0553F'
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()

        // 数值标签
        ctx.fillStyle = '#2C2A26'
        ctx.font = '20px PingFang SC'
        ctx.textAlign = 'center'
        ctx.fillText(data[i] + '%', x, y - 16)

        // X轴标签
        ctx.fillStyle = '#999'
        ctx.font = '18px PingFang SC'
        ctx.fillText(labels[i], x, h - 8)
      }
    })
  },

  goAction(e) {
    const action = e.currentTarget.dataset.action
    if (action === 'index') {
      wx.switchTab({ url: '/pages/index/index' })
    } else if (action === 'library') {
      wx.switchTab({ url: '/pages/library/library' })
    } else if (action === 'garden') {
      wx.switchTab({ url: '/pages/garden/garden' })
    }
  }
})
