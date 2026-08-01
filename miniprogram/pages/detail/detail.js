const U = require('../../utils/store')

Page({
  data: {
    poem: null,
    poemBg: '',
    isFav: false,
    playing: false,
    highlightIdx: -1,
    currentSentenceIdx: -1,
    audioProgress: 0,
    audioDuration: 0,
    speedRate: 0.8,  // 跟读语速：0.8 倍速，适合儿童跟读

    /* 抽屉状态：collapsed / half / full */
    drawerState: 'half',
    drawerH: '55%',
    drawerRadius: '44rpx',
    readBarBottom: '57%',
    drawerTouchY: 0,
    drawerStartY: 0,
    drawerDragging: false,

    /* Tab 状态 */
    activeTab: 'sentence',

    /* BGM 开关（古风背景音乐） */
    bgmOn: true
  },

  _timer: null,
  _audio: null,

  onLoad(options) {
    const id = options.id
    const p = getApp().globalData.poems.find(p => p.id === id)
    if (!p) { wx.showToast({ title: '诗未找到', icon: 'none' }); return }
    this.setData({
      poem: p,
      isFav: U.isFav(id),
      poemBg: U.getPoemBg(p)
    })
    U.markRead(id)
  },

  onUnload() { this.stopAudio() },
  onHide() {
    // BackgroundAudioManager 退后台仍可播放（requiredBackgroundModes 已配置），不需要暂停
  },
  onShow() {
    // 返回页面时保持当前播放状态
  },

  goBack() { wx.navigateBack() },
  toggleFav() {
    const added = U.toggleFav(this.data.poem.id)
    this.setData({ isFav: added })
  },
  goCard() { wx.navigateTo({ url: '/pages/card/card?id=' + this.data.poem.id }) },

  // ── Tab 切换 ──
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
  },

  togglePlay() {
    if (this.data.playing) { this.stopAudio(); return }
    this.startAudio()
  },

  // BGM 已移除（BackgroundAudioManager 不支持双轨，后续可用 InnerAudioContext 独立轨恢复）
  toggleBgm() { },

  // ── 语音朗读 · BackgroundAudioManager 版 ──
  // InnerAudioContext 在 macOS 模拟器音频管道不通。
  // BackgroundAudioManager 走系统原生播放器，模拟器/真机都能出声。
  // 注意：BackgroundAudioManager 是全局单例，设 src 即自动播放。
  startAudio() {
    if (!this.data.poem) return

    const url = U.getAudioUrl(this.data.poem)
    console.log('[audio] 准备播放:', url)
    if (!url) { wx.showToast({ title: '音频资源未找到', icon: 'none' }); return }

    const initDuration = U.getAudioDuration(this.data.poem)
    this._timings = U.getSentenceTimings(this.data.poem)
    this._sentenceCharOffsets = []
    let goff = 0
    const PUNCT_TRAIL = /[，。？！；、：,!?;:\n\r ]+$/
    this._timings.forEach(seg => {
      this._sentenceCharOffsets.push(goff)
      const t = (seg.text || '').replace(PUNCT_TRAIL, '')
      goff += t.length || (seg.text || '').length
    })

    this.setData({
      playing: true,
      highlightIdx: 0,
      currentSentenceIdx: 0,
      audioProgress: 0,
      audioDuration: initDuration
    })

    // BackgroundAudioManager 是全局单例，src 赋值即自动播放。
    // ⚠️ 所有事件回调必须在 src 赋值之前注册，否则可能丢失回调。
    const bgAudio = wx.getBackgroundAudioManager()

    // 先移除旧的监听（防止同一页面多次播放叠加回调）
    this._stopBgAudioListeners()

    bgAudio.onCanplay(() => {
      console.log('[audio] canplay 就绪, duration:', bgAudio.duration)
      const realMs = bgAudio.duration * 1000
      if (realMs > 0 && Math.abs(realMs - initDuration) > 500) {
        this._timings = U.getSentenceTimings(this.data.poem, realMs)
        let g = 0
        this._sentenceCharOffsets = []
        this._timings.forEach(seg => {
          this._sentenceCharOffsets.push(g)
          const t = (seg.text || '').replace(PUNCT_TRAIL, '')
          g += t.length || (seg.text || '').length
        })
        this.setData({ audioDuration: realMs })
      }
    })

    bgAudio.onPlay(() => {
      console.log('[audio] 正在播放...')
    })

    bgAudio.onTimeUpdate(() => {
      const timings = this._timings
      const offsets = this._sentenceCharOffsets
      if (!timings || !offsets) return
      const dur = bgAudio.duration || initDuration / 1000
      const pct = dur ? bgAudio.currentTime / dur : 0
      const ms = bgAudio.currentTime * 1000
      let si = timings.length - 1
      for (let i = 0; i < timings.length; i++) {
        if (ms < timings[i].start + timings[i].duration) { si = i; break }
      }
      this.setData({
        audioProgress: pct,
        highlightIdx: offsets[si] != null ? offsets[si] : 0,
        currentSentenceIdx: si
      })
    })

    bgAudio.onEnded(() => {
      console.log('[audio] 播放结束')
      this.stopAudio()
    })

    // 保存 onError 回调引用，便于 _stopBgAudioListeners 解除绑定
    this._bgAudioErrorHandler = (err) => {
      console.error('[audio] 错误:', JSON.stringify(err))
      wx.showToast({ title: '播放失败: ' + (err.errMsg || '未知'), icon: 'none', duration: 2000 })
      this.stopAudio()
    }
    bgAudio.onError(this._bgAudioErrorHandler)

    // 事件全部注册完毕，再设 title/src 触发播放
    bgAudio.title = this.data.poem.title || '诗芽朗读'
    bgAudio.src = url

    console.log('[audio] BackgroundAudioManager 已启动:', bgAudio.title, '| src:', url)

    this._audio = bgAudio
  },

  stopAudio() {
    // 先解绑事件回调，防止 stop() 触发 onEnded → 递归
    this._stopBgAudioListeners()
    this.setData({
      playing: false,
      highlightIdx: -1,
      currentSentenceIdx: -1,
      audioProgress: 0
    })
    if (this._audio) { this._audio.stop(); this._audio = null }
  },

  // 解除 BackgroundAudioManager 的所有事件监听，防止回调叠加
  _stopBgAudioListeners() {
    try {
      const bgAudio = wx.getBackgroundAudioManager()
      bgAudio.offCanplay()
      bgAudio.offPlay()
      bgAudio.offTimeUpdate()
      bgAudio.offEnded()
      bgAudio.offError(this._bgAudioErrorHandler)
      this._bgAudioErrorHandler = null
    } catch (e) {
      // BackgroundAudioManager 可能未初始化，忽略
    }
  },

  // ── 抽屉拖拽交互 ──

  onDrawerTouchStart(e) {
    const t = e.touches[0]
    this.setData({
      drawerStartY: t.clientY,
      drawerTouchY: t.clientY,
      drawerDragging: true
    })
  },

  onDrawerTouchMove(e) {
    if (!this.data.drawerDragging) return
    this.setData({ drawerTouchY: e.touches[0].clientY })
  },

  onDrawerTouchEnd(e) {
    if (!this.data.drawerDragging) return
    const delta = this.data.drawerStartY - this.data.drawerTouchY
    const abs = Math.abs(delta)
    const states = ['collapsed', 'half', 'full']
    const curIdx = states.indexOf(this.data.drawerState)

    this.setData({ drawerDragging: false })

    // 阈值 20px 以上才算有效滑动
    if (abs < 20) return

    if (delta > 0 && curIdx < 2) {
      // 上滑 → 展开一级
      this._setDrawerState(states[curIdx + 1])
    } else if (delta < 0 && curIdx > 0) {
      // 下滑 → 收起一级
      this._setDrawerState(states[curIdx - 1])
    }
  },

  _setDrawerState(state) {
    const map = {
      collapsed: { h: '30%', radius: '44rpx', barBottom: '32%' },
      half:      { h: '55%', radius: '44rpx', barBottom: '57%' },
      full:      { h: '85%', radius: '0rpx',  barBottom: '87%' }
    }
    const cfg = map[state]
    this.setData({
      drawerState: state,
      drawerH: cfg.h,
      drawerRadius: cfg.radius,
      readBarBottom: cfg.barBottom
    })
  }
})
