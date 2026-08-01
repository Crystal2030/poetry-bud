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
  if (tid) return base + 'themes/' + tid + '.png'  // 主题背景在 themes/ 子目录
  const sc = poem.sceneId || 'generic'
  return base + 'scene-' + sc + '.png'
}

function getAudioUrl(poem) {
  if (!poem) return ''
  return app.globalData.CDN.audio + poem.id + '.m4a'
}

function getAudioDuration(poem) {
  if (!poem) return 0
  return app.globalData.durationMap[poem.id] || 0
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

function markRead() {
  app.globalData.readCount++
  wx.setStorageSync('pb_read', app.globalData.readCount.toString())
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
  getPoemBg, resolvePoemBg, resolveAllBgs, resolveCloudUrl,
  getAudioFileId, getAudioTempUrl, getAudioDuration,
  getDailyPoem, getPoemsByFilter,
  markRead, toggleFav, isFav, showToast, getSceneMode
}
