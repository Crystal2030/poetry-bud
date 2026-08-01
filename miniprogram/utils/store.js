// 诗芽 - 工具方法
const app = getApp()

// 常量
const THEMES = ['全部', '思乡', '咏物', '山水', '童趣', '送别', '边塞', '哲理', '田园', '写景', '爱国', '亲情', '友情', '读书', '节日', '羁旅']
const DYNASTIES = ['全部', '先秦', '汉', '南北朝', '唐', '宋', '元', '明', '清', '现代']
const GRADES = ['全部', '一年级上', '一年级下', '二年级上', '二年级下', '三年级上', '三年级下', '四年级上', '四年级下', '五年级上', '五年级下', '六年级上', '六年级下']

// ===== CDN 资源路径（同步，无需鉴权）=====

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
  // 音频文件按 poem.id 命名（如 kid_0.mp3, kid_ktA01.mp3, kid_p101.mp3）
  return app.globalData.CDN.audio + poem.id + '.mp3'
}

function getSentenceTimings(poem, overrideDuration) {
  if (!poem) return []
  const sentences = poem.sentences || []
  if (!sentences.length) return []
  const totalChars = sentences.reduce((s, sent) => s + (sent.text || '').length, 0)
  if (!totalChars) return []
  const dur = overrideDuration || getAudioDuration(poem) || 5000

  // 真人朗读：约 83% 时间朗读 + 17% 时间句间停顿
  const READ_RATIO = 0.83
  const PAUSE_RATIO = 0.17
  const readTime = dur * READ_RATIO
  const pausePool = dur * PAUSE_RATIO

  // 句号/叹号/问号 停顿权重大于逗号（约 2:1）
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
    // 最后一句不加句尾停顿
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

// ===== 背景音乐 BGM（古风纯音乐，30-60s 循环） =====
//
// 文件命名建议（CDN 路径 audio/bgm/）：
//   guqin_01.mp3  古琴 - 适合山水田园
//   xiao_01.mp3   洞箫 - 适合思乡羁旅
//   dizi_01.mp3   笛子 - 适合送别友情
//   guzheng_01.mp3 古筝 - 适合童趣节庆
//   pipa_01.mp3   琵琶 - 适合边塞豪情
//
// 用 poem.id 哈希选 BGM，同首诗每次听配同一段

const BGM_LIST = ['guqin_01', 'xiao_01', 'dizi_01', 'guzheng_01', 'pipa_01']

function _hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0  // 转 32 位整数
  }
  return Math.abs(h)
}

function getBgmUrl(poem) {
  if (!poem) return ''
  const idx = _hashStr(poem.id) % BGM_LIST.length
  return app.globalData.CDN.audio + 'bgm/' + BGM_LIST[idx] + '.mp3'
}

function getDailyPoem() {
  const poems = app.globalData.poems
  if (!poems.length) return null
  return poems[new Date().getDate() % poems.length]
}

function getPoemsByFilter(dim, val) {
  const f = [...app.globalData.poems]
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

// 已读诗 ID 集合（按诗去重，O(1) 查询）
function _getReadSet() {
  if (!app.globalData.readSet) {
    let stored = []
    try { stored = JSON.parse(wx.getStorageSync('pb_read_set') || '[]') } catch (e) { stored = [] }
    app.globalData.readSet = new Set(stored)
    // 兼容老用户：readCount 与 readSet 数量不一致时，以 set 为准
    if (app.globalData.readCount !== stored.length) {
      app.globalData.readCount = stored.length
      wx.setStorageSync('pb_read', stored.length.toString())
    }
  }
  return app.globalData.readSet
}

function markRead(poemId) {
  if (!poemId) return
  const set = _getReadSet()
  if (set.has(poemId)) return  // 已读过这首，不再计数
  set.add(poemId)
  app.globalData.readCount = set.size
  // 持久化（两份数据互为校验：read 用于快速读取，read_set 用于去重）
  try {
    wx.setStorageSync('pb_read', set.size.toString())
    wx.setStorageSync('pb_read_set', JSON.stringify([...set]))
  } catch (e) {
    console.warn('[markRead] 存储失败:', e)
  }
}

function toggleFav(id) {
  const favs = app.globalData.favorites
  const idx = favs.indexOf(id)
  if (idx > -1) favs.splice(idx, 1)
  else favs.push(id)
  wx.setStorageSync('pb_fav', JSON.stringify(favs))
  return idx === -1 // true = 已收藏
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

module.exports = {
  THEMES, DYNASTIES, GRADES,
  getPoemBg, getAudioUrl, getAudioDuration, getSentenceTimings,
  getBgmUrl, BGM_LIST,
  getDailyPoem, getPoemsByFilter,
  markRead, toggleFav, isFav, showToast, getSceneMode
}
