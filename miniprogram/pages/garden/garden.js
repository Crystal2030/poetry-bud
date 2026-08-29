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
    badges: [],
    latestBadge: null,

    // v5 阶梯花园（独立于成长树 5 阶段，对齐时间线 6 张插画）
    gardenStage: 'seed',
    gardenStageName: '刚刚发芽',
    gardenStageAsset: '',
    gardenStageIdx: 0,
    gardenStages: [],
    poemsToNextStageNum: 4,
    nextGardenStageName: '嫩芽初长',

    // v5 天空增强
    moonPhase: 0,               // 0..7 (新月/蛾眉/上弦/盈凸/满/亏凸/下弦/残月)
    moonPhaseName: '新月',
    seasonName: 'spring',       // spring/summer/autumn/winter
    seasonLabel: '春'
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

    // ═════════════════════════════════════════════════════════════
    // v5 阶梯花园（6 段，直观看出成长进度；当前阶段高亮）
    // ═════════════════════════════════════════════════════════════
    const GARDEN_STAGES = [
      { key: 'seed',         name: '刚刚发芽',   min: 1,   next: 5 },
      { key: 'sprout',       name: '嫩芽初长',   min: 5,   next: 10 },
      { key: 'sapling',      name: '小苗已成',   min: 10,  next: 20 },
      { key: 'first-flower', name: '第一朵花开', min: 20,  next: 50 },
      { key: 'blossom',      name: '繁花满树',   min: 50,  next: 100 },
      { key: 'garden',       name: '满园诗径',   min: 100, next: null }
    ]
    let gardenStageIdx = 0
    for (let i = GARDEN_STAGES.length - 1; i >= 0; i--) {
      if (rc >= GARDEN_STAGES[i].min) { gardenStageIdx = i; break }
    }
    const gs = GARDEN_STAGES[gardenStageIdx]
    const poemsToNextStageNum = gs.next ? Math.max(0, gs.next - rc) : 0
    const nextGardenStageName = gs.next ? GARDEN_STAGES[gardenStageIdx + 1].name : '已是满园诗径'
    const gardenStageAsset = U.getGardenAsset('timeline-' + gs.key)
    const gardenStages = GARDEN_STAGES.map(s => ({
      key: s.key, name: s.name, threshold: s.min
    }))

    // ═════════════════════════════════════════════════════════════
    // v5 天空增强：月相（粗略按当月日计算，约 29.5 天一月相周期）
    //              + 季节（春 3-5 / 夏 6-8 / 秋 9-11 / 冬 12-2）
    // ═════════════════════════════════════════════════════════════
    const _now = new Date()
    const _dom = _now.getDate()
    const moonPhase = Math.floor((_dom / 30) * 8) % 8
    const MOON_NAMES = ['新月','蛾眉月','上弦月','盈凸月','满月','亏凸月','下弦月','残月']
    const moonPhaseName = MOON_NAMES[moonPhase]
    const _m = _now.getMonth() + 1
    const seasonName = (_m >= 3 && _m <= 5) ? 'spring'
                     : (_m >= 6 && _m <= 8) ? 'summer'
                     : (_m >= 9 && _m <= 11) ? 'autumn' : 'winter'
    const seasonLabel = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }[seasonName]

    this.setData({
      skyPhase, flowerCount: rc, streakDays: streaks,
      treeStage: stage.key, treeStageName: stage.name,
      nextStageName, poemsToNextStage,
      flowers, milestones, badges, latestBadge,
      gardenStage: gs.key,
      gardenStageName: gs.name,
      gardenStageAsset,
      gardenStageIdx,
      gardenStages,
      poemsToNextStageNum,
      nextGardenStageName,
      moonPhase,
      moonPhaseName,
      seasonName,
      seasonLabel
    })
  }
})
