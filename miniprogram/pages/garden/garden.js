const U = require('../../utils/store.js')

Page({
  data: {
    skyPhase: 'morning',        // morning/noon/evening/night
    flowerCount: 0,
    streakDays: 0,
    treeStage: 'seed',          // seed/sprout/sapling/flowering/bloom
    treeStageName: '小种子',
    nextStageName: '小嫩芽',
    poemsToNextStage: 5,
    flowers: [],
    milestones: [],
    badges: []
  },

  onShow() {
    const g = getApp().globalData
    const rc = g.readCount || 0
    const fc = g.favorites ? g.favorites.length : 0
    const total = g.poems ? g.poems.length : 0

    // 时间感知天空
    const h = new Date().getHours()
    const skyPhase = h >= 6 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'noon' : h >= 17 && h < 20 ? 'evening' : 'night'

    // 生长树阶段（含渐进提示）
    const stages = [
      { key: 'seed', name: '小种子', min: 0,  next: '小嫩芽', need: 5 },
      { key: 'sprout', name: '小嫩芽', min: 5,  next: '小树苗', need: 5 },
      { key: 'sapling', name: '小树苗', min: 10, next: '开花啦', need: 10 },
      { key: 'flowering', name: '开花啦', min: 20, next: '繁花树', need: 30 },
      { key: 'bloom', name: '繁花树', min: 50, next: null, need: 0 }
    ]
    const stage = stages.reduce((prev, cur) => rc >= cur.min ? cur : prev, stages[0])
    const poemsToNextStage = stage.next ? stage.min + stage.need - rc : 0
    const nextStageName = stage.next || '已是最高阶段'

    // 纸花网格（每读一首就"开一朵"，最多显示读过的诗对应的花）
    const flowerNames = [
      '梅花','桃花','荷花','菊花','桂花','牡丹','兰花','芍药','杜鹃','茉莉',
      '海棠','山茶','月季','水仙','丁香','玫瑰','百合','杏花','梨花','樱花'
    ]
    const flowers = []
    for (let i = 0; i < Math.min(20, total); i++) {
      flowers.push({ name: flowerNames[i], earned: i < rc })
    }

    // v4 时间线成长节点（6 个，CDN 卡通萌系插画，节点「从小到大」看出成长）
    const THRESHOLDS = [1, 5, 10, 20, 50, 100]
    let currentThreshold = null
    for (const t of THRESHOLDS) {
      if (rc < t) { currentThreshold = t; break }
    }
    const milestones = [
      { asset: 'timeline-seed',         text: '种下种子',   threshold: 1 },
      { asset: 'timeline-sprout',       text: '嫩芽破土',   threshold: 5 },
      { asset: 'timeline-sapling',      text: '树苗长成',   threshold: 10 },
      { asset: 'timeline-first-flower', text: '第一朵花开', threshold: 20 },
      { asset: 'timeline-blossom',      text: '繁花满树',   threshold: 50 },
      { asset: 'timeline-garden',       text: '诗径成花园', threshold: 100 }
    ].map(m => ({
      id: String(m.threshold),
      icon: U.getGardenAsset(m.asset),
      text: m.text,
      date: '读 ' + m.threshold + ' 首',
      achieved: rc >= m.threshold,
      current: m.threshold === currentThreshold
    }))

    // v4 品质成长徽章（6 枚，每枚对应一个成长品质 + 寄语）
    const VIRTUE_BADGES = [
      { name: '勇气', desc: '种下第一颗种子，需要一点勇气', threshold: 1,   asset: 'badge-courage' },
      { name: '坚持', desc: '连续 5 天，每天来浇水',         threshold: 5,   asset: 'badge-persist' },
      { name: '好奇', desc: '你在诗里发现了新世界',           threshold: 10,  asset: 'badge-curious' },
      { name: '耐心', desc: '等一朵花慢慢开',                threshold: 20,  asset: 'badge-patient' },
      { name: '丰盈', desc: '心里装满了诗与远方',             threshold: 50,  asset: 'badge-abundant' },
      { name: '诗意', desc: '你本身就是一首诗',               threshold: 100, asset: 'badge-poetic' }
    ]
    const badges = VIRTUE_BADGES.map(b => ({
      name: b.name,
      desc: b.desc,
      icon: U.getGardenAsset(b.asset),
      earned: rc >= b.threshold
    }))
    // 「最新解锁」= 已解锁中阶段最高的那枚
    let highestEarnedIdx = -1
    for (let i = 0; i < badges.length; i++) {
      if (badges[i].earned) highestEarnedIdx = i
    }
    for (let i = 0; i < badges.length; i++) {
      badges[i].isLatest = (i === highestEarnedIdx)
    }
    const latestBadge = highestEarnedIdx >= 0 ? badges[highestEarnedIdx] : null
    const streaks = wx.getStorageSync('pb_streak') || 0

    this.setData({
      skyPhase, flowerCount: rc, streakDays: streaks,
      treeStage: stage.key, treeStageName: stage.name,
      nextStageName, poemsToNextStage,
      flowers, milestones, badges, latestBadge
    })
  }
})
