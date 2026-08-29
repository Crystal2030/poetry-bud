// 诗芽 PoetryBud - 小程序入口
// 静态资源 CDN（GitHub 仓库，jsDelivr 官方多节点 + 加载失败自动降级）
// 优先走 Cloudflare 节点（国内可达性更稳定），失败依次降级到默认节点 / GCore 节点
const CDN_HOSTS = [
  'https://testingcf.jsdelivr.net', // Cloudflare 节点（主）
  'https://cdn.jsdelivr.net',       // 默认节点（备1）
  'https://gcore.jsdelivr.net'      // GCore 节点（备2）
]
const CDN_PATH = '/gh/Crystal2030/poetry-bud-assets@444efbd'
const CDN = {
  hosts: CDN_HOSTS,
  images: CDN_HOSTS[0] + CDN_PATH + '/bg-samples/',
  audio:  CDN_HOSTS[0] + CDN_PATH + '/audio/',
  qr:     CDN_HOSTS[0] + CDN_PATH + '/qr/'
}

App({
  globalData: {
    poems: [],
    loaded: false,
    themeMap: {},
    durationMap: {},
    readCount: 0,
    readSet: null,
    favorites: [],
    reviewSchedule: null,
    checkinData: null,
    reciteData: null,
    quizTotal: 0,
    cloudReady: false,
    CDN
  },

  onLaunch() {
    // 云开发初始化（用于生成小程序码，扫码直达详情页）
    // 未开通云开发 / 未配置环境时静默跳过，卡片二维码会降级为占位码
    try {
      if (wx.cloud) {
        wx.cloud.init({ traceUser: true })
        this.globalData.cloudReady = true
      } else {
        this.globalData.cloudReady = false
      }
    } catch (e) {
      this.globalData.cloudReady = false
      console.warn('[诗芽] 云开发初始化失败（二维码将降级为占位码）', e)
    }

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
      console.log('[诗芽] 已加载 ' + data.length + ' 首诗')

      // 加载主题背景图映射
      try {
        this.globalData.themeMap = require('./data/theme-map.js')
        console.log('[诗芽] 主题映射已加载，共 ' + Object.keys(this.globalData.themeMap).length + ' 条')
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
      console.log('[诗芽] 时长映射已加载')
    } catch (e) {
      console.warn('时长映射加载失败，使用默认值', e)
    }
  }
})
