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

    // 里程碑时间线（基于已读数）
    const streaks = wx.getStorageSync('pb_streak') || 0
    const dateRecords = wx.getStorageSync('pb_read_dates') || []
    const milestones = [
      { id: 'start', icon: '/static/icons/paper/sprout-small.svg', date: dateRecords[0] || '今天', text: '种下第一颗种子', achieved: rc >= 1 },
      { id: '5',    icon: '/static/icons/paper/sprout-large.svg', date: '已读 5 首', text: '小嫩芽破土', achieved: rc >= 5 },
      { id: '10',   icon: '/static/icons/paper/tree.svg', date: '已读 10 首', text: '小树苗长成', achieved: rc >= 10 },
      { id: '20',   icon: '/static/icons/paper/flower.svg', date: '已读 20 首', text: '第一朵花开', achieved: rc >= 20 },
      { id: '50',   icon: '/static/icons/paper/bouquet.svg', date: '已读 50 首', text: '繁花满树', achieved: rc >= 50 },
      { id: '100',  icon: '/static/icons/paper/trophy.svg', date: '已读 100 首', text: '诗径成花园', achieved: rc >= 100 }
    ]

    // 徽章保留但改用 emoji 替代 icon-svg（避免缺失图标）
    const badges = [
      { name: '初芽', emoji: '/static/icons/paper/sprout-small.svg', desc: '读了第1首诗', earned: rc >= 1 },
      { name: '小苗', emoji: '/static/icons/paper/sprout-large.svg', desc: '读了5首诗', earned: rc >= 5 },
      { name: '花开', emoji: '/static/icons/paper/flower.svg', desc: '读了10首诗', earned: rc >= 10 },
      { name: '结果', emoji: '/static/icons/paper/fruit.svg', desc: '读了20首诗', earned: rc >= 20 },
      { name: '小树', emoji: '/static/icons/paper/tree.svg', desc: '读了50首诗', earned: rc >= 50 },
      { name: '诗仙', emoji: '/static/icons/paper/trophy.svg', desc: '读了100首诗', earned: rc >= 100 }
    ]

    this.setData({
      skyPhase, flowerCount: rc, streakDays: streaks,
      treeStage: stage.key, treeStageName: stage.name,
      nextStageName, poemsToNextStage,
      flowers, milestones, badges
    })
  }
})
