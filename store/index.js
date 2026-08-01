import { ref, reactive, computed } from 'vue'

// 场景CSS类映射（H5用）
export const SCENE_CLASS = {
  pond: 'scene-pond', moonlight: 'scene-night', night: 'scene-night',
  field: 'scene-field', grass: 'scene-field', mountain: 'scene-mountain',
  snow: 'scene-snow', courtyard: 'scene-courtyard', generic: 'scene-generic'
}

// 分类常量
export const THEMES = ['全部', '思乡', '咏物', '山水', '童趣', '送别', '边塞', '哲理', '田园', '写景', '爱国', '亲情', '友情', '读书', '节日', '羁旅']
export const DYNASTIES = ['全部', '先秦', '汉', '南北朝', '唐', '宋', '元', '明', '清', '现代']
export const GRADES = ['全部', '一年级上', '一年级下', '二年级上', '二年级下', '三年级上', '三年级下', '四年级上', '四年级下', '五年级上', '五年级下', '六年级上', '六年级下']

// 主题背景路径（uni-app 中静态资源放 /static 下）
const BG_BASE = '/static/bg-samples/'

// 全局 Store（响应式）
const poems = ref([])
const loaded = ref(false)
const themeMap = reactive({})
const durationMap = reactive({})
const readCount = ref(0)
const favorites = ref(new Set())
const toastMsg = ref('')
const bgBase = BG_BASE

// 从 localStorage 恢复
try {
  const fav = uni.getStorageSync('pb_fav')
  if (fav) favorites.value = new Set(JSON.parse(fav))
  const rc = uni.getStorageSync('pb_read')
  if (rc) readCount.value = parseInt(rc) || 0
} catch (e) { /* 忽略 */ }

const store = {
  poems,
  loaded,
  themeMap,
  durationMap,
  readCount,
  favorites,
  toastMsg,
  bgBase,

  init(data, themeData) {
    poems.value = data
    loaded.value = true
    if (themeData) {
      Object.assign(themeMap, themeData.poemThemeMap || {})
    }
  },

  setDurationMap(map) {
    Object.assign(durationMap, map || {})
  },

  getAudioUrl(poem) {
    if (!poem) return ''
    return `/static/audio/${poem.id}.m4a`
  },

  getAudioDuration(poem) {
    if (!poem) return 0
    return durationMap[poem.id] || 0
  },

  getPoemBg(poem) {
    if (!poem) return ''
    const tid = themeMap[poem.id]
    if (tid) return `${bgBase}themes/${tid}.png`
    const sc = poem.sceneId || 'generic'
    return `${bgBase}scene-${sc}.png`
  },

  markRead() {
    readCount.value++
    uni.setStorageSync('pb_read', readCount.value.toString())
  },

  toggleFav(id) {
    if (favorites.value.has(id)) {
      favorites.value.delete(id)
    } else {
      favorites.value.add(id)
    }
    // 触发响应式更新
    favorites.value = new Set(favorites.value)
    uni.setStorageSync('pb_fav', JSON.stringify([...favorites.value]))
  },

  isFav(id) {
    return favorites.value.has(id)
  },

  showToast(msg) {
    toastMsg.value = msg
    setTimeout(() => { toastMsg.value = '' }, 1800)
  },

  getDailyPoem() {
    if (!poems.value.length) return null
    return poems.value[new Date().getDate() % poems.value.length]
  },

  getPoemsByFilter(dim, val) {
    let f = [...poems.value]
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
  },

  getQuiz(poem) {
    if (!poem || !poem.paragraphs) return null
    const lines = poem.paragraphs.filter(l => l.length > 1)
    if (!lines.length) return null
    const qtypes = ['nextLine', 'fillBlank', 'whichAuthor']
    const t = qtypes[Math.floor(Math.random() * qtypes.length)]
    if (t === 'nextLine') {
      const li = Math.min(Math.floor(Math.random() * (lines.length - 1)), lines.length - 2)
      return {
        question: `请接下一句：「${lines[li].replace(/[，。？！、；：]/g, '')}」`,
        answer: lines[li + 1].replace(/[，。？！、；：]/g, ''),
        type: 'input',
        hint: '输入下一句（不含标点）'
      }
    }
    if (t === 'fillBlank') {
      const li = Math.min(Math.floor(Math.random() * lines.length), lines.length - 1)
      const clean = lines[li].replace(/[，。？！、；：]/g, '')
      if (clean.length < 3) return null
      const ci = Math.floor(Math.random() * (clean.length - 1)) + 1
      const masked = clean.substring(0, ci) + '___' + clean.substring(ci + 1)
      return {
        question: `请补全：「${masked}」`,
        answer: clean[ci],
        type: 'choice',
        options: [clean[ci], clean[Math.min(ci + 1, clean.length - 1)], clean[Math.max(ci - 1, 0)], '无']
      }
    }
    if (t === 'whichAuthor') {
      const authors = [...new Set(poems.value.map(p => p.author).filter(Boolean))]
      const correct = poem.author
      const wrongs = authors.filter(a => a !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
      const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5)
      return { question: `《${poem.title}》的作者是？`, answer: correct, type: 'choice', options: opts }
    }
    return null
  }
}

export default store
