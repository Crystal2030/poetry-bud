// 花园成长阶段（对齐 UI 稿阶梯阈值 1/5/10/20/50/100）
const STAGES = [
  { key: 'seed',    name: '种子', threshold: 1 },
  { key: 'sprout',  name: '嫩芽', threshold: 5 },
  { key: 'sapling', name: '树苗', threshold: 10 },
  { key: 'bud',     name: '花蕾', threshold: 20 },
  { key: 'blossom', name: '开花', threshold: 50 },
  { key: 'garden',  name: '满园', threshold: 100 }
]
// 阶梯 6 阶：左侧位置与高度（rpx）
const STAIR_LEFT = [0, 90, 180, 270, 360, 450]
const STAIR_H = [36, 60, 84, 116, 156, 200]

// 6 枚成长徽章（本地静态资源）
const VIRTUE_BADGES = [
  { key: 'courage',  name: '勇气', desc: '种下第一颗种子，需要一点勇气', threshold: 1 },
  { key: 'persist',  name: '坚持', desc: '连续 5 天，每天来浇水',         threshold: 5 },
  { key: 'curious',  name: '好奇', desc: '你在诗里发现了新世界',           threshold: 10 },
  { key: 'patient',  name: '耐心', desc: '等一朵花慢慢开',                threshold: 20 },
  { key: 'abundant', name: '丰盈', desc: '心里装满了诗与远方',             threshold: 50 },
  { key: 'poetic',   name: '诗意', desc: '你本身就是一首诗',               threshold: 100 }
]

// 当前阶梯上方持续上升的金色粒子（UI 稿 .stairs-glow i · p-rise）
// 出生相对 .stairs-glow 容器高度 (236rpx) 的百分比，向上飘 --dy rpx
const PARTICLE_BASE = [
  { id: 0, left: '38%', top: '60%', dx:  -16, dy: -150, delay: 0    },
  { id: 1, left: '42%', top: '64%', dx:   12, dy: -180, delay: 0.35 },
  { id: 2, left: '40%', top: '56%', dx:  -28, dy: -160, delay: 0.7  },
  { id: 3, left: '44%', top: '62%', dx:   20, dy: -130, delay: 1.05 },
  { id: 4, left: '36%', top: '52%', dx:   -8, dy: -200, delay: 1.4  },
  { id: 5, left: '46%', top: '66%', dx:   28, dy: -150, delay: 1.75 },
  { id: 6, left: '40%', top: '50%', dx:    4, dy: -220, delay: 2.1  }
]

Page({
  data: {
    flowerCount: 0,
    streakDays: 0,
    stageAsset: '',
    progressPct: 0,
    remain: 0,
    nextStageName: '',
    isMax: false,
    stairs: [],
    glowLeft: 0,
    glowTop: 30,
    particles: [],
    energyDots: [],
    badges: [],
    latestBadge: null
  },

  onShow() {
    const g = getApp().globalData
    const rc = g.readCount || 0
    const streaks = wx.getStorageSync('pb_streak') || 0

    // 当前阶段
    let stageIdx = 0
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (rc >= STAGES[i].threshold) { stageIdx = i; break }
    }
    const cur = STAGES[stageIdx]
    const next = STAGES[stageIdx + 1] || null
    const isMax = !next

    // 阶段内进度（0~100）
    let progressPct = 100
    if (next) {
      const span = next.threshold - cur.threshold
      progressPct = Math.round(Math.max(0, Math.min(1, (rc - cur.threshold) / span)) * 100)
    }
    const remain = next ? Math.max(0, next.threshold - rc) : 0
    const nextStageName = next ? next.name : ''

    // 3D 阶梯
    const stairs = STAGES.map((s, i) => ({
      key: s.key,
      num: s.threshold,
      left: STAIR_LEFT[i],
      h: STAIR_H[i],
      on: i === stageIdx
    }))

    // 能量粒子（静态装饰）
    const energyDots = [
      { id: 0, top: 180, left: 60,  delay: 0 },
      { id: 1, top: 260, left: 640, delay: .5 },
      { id: 2, top: 340, left: 140, delay: 1 },
      { id: 3, top: 200, left: 500, delay: 1.5 },
      { id: 4, top: 440, left: 372, delay: .8 },
      { id: 5, top: 120, left: 372, delay: .4 }
    ]

    // 6 枚徽章
    const badges = VIRTUE_BADGES.map(b => ({
      key: b.key,
      name: b.name,
      desc: b.desc,
      icon: '/static/garden/badge-' + b.key + '.png',
      earned: rc >= b.threshold
    }))
    let latestBadge = null
    for (let i = badges.length - 1; i >= 0; i--) {
      if (badges[i].earned) { latestBadge = badges[i]; break }
    }

    this.setData({
      flowerCount: rc,
      streakDays: streaks,
      stageAsset: '/static/garden/stage-' + cur.key + '-clean.png',
      progressPct,
      remain,
      nextStageName,
      isMax,
      stairs,
      // 粒子带锚定到当前激活阶梯中央：.s3d 宽 74rpx，半宽 37；用 transform translateX(-50%) 居中
      glowLeft: STAIR_LEFT[stageIdx] + 37,
      glowTop: 0,
      particles: PARTICLE_BASE,
      energyDots,
      badges,
      latestBadge
    })
  }
})
