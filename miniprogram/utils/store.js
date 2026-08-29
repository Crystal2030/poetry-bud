// 诗芽 - 工具方法
const app = getApp()

// 常量
const THEMES = ['全部', '思乡', '咏物', '山水', '童趣', '送别', '边塞', '哲理', '田园', '写景', '爱国', '亲情', '友情', '读书', '节日', '羁旅']
const DYNASTIES = ['全部', '先秦', '汉', '南北朝', '唐', '宋', '元', '明', '清', '现代']
const GRADES = ['全部', '一年级上', '一年级下', '二年级上', '二年级下', '三年级上', '三年级下', '四年级上', '四年级下', '五年级上', '五年级下', '六年级上', '六年级下', '课外拓展']

// 间隔复习阶段（艾宾浩斯儿童简化版）：1d → 2d → 4d → 7d → 15d → 30d → 已掌握
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30]

// ===== CDN 资源路径 =====

// size: 'thumb' (400x270 jpg, 列表) | 'medium' (800x540 jpg, 卡片) | 'full' (1264x848 png, 详情/分享)
// 注：poem.id 已含 'kid_' 前缀，CDN 文件名 = 直接 {id}.{ext}
function getPoemBg(poem, size) {
  if (!poem) return ''
  const g = app.globalData
  const base = g.CDN.images
  // 1. 小学诗优先用专属封面图（一词一景，无文字）
  if (poem.grade && poem.grade !== '课外拓展' && poem.id) {
    const id = poem.id
    if (size === 'thumb') return base + 'covers-thumb/' + id + '.jpg'
    if (size === 'medium') return base + 'covers-medium/' + id + '.jpg'
    // full 或默认：原图 PNG（详情/分享/未指定时）
    return base + 'covers/' + id + '.png'
  }
  // 2. 课外诗 → 主题图（PNG）
  const tid = g.themeMap[poem.id]
  if (tid) return base + 'themes/' + tid + '.png'
  // 3. 兜底 → 场景图（PNG）
  const sc = poem.sceneId || 'generic'
  return base + 'scene-' + sc + '.png'
}

// 图片加载失败的统一兜底：优先切换 CDN 节点（同尺寸路径），节点耗尽后升级到原图 png。
// 返回下一个应尝试的 URL；无更多选项时返回 ''（调用方据此停止重试，避免死循环）。
function nextBgFallback(poem, currentUrl) {
  if (!currentUrl) return ''
  const g = app.globalData
  const hosts = (g.CDN && g.CDN.hosts) || ['https://cdn.jsdelivr.net']
  const PATH_MARK = '/gh/Crystal2030/poetry-bud-assets@001ed1b'
  const pi = currentUrl.indexOf(PATH_MARK)
  if (pi < 0) return ''            // 非本项目 CDN 路径，不处理
  const path = currentUrl.slice(pi)
  let idx = hosts.findIndex(h => currentUrl.indexOf(h) === 0)
  if (idx < 0) idx = hosts.length - 1  // 未识别的 host 视作已到最后
  // 1) 还有下一节点 → 同路径切到下一节点
  if (idx < hosts.length - 1) {
    return hosts[idx + 1] + path
  }
  // 2) 已是最后节点：若当前不是 full png 封面，则升级到 full（回到第一个节点）
  if (poem && poem.grade && poem.grade !== '课外拓展' && poem.id) {
    const fullPath = PATH_MARK + '/bg-samples/covers/' + poem.id + '.png'
    if (path !== fullPath) {
      return hosts[0] + fullPath
    }
  }
  return ''
}

function getAudioUrl(poem) {
  if (!poem) return ''
  return app.globalData.CDN.audio + poem.id + '.mp3'
}

// 小程序码 CDN 地址（scene=id=诗id 已烧录进图片，扫码直达详情页）
function getQrUrl(poemId) {
  if (!poemId) return ''
  const g = app.globalData
  return (g.CDN && g.CDN.qr ? g.CDN.qr : '') + poemId + '.jpg'
}

