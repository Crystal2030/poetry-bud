const U = require('../../utils/store')

const dims = [
  { key: 'theme', label: '主题' },
  { key: 'dynasty', label: '朝代' },
  { key: 'author', label: '作者' },
  { key: 'grade', label: '年级' }
]

Page({
  data: {
    dims,
    dim: 'theme',
    items: [],
    poems: [],
    selected: '全部',
    searchQuery: '',
    filteredPoems: [],
    searchFocus: false
  },

  onShow() {
    const g = getApp().globalData
    if (g._libDim) {
      if (g._libDim === 'search') {
        // 首页搜索入口：聚焦搜索框并列出全部诗词
        this.setData({ dim: 'theme', searchFocus: true })
      } else {
        this.setData({ dim: g._libDim })
      }
      delete g._libDim
    }
    this.buildItems()
  },

  onSearch(e) {
    const q = e.detail.value
    this.setData({ searchQuery: q })
    this.applyFilter()
  },

  onSearchBlur() {
    this.setData({ searchFocus: false })
  },

  switchDim(e) {
    this.setData({ dim: e.currentTarget.dataset.key, searchQuery: '' })
    this.buildItems()
  },

  buildItems() {
    const d = this.data.dim
    let items = []
    if (d === 'theme') items = U.THEMES
    else if (d === 'dynasty') items = U.DYNASTIES
    else if (d === 'author') items = ['全部', ...new Set(getApp().globalData.poems.map(p => p.author).filter(Boolean))]
    else if (d === 'grade') items = U.GRADES
    const poems = U.getPoemsByFilter(d, '全部').map(p => ({ ...p, bg: U.getPoemBg(p) }))
    this.setData({ items, poems, selected: '全部' })
    U.resolveAllBgs(poems, resolved => {
      this.setData({ poems: resolved })
      this.applyFilter()
    })
  },

  filter(e) {
    const val = e.currentTarget.dataset.val
    const poems = U.getPoemsByFilter(this.data.dim, val).map(p => ({ ...p, bg: U.getPoemBg(p) }))
    this.setData({ selected: val, poems })
    U.resolveAllBgs(poems, resolved => {
      this.setData({ poems: resolved })
      this.applyFilter()
    })
  },

  applyFilter() {
    const q = this.data.searchQuery.trim().toLowerCase()
    if (!q) { this.setData({ filteredPoems: this.data.poems }); return }
    const filtered = this.data.poems.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.author || '').toLowerCase().includes(q) ||
      (p.dynasty || '').toLowerCase().includes(q) ||
      (p.theme || '').toLowerCase().includes(q)
    )
    this.setData({ filteredPoems: filtered })
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  }
})
