// 诗芽 - 工具方法
const app = getApp()

// 常量
const THEMES = ['全部', '思乡', '咏物', '山水', '童趣', '送别', '边塞', '哲理', '田园', '写景', '爱国', '亲情', '友情', '读书', '节日', '羁旅']
const DYNASTIES = ['全部', '先秦', '汉', '南北朝', '唐', '宋', '元', '明', '清', '现代']
const GRADES = ['全部', '一年级上', '一年级下', '二年级上', '二年级下', '三年级上', '三年级下', '四年级上', '四年级下', '五年级上', '五年级下', '六年级上', '六年级下']

// 间隔复习阶段（艾宾浩斯儿童简化版）：1d → 2d → 4d → 7d → 15d → 30d → 已掌握
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30]

// ===== CDN 资源路径 =====

function getPoemBg(poem) {
  if (!poem) return ''
  const g = app.globalData
  const tid = g.themeMap[poem.id]
  const base = g.CDN.images
  if (tid) return base + 'themes/' + tid + '.png'
  const sc = poem.sceneId || 'generic'
  return base + 'scene-' + sc + '.png'
}

function getAudioUrl(poem) {
  if (!poem) return ''
  return app.globalData.CDN.audio + poem.id + '.mp3'
}

// 从 paragraphs 提取句子（与 poem-vertical 组件 computeLines 一致的分句逻辑）
function _paragraphsToSentences(paragraphs) {
  if (!paragraphs || !paragraphs.length) return []
  const PUNCT = '，。？！；、：,!?;:\n\r '
  const isPunct = ch => PUNCT.indexOf(ch) !== -1
  const sentences = []
  paragraphs.forEach(para => {
    let buffer = ''
    for (let i = 0; i < para.length; i++) {
      const ch = para[i]
      if (isPunct(ch)) {
        if (buffer.length > 0) {
          sentences.push({ text: buffer })
          buffer = ''
        }
      } else {
        buffer += ch
      }
    }
    if (buffer.length > 0) {
      sentences.push({ text: buffer })
    }
  })
  return sentences
}

// 统一获取诗歌句子：优先 poem.sentences，否则从 poem.paragraphs 分句
function getPoemSentences(poem) {
  if (!poem) return []
  if (poem.sentences && poem.sentences.length) return poem.sentences
  if (poem.paragraphs && poem.paragraphs.length) return _paragraphsToSentences(poem.paragraphs)
  return []
}

function getSentenceTimings(poem, overrideDuration) {
  if (!poem) return []
  const sentences = getPoemSentences(poem)
  if (!sentences.length) return []
  const totalChars = sentences.reduce((s, sent) => s + (sent.text || '').length, 0)
  if (!totalChars) return []
  const dur = overrideDuration || getAudioDuration(poem) || 5000
  const READ_RATIO = 0.83
  const PAUSE_RATIO = 0.17
  const readTime = dur * READ_RATIO
  const pausePool = dur * PAUSE_RATIO
  const STRONG_PAUSE = { '。': 1, '！': 1, '？': 1, '!': 1, '?': 1, '\n': 1 }
  const pauseWeights = sentences.map(s => {
    const text = s.text || ''
    if (!text) return 0
    const lastChar = text[text.length - 1]
    return STRONG_PAUSE[lastChar] ? 2 : 1
  })
  const totalPauseWeight = pauseWeights.reduce((s, w) => s + w, 0)
  let elapsed = 0
  return sentences.map((sent, i) => {
    const text = sent.text || ''
    const charWeight = text.length / totalChars
    const sentenceReadTime = readTime * charWeight
    const isLast = i === sentences.length - 1
    const pauseMs = isLast ? 0 : (pausePool * pauseWeights[i] / totalPauseWeight)
    const seg = { text: text, start: elapsed, duration: sentenceReadTime + pauseMs }
    elapsed += seg.duration
    return seg
  })
}

function getAudioDuration(poem) {
  if (!poem) return 0
  return app.globalData.durationMap[poem.id] || 0
}

