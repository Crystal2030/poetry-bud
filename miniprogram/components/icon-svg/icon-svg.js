// =============================================================
// 诗芽 icon 系统 — 双模式渲染
// 1. Simple 模式：单路径 SVG（stroke/fill），支持 currentColor
// 2. Paper 模式：纸艺剪纸风格，多层彩色 SVG，通过 <image> 渲染
// =============================================================

// 纸艺图标映射：name → 文件路径
const PAPER_ICONS = {
  'paper_home':      '/static/icons/paper/tab-home.svg',
  'paper_library':   '/static/icons/paper/tab-library.svg',
  'paper_garden':    '/static/icons/paper/tab-garden.svg',
  'paper_me':        '/static/icons/paper/tab-me.svg',
  'paper_search':    '/static/icons/paper/search.svg',
  'paper_back':      '/static/icons/paper/back.svg',
  'paper_heart':     '/static/icons/paper/heart.svg',
  'paper_play':      '/static/icons/paper/play.svg',
  'paper_pause':     '/static/icons/paper/pause.svg',
  'paper_audio':     '/static/icons/paper/audio.svg',
  'paper_save':      '/static/icons/paper/save.svg',
  'paper_share':     '/static/icons/paper/share.svg',
  'paper_print':     '/static/icons/paper/print.svg',
  'paper_card':      '/static/icons/paper/card.svg',
  'paper_sprout_sm': '/static/icons/paper/sprout-small.svg',
  'paper_sprout_lg': '/static/icons/paper/sprout-large.svg',
  'paper_heart_e':   '/static/icons/paper/heart-empty.svg',
  'paper_badge_medal':    '/static/icons/paper/badge-medal.svg',
  'paper_badge_sprout':   '/static/icons/paper/badge-sprout.svg',
  'paper_badge_seedling': '/static/icons/paper/badge-seedling.svg',
  'paper_badge_blossom':  '/static/icons/paper/badge-blossom.svg',
  'paper_badge_fruit':    '/static/icons/paper/badge-fruit.svg',
  'paper_badge_tree':     '/static/icons/paper/badge-tree.svg',
  'paper_badge_poet':     '/static/icons/paper/badge-poet.svg',
  'paper_badge_lock':     '/static/icons/paper/badge-lock.svg'
}