// 花园 v4 形象资产（时间线成长节点 + 品质成长徽章，透明背景 1024×1024 PNG）
// 名称示例：'timeline-seed' / 'badge-courage'
function getGardenAsset(name) {
  if (!name) return ''
  const g = app.globalData
  return (g.CDN && g.CDN.garden ? g.CDN.garden : '') + name + '.png'
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

// 规范化作者名（与 TTS 脚本 tts_synthesize.py 的 _clean_author 保持一致）
function _cleanAuthor(author) {
  let a = (author || '').trim()
  a = a.replace(/《/g, '').replace(/》/g, '')
  a = a.replace(/[（(].*?[）)]/g, '')
  return a.trim()
}

// 朗读开头的「《标题》，朝代，作者。」前言文本（用于估算前言时长）
function getIntroText(poem) {
  if (!poem) return ''
  const title = poem.title || ''
  const author = _cleanAuthor(poem.author)
  const dynasty = (poem.dynasty || '').trim()
  const merged = ['汉乐府', '北朝民歌', '古诗十九首', '韩非子'].indexOf(author) !== -1
  if (merged) return `《${title}》，${author}。`
  if (dynasty && author) return `《${title}》，${dynasty}，${author}。`
  return `《${title}》，${author || dynasty}。`
}

function getSentenceTimings(poem, overrideDuration) {
  if (!poem) return []
  const sentences = getPoemSentences(poem)
  if (!sentences.length) return []
  const totalChars = sentences.reduce((s, sent) => s + (sent.text || '').length, 0)
  if (!totalChars) return []
  const dur = overrideDuration || getAudioDuration(poem) || 5000

  // 朗读开头会先读「《标题》，朝代，作者。」（前言），
  // 需把这部分时长从诗句时间轴里扣除，否则高亮会整体偏移。
  const introText = getIntroText(poem)
  const introChars = introText.replace(/[《》，。、；！？\s]/g, '').length

  const READ_RATIO = 0.83
  const PAUSE_RATIO = 0.17
  const readTime = dur * READ_RATIO
  const pausePool = dur * PAUSE_RATIO

  // 前言时长：按字数占比分走朗读时长，另加与 TTS <break time='700ms'/> 对齐的停顿
  const allChars = totalChars + introChars
  const introReadTime = allChars ? readTime * (introChars / allChars) : 0
  const INTRO_BREAK = 700
  const introOffset = introReadTime + (introChars ? INTRO_BREAK : 0)
  const bodyReadTime = readTime - introReadTime

  const STRONG_PAUSE = { '。': 1, '！': 1, '？': 1, '!': 1, '?': 1, '\n': 1 }
  const pauseWeights = sentences.map(s => {
    const text = s.text || ''
    if (!text) return 0
    const lastChar = text[text.length - 1]
    return STRONG_PAUSE[lastChar] ? 2 : 1
  })
  const totalPauseWeight = pauseWeights.reduce((s, w) => s + w, 0)
  let elapsed = introOffset
  return sentences.map((sent, i) => {
    const text = sent.text || ''
    const charWeight = text.length / totalChars
    const sentenceReadTime = bodyReadTime * charWeight
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

// ===== 朗读语速（倍速）=====
// BackgroundAudioManager / InnerAudioContext 的 playbackRate 有效范围 0.5～2.0
const SPEED_RATES = [0.5, 0.7, 0.8, 1.0, 1.25, 1.5]
const SPEED_KEY = 'pb_speed_rate'
const DEFAULT_SPEED = 0.8

function getSpeedRate() {
  let rate = DEFAULT_SPEED
  try {
    const v = parseFloat(wx.getStorageSync(SPEED_KEY))
    if (!isNaN(v) && v >= 0.5 && v <= 2) rate = v
  } catch (e) { /* 忽略，用默认值 */ }
  return rate
}

function setSpeedRate(rate) {
  try {
    wx.setStorageSync(SPEED_KEY, String(rate))
  } catch (e) { /* 静默失败 */ }
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
  const band = ageBand || wx.getStorageSync('pb_age_band') || '7-10'
  // 筛选匹配年龄段的诗
  const filtered = poems.filter(p => {
    if (!p.ageBand) return true
    if (Array.isArray(p.ageBand)) return p.ageBand.some(a => a === band)
    if (typeof p.ageBand === 'string') return p.ageBand.split(',').some(a => a.trim() === band)
    return true
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
      if (!p.ageBand) return true
      if (Array.isArray(p.ageBand)) return p.ageBand.some(a => a === ageBand)
      if (typeof p.ageBand === 'string') return p.ageBand.split(',').some(a => a.trim() === ageBand)
      return true
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
  { name: '诗童', icon: '/static/icons/paper/sprout-small.svg', min: 0, desc: '开始背诵之旅' },
  { name: '诗生', icon: '/static/icons/paper/sprout-large.svg', min: 3, desc: '背诵3首古诗' },
  { name: '诗秀', icon: '/static/icons/paper/bamboo.svg', min: 10, desc: '背诵10首古诗' },
  { name: '诗杰', icon: '/static/icons/paper/medal.svg', min: 20, desc: '背诵20首古诗' },
  { name: '诗魁', icon: '/static/icons/paper/crown.svg', min: 50, desc: '背诵50首古诗' },
  { name: '诗仙', icon: '/static/icons/paper/sparkle.svg', min: 100, desc: '背诵100首古诗！' }
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

// 诗库总条数（动态，避免在 onboarding/splash 硬编码）
function getPoemCount() {
  const all = require('../data/poems.js')
  return all.length
}

// 课标诗条数（kid_ 开头的视为课标小学诗）
function getCurriculumPoemCount() {
  const all = require('../data/poems.js')
  return all.filter(p => p.id && p.id.startsWith('kid_')).length
}

module.exports = {
  THEMES, DYNASTIES, GRADES,
  getPoemBg, nextBgFallback, getAudioUrl, getQrUrl, getAudioDuration, getSentenceTimings, getPoemSentences, getIntroText,
  getBgmUrl, BGM_LIST,
  SPEED_RATES, getSpeedRate, setSpeedRate,
  getDailyPoem, getPoemsByFilter, getPoemCount, getCurriculumPoemCount,
  markRead, completeReview, getReviewList,
  getCheckinStatus, doCheckin,
  toggleFav, isFav, showToast, getSceneMode,
  getReciteStats, markRecited, getPoemReciteRecord, RECITE_BADGES,
  getGardenAsset
}