// BGM 列表（保留供后续独立音频轨恢复使用）
const BGM_LIST = ['guqin_01', 'xiao_01', 'dizi_01', 'guzheng_01', 'pipa_01']

function _hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function getBgmUrl(poem) {
  if (!poem) return ''
  const idx = _hashStr(poem.id) % BGM_LIST.length
  return app.globalData.CDN.audio + 'bgm/' + BGM_LIST[idx] + '.mp3'
}

// ===== F-002：分龄每日推荐 =====
function getDailyPoem(ageBand) {
  const poems = app.globalData.poems
  if (!poems.length) return null
  const band = ageBand || wx.getStorageSync('pb_age_band') || '5-8'
  // 筛选匹配年龄段的诗
  const filtered = poems.filter(p => {
    if (!p.ageBand || typeof p.ageBand !== 'string') return true
    return p.ageBand.split(',').some(a => a.trim() === band)
  })
  const pool = filtered.length ? filtered : poems
  const d = new Date()
  return pool[(d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % pool.length]
}

function getPoemsByFilter(dim, val, ageBand) {
  let f = [...app.globalData.poems]
  // 按年龄段筛选
  if (ageBand) {
    f = f.filter(p => {
      if (!p.ageBand || typeof p.ageBand !== 'string') return true
      return p.ageBand.split(',').some(a => a.trim() === ageBand)
    })
  }
  if (val === '全部') return f
  if (dim === 'theme') {
    const m = {
      思乡: ['思乡', '羁旅'], 咏物: ['咏物'], 山水: ['山水', '写景'],
      童趣: ['童趣', '田园'], 送别: ['送别'], 边塞: ['边塞'],
      哲理: ['哲理'], 田园: ['田园'], 写景: ['写景'], 爱国: ['爱国'],
      亲情: ['亲情'], 友情: ['友情'], 读书: ['读书'], 节日: ['节日'], 羁旅: ['羁旅']
    }
    const k = m[val] || [val]
    return f.filter(p => k.some(kw => (p.theme || '').includes(kw) || (p.kebiaoRef || '').includes(kw)))
  }
  if (dim === 'dynasty') return f.filter(p => (p.dynasty || '') === val)
  if (dim === 'author') return f.filter(p => (p.author || '') === val)
  if (dim === 'grade') return f.filter(p => (p.grade || '').includes(val.replace('★', '').trim()))
  return f
}

// ===== 已读诗集合 =====
function _getReadSet() {
  if (!app.globalData.readSet) {
    let stored = []
    try { stored = JSON.parse(wx.getStorageSync('pb_read_set') || '[]') } catch (e) { stored = [] }
    app.globalData.readSet = new Set(stored)
    if (app.globalData.readCount !== stored.length) {
      app.globalData.readCount = stored.length
      wx.setStorageSync('pb_read', stored.length.toString())
    }
  }
  return app.globalData.readSet
}

// ===== F-009：间隔复习系统 =====

// 复习日程持久化 key
const REVIEW_KEY = 'pb_review_schedule'

function _getReviewSchedule() {
  if (!app.globalData.reviewSchedule) {
    try {
      app.globalData.reviewSchedule = JSON.parse(wx.getStorageSync(REVIEW_KEY) || '{}')
    } catch (e) {
      app.globalData.reviewSchedule = {}
    }
  }
  return app.globalData.reviewSchedule
}

function _saveReviewSchedule() {
  try {
    wx.setStorageSync(REVIEW_KEY, JSON.stringify(app.globalData.reviewSchedule || {}))
  } catch (e) {
    console.warn('[review] 存储失败:', e)
  }
}

// 标记已读（增强版：记录时间戳 + 生成复习日程）
function markRead(poemId) {
  if (!poemId) return
  const set = _getReadSet()
  set.add(poemId)
  app.globalData.readCount = set.size
  try {
    wx.setStorageSync('pb_read', set.size.toString())
    wx.setStorageSync('pb_read_set', JSON.stringify([...set]))
  } catch (e) {
    console.warn('[markRead] 存储失败:', e)
  }

  // ── 间隔复习 ──
  const now = Date.now()
  const schedule = _getReviewSchedule()

  if (!schedule[poemId]) {
    // 首次阅读：设置 stage=0，明天第一次复习
    schedule[poemId] = {
      firstRead: now,
      lastReview: now,
      stage: 0,
      nextReview: _getNextMidnight(now, 1)  // 明天凌晨
    }
    _saveReviewSchedule()
  } else {
    // 已是复习诗：更新复习时间（在详情页阅读也算复习）
    const entry = schedule[poemId]
    entry.lastReview = now
    _saveReviewSchedule()
  }
}

// 完成一次复习（进入详情页阅读或跟读后调用）
function completeReview(poemId) {
  if (!poemId) return
  const schedule = _getReviewSchedule()
  const entry = schedule[poemId]
  if (!entry) return

  const now = Date.now()
  entry.lastReview = now

  // 推进到下一阶段
  if (entry.stage < REVIEW_INTERVALS.length - 1) {
    entry.stage++
    entry.nextReview = _getNextMidnight(now, REVIEW_INTERVALS[entry.stage])
  } else {
    // 已达最后一阶段：标记为已掌握
    entry.nextReview = 0
    entry.mastered = true
  }
  _saveReviewSchedule()
}

// 获取今日待复习列表
function getReviewList() {
  const schedule = _getReviewSchedule()
  const now = Date.now()
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const endTs = todayEnd.getTime()

  const reviewIds = []
  for (const [poemId, entry] of Object.entries(schedule)) {
    if (entry.mastered) continue  // 已掌握的跳过
    if (entry.nextReview && entry.nextReview <= endTs) {
      reviewIds.push(poemId)
    }
  }
  // 按 nextReview 排序（越早的越先复习）
  reviewIds.sort((a, b) => (schedule[a].nextReview || 0) - (schedule[b].nextReview || 0))
  return reviewIds
}

// 辅助：获取第 N 天后的凌晨时间戳
function _getNextMidnight(from, days) {
  const d = new Date(from + days * 24 * 60 * 60 * 1000)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ===== F-005：每日打卡 =====

const CHECKIN_KEY = 'pb_checkin'

function _getCheckinData() {
  if (!app.globalData.checkinData) {
    try {
      app.globalData.checkinData = JSON.parse(wx.getStorageSync(CHECKIN_KEY) || '{}')
    } catch (e) {
      app.globalData.checkinData = {}
    }
  }
  return app.globalData.checkinData
}

function _saveCheckinData() {
  try {
    wx.setStorageSync(CHECKIN_KEY, JSON.stringify(app.globalData.checkinData || {}))
  } catch (e) {
    console.warn('[checkin] 存储失败:', e)
  }
}

// 获取今日日期字符串 YYYY-MM-DD
function _todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// 获取打卡状态
function getCheckinStatus() {
  const data = _getCheckinData()
  const today = _todayStr()
  const dates = Object.keys(data).sort()
  const checkedIn = !!data[today]

  // 计算连续打卡天数（从今天往回数）
  let streak = 0
  for (let i = dates.length - 1; i >= 0; i--) {
    const expectedDate = _addDays(today, -streak)
    if (dates[i] === expectedDate || (i === dates.length - 1 && dates[i] === today)) {
      streak++
    } else {
      break
    }
  }
  return { checkedIn, streak, dates }
}

// 执行打卡
function doCheckin() {
  const data = _getCheckinData()
  const today = _todayStr()
  if (data[today]) return { streak: getCheckinStatus().streak, alreadyChecked: true }

  data[today] = { poems: app.globalData.readCount, ts: Date.now() }
  _saveCheckinData()
  return getCheckinStatus()
}

// 辅助：日期加减
function _addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// ===== 收藏 =====

function toggleFav(id) {
  const favs = app.globalData.favorites
  const idx = favs.indexOf(id)
  if (idx > -1) favs.splice(idx, 1)
  else favs.push(id)
  wx.setStorageSync('pb_fav', JSON.stringify(favs))
  return idx === -1
}

function isFav(id) {
  return app.globalData.favorites.indexOf(id) > -1
}

function showToast(msg) {
  wx.showToast({ title: msg, icon: 'none', duration: 1800 })
}

function getSceneMode(sceneId) {
  const bright = ['field', 'grass', 'pond', 'snow']
  return bright.includes(sceneId) ? 'dark' : 'light'
}

// ===== F-004：背诵挑战 + 徽章系统 =====

const RECITE_KEY = 'pb_recite'
const RECITE_BADGES = [
  { name: '诗童', icon: '🌱', min: 0, desc: '开始背诵之旅' },
  { name: '诗生', icon: '🌿', min: 3, desc: '背诵3首古诗' },
  { name: '诗秀', icon: '🎋', min: 10, desc: '背诵10首古诗' },
  { name: '诗杰', icon: '🏅', min: 20, desc: '背诵20首古诗' },
  { name: '诗魁', icon: '👑', min: 50, desc: '背诵50首古诗' },
  { name: '诗仙', icon: '🌟', min: 100, desc: '背诵100首古诗！' }
]

function _getReciteData() {
  if (!app.globalData.reciteData) {
    try {
      app.globalData.reciteData = JSON.parse(wx.getStorageSync(RECITE_KEY) || '{"poems":[],"total":0}')
    } catch (e) {
      app.globalData.reciteData = { poems: [], total: 0 }
    }
  }
  return app.globalData.reciteData
}

function _saveReciteData() {
  try {
    wx.setStorageSync(RECITE_KEY, JSON.stringify(app.globalData.reciteData))
  } catch (e) {
    console.warn('[recite] 存储失败:', e)
  }
}

// 获取背诵统计（总数 + 当前徽章）
function getReciteStats() {
  const data = _getReciteData()
  const total = data.total || 0
  let badge = RECITE_BADGES[0]
  for (const b of RECITE_BADGES) {
    if (total >= b.min) badge = b
  }
  const nextBadge = RECITE_BADGES.find(b => b.min > total)
  return { total, badge, nextBadge }
}

// 标记完成一首诗的背诵练习
// mode: 'follow' | 'fill' | 'full'
function markRecited(poemId, mode) {
  const data = _getReciteData()
  // 检查是否已存在（同首诗只算一次）
  const existing = data.poems.find(p => p.id === poemId)
  if (existing) {
    // 更新模式（保留最高模式）
    const modeRank = { follow: 1, fill: 2, full: 3 }
    if (modeRank[mode] > modeRank[existing.mode || 'follow']) {
      existing.mode = mode
    }
    existing.lastRecite = Date.now()
    existing.times = (existing.times || 1) + 1
  } else {
    data.poems.push({ id: poemId, mode: mode, firstRecite: Date.now(), lastRecite: Date.now(), times: 1 })
    data.total = (data.total || 0) + 1
  }

  // 检查徽章升级
  const oldBadge = (() => {
    let b = RECITE_BADGES[0]
    const oldTotal = data.total - (existing ? 0 : 1)
    for (const badge of RECITE_BADGES) {
      if (oldTotal >= badge.min) b = badge
    }
    return b
  })()

  const newBadge = (() => {
    let b = RECITE_BADGES[0]
    for (const badge of RECITE_BADGES) {
      if (data.total >= badge.min) b = badge
    }
    return b
  })()

  const badgeUpgraded = newBadge.name !== oldBadge.name

  _saveReciteData()
  return { total: data.total, badge: newBadge, badgeUpgraded, oldBadge, existing: !!existing }
}

// 获取单首诗的背诵记录
function getPoemReciteRecord(poemId) {
  const data = _getReciteData()
  return data.poems.find(p => p.id === poemId) || null
}

module.exports = {
  THEMES, DYNASTIES, GRADES,
  getPoemBg, getAudioUrl, getAudioDuration, getSentenceTimings, getPoemSentences,
  getBgmUrl, BGM_LIST,
  getDailyPoem, getPoemsByFilter,
  markRead, completeReview, getReviewList,
  getCheckinStatus, doCheckin,
  toggleFav, isFav, showToast, getSceneMode,
  getReciteStats, markRecited, getPoemReciteRecord, RECITE_BADGES
}