// Simple 模式图标（viewBox: 0 0 24 24，纯路径）
const ICONS = {
  // ===== Tabbar 导航（保留兼容，实际已迁移到 paper 模式）=====
  home: 'M3 12 L12 3 L21 12 L19 12 L19 21 L14 21 L14 14 L10 14 L10 21 L5 21 L5 12 Z',
  grid:  'M3 3 H11 V11 H3 Z M13 3 H21 V11 H13 Z M3 13 H11 V21 H3 Z M13 13 H21 V21 H13 Z',
  user:  'M12 4 a4 4 0 0 1 0 8 a4 4 0 0 1 0 -8 M4 21 v-2 a8 8 0 0 1 16 0 v2',

  // ===== 四瓣花（实心）=====
  flower: { d:
    'M9 6 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 Z ' +
    'M15 12 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 Z ' +
    'M9 18 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 Z ' +
    'M3 12 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 Z ' +
    'M10.5 12 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0 Z',
    fill: true
  },

  // ===== 导航/搜索 =====
  search:        'M10.5 3 a7.5 7.5 0 0 1 0 15 a7.5 7.5 0 0 1 0 -15 M16 16 L22 22',
  back:          'M15 5 L8 12 L15 19',
  'chevron-right': 'M9 5 L16 12 L9 19',
  'arrow-up':    'M12 20 L12 4 M5 11 L12 4 L19 11',
  'arrow-down':  'M12 4 L12 20 M5 13 L12 20 L19 13',

  // ===== 四维分类 =====
  'cat-dynasty': 'M3 20 H21 M7 20 V9 M12 20 V9 M17 20 V9',
  'cat-author':  'M12 3 V17 M8.5 20.5 L12 17 L15.5 20.5',
  'cat-grade':   'M3 8 H21 M3 13 H21 M3 18 H21 M8 22 H16',
  'cat-theme':   { d:
    'M12 2 L14 9 L21 8 L16 12 L21 16 L14 15 L12 22 L10 15 L3 16 L8 12 L3 8 L10 9 Z',
    fill: true
  },

  // ===== 内容 Tab =====
  book:    'M3 5 H8 a3 3 0 0 1 3 3 V20 H5 a2 2 0 0 1 -2 -2 Z ' +
           'M21 5 H16 a3 3 0 0 0 -3 3 V20 H19 a2 2 0 0 0 2 -2 Z',
  check:   'M4 12 L10 18 L20 6',
  tips:    'M9 3 H15 a5 5 0 0 1 5 5 V11 a4 4 0 0 1 -3 4 V18 H7 V15 a4 4 0 0 1 -3 -4 V8 a5 5 0 0 1 5 -5 Z ' +
           'M10 20 H14 V22 H10 Z',
  paint:   'M12 3 a9 9 0 0 1 7 15 a3 3 0 0 1 -3 3 H14 a2 2 0 0 0 -2 2 V22 a2 2 0 0 1 -2 0 a9 9 0 0 1 2 -19 Z ' +
           'M7 14 a1 1 0 1 0 0 -2 a1 1 0 1 0 0 2 ' +
           'M12 7 a1 1 0 1 0 0 -2 a1 1 0 1 0 0 2 ' +
           'M16 10 a1 1 0 1 0 0 -2 a1 1 0 1 0 0 2',
  mountain:'M2 21 L9 10 L13 16 L17 12 L22 21 Z',
  person:  'M12 4 a4 4 0 0 1 0 8 a4 4 0 0 1 0 -8 ' +
           'M5 21 v-1 a7 7 0 0 1 14 0 V21',

  // ===== 详情/状态 =====
  star:    { d:
    'M12 3 L14.6 9.6 L21.7 10.2 L16.2 14.8 L18 21.7 L12 17.9 L6 21.7 L7.8 14.8 L2.3 10.2 L9.4 9.6 Z',
    fill: true
  },
  heart:   { d:
    'M12 21 C 5 15, 3 10, 6.5 6 C 9 3, 12 5, 12 8 C 12 5, 15 3, 17.5 6 C 21 10, 19 15, 12 21 Z',
    fill: true
  },
  sparkle: { d:
    'M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z',
    fill: true
  },
  play:    { d: 'M8 5 L19 12 L8 19 Z', fill: true },
  pause:   'M8 5 V19 M16 5 V19',
  card:    'M3 7 H17 V17 H3 Z M7 3 H21 V13 H7 Z',
  music:   'M9 18 V5 L19 3 V16 M9 18 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 1 1 5 0 ' +
           'M19 16 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 1 1 5 0',
  mute:    'M9 18 V5 L19 3 V16 M3 9 L22 19',
  wave:    'M4 10 V14 M8 8 V16 M12 5 V19 M16 8 V16 M20 10 V14',
  clock:   'M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0 -18 M12 7 V12 L16 14',
  trash:   'M4 7 H20 M9 7 V4 H15 V7 M6 7 L7 21 H17 L18 7 M10 11 V17 M14 11 V17',
  lock:    'M7 11 V7 a5 5 0 0 1 10 0 V11 M5 11 H19 V21 H5 Z',
  trophy:  'M7 4 H17 V11 a5 5 0 0 1 -10 0 Z M5 4 V7 a3 3 0 0 0 3 3 M19 4 V7 a3 3 0 0 1 -3 3 ' +
           'M9 16 H15 M11 19 H13 M12 11 V16',
  menu:    'M4 7 H20 M4 12 H20 M4 17 H20'
}

function _resolve(name) {
  const v = ICONS[name]
  if (typeof v === 'string') return { d: v, fill: false }
  if (v && typeof v === 'object') return { d: v.d, fill: !!v.fill }
  return { d: ICONS.home, fill: false }
}

Component({
  options: { virtualHost: true },
  properties: {
    name:   { type: String, value: 'home' },
    size:   { type: String, value: '32' },
    color:  { type: String, value: 'currentColor' },
    stroke: { type: String, value: '2' }
  },
  data: {
    d: '',
    fill: false,
    sw: '2',
    isPaper: false,     // 纸艺图标标记
    paperSrc: ''        // 纸艺图标路径
  },
  observers: {
    'name, stroke'(_name, _sw) {
      // 检查是否纸艺图标
      if (PAPER_ICONS[_name]) {
        this.setData({
          isPaper: true,
          paperSrc: PAPER_ICONS[_name],
          sw: this.data.stroke
        })
      } else {
        const r = _resolve(_name)
        this.setData({
          isPaper: false,
          paperSrc: '',
          d: r.d,
          fill: r.fill,
          sw: this.data.stroke
        })
      }
    }
  },
  lifetimes: {
    attached() {
      if (PAPER_ICONS[this.data.name]) {
        this.setData({
          isPaper: true,
          paperSrc: PAPER_ICONS[this.data.name],
          sw: this.data.stroke
        })
      } else {
        const r = _resolve(this.data.name)
        this.setData({
          isPaper: false,
          paperSrc: '',
          d: r.d,
          fill: r.fill,
          sw: this.data.stroke
        })
      }
    }
  }
})
