// 诗芽 PoetryBud - 小程序入口
// 静态资源 CDN（GitHub + jsDelivr，无鉴权、全球加速、永久有效）
const CDN = {
  images: 'https://cdn.jsdelivr.net/gh/Crystal2030/poetry-bud-assets@main/bg-samples/',
  audio:  'https://cdn.jsdelivr.net/gh/Crystal2030/poetry-bud-assets@main/audio/'
}

App({
  globalData: {
    poems: [],
    loaded: false,
    themeMap: {},
    durationMap: {},
    readCount: 0,
    favorites: [],
    CDN
  },

  onLaunch() {
    // 恢复本地存储
    try {
      const fav = wx.getStorageSync('pb_fav')
      if (fav) this.globalData.favorites = JSON.parse(fav)
      const rc = wx.getStorageSync('pb_read')
      if (rc) this.globalData.readCount = parseInt(rc) || 0
    } catch (e) {}

    // 加载诗词数据
    this.loadData()

    // 加载音频时长映射
    this.loadDurationMap()
  },

  loadData() {
    try {
      const data = require('./data/poems.js')
      this.globalData.poems = data
      this.globalData.loaded = true
      console.log('🌸 诗芽 · 已加载 ' + data.length + ' 首诗')

      // 加载主题背景图映射
      try {
        this.globalData.themeMap = require('./data/theme-map.js')
        console.log('🖼 主题映射已加载，共 ' + Object.keys(this.globalData.themeMap).length + ' 条')
      } catch (e2) {
        console.warn('主题映射加载失败，降级使用 scene 图', e2)
        this.globalData.themeMap = {}
      }
    } catch (e) {
      console.error('加载诗词数据失败', e)
      this.globalData.poems = [{
        id: 'kid_0', title: '咏鹅', author: '骆宾王', dynasty: '唐',
        level: 'L1', grade: '一年级上', sceneId: 'pond', sceneName: '池塘',
        paragraphs: ['鹅鹅鹅，曲项向天歌。', '白毛浮绿水，红掌拨清波。'],
        funTip: '碧塘白鹅，春日童趣～', theme: '童趣',
        pinyinLines: [
          [{ char: '鹅', py: 'é' }, { char: '鹅', py: 'é' }, { char: '鹅', py: 'é' }, { char: '，', py: '' }, { char: '曲', py: 'qū' }, { char: '项', py: 'xiàng' }, { char: '向', py: 'xiàng' }, { char: '天', py: 'tiān' }, { char: '歌', py: 'gē' }, { char: '。', py: '' }],
          [{ char: '白', py: 'bái' }, { char: '毛', py: 'máo' }, { char: '浮', py: 'fú' }, { char: '绿', py: 'lǜ' }, { char: '水', py: 'shuǐ' }, { char: '，', py: '' }, { char: '红', py: 'hóng' }, { char: '掌', py: 'zhǎng' }, { char: '拨', py: 'bō' }, { char: '清', py: 'qīng' }, { char: '波', py: 'bō' }, { char: '。', py: '' }]
        ]
      }]
      this.globalData.loaded = true
    }
  },

  loadDurationMap() {
    try {
      this.globalData.durationMap = require('./data/durations.js')
      console.log('🔊 时长映射已加载')
    } catch (e) {
      console.warn('时长映射加载失败，使用默认值', e)
    }
  }
})
