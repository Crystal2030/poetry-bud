const U = require('../../utils/store')

Page({
  data: {
    poem: null,
    poemBg: '',
    isFav: false,
    playing: false,
    highlightIdx: -1,
    totalChars: 0,

    /* 抽屉状态：collapsed / half / full */
    drawerState: 'half',
    drawerH: '55%',
    drawerRadius: '44rpx',
    drawerTouchY: 0,
    drawerStartY: 0,
    drawerDragging: false,

    /* Tab 状态 */
    activeTab: 'sentence'
  },

  _timer: null,
  _audio: null,

  onLoad(options) {
    const id = options.id
    const p = getApp().globalData.poems.find(p => p.id === id)
    if (!p) { wx.showToast({ title: '诗未找到', icon: 'none' }); return }
    this.setData({
      poem: p,
      isFav: U.isFav(id)
    })
    // cloud:// → HTTPS 异步解析（<image> 不直接支持 cloud:// 协议）
    const bgFileId = U.getPoemBg(p)
    console.log('[detail] poem id:', p.id, 'sceneId:', p.sceneId, 'bg fileId:', bgFileId)
    U.resolvePoemBg(p, url => {
      console.log('[detail] 背景图解析结果:', url ? url.substring(0,60)+'...' : '(空)')
      this.setData({ poemBg: url })
    })
    U.markRead()
    let c = 0
    if (p.pinyinLines) p.pinyinLines.forEach(l => l.forEach(() => c++))
    this.setData({ totalChars: c || 80 })
  },

  onUnload() { this.stopAudio() },

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

  startAudio() {
    if (!this.data.poem) return
    this.setData({ playing: true, highlightIdx: 0 })

    // cloud:// → 临时 HTTPS URL → 播放
    U.getAudioTempUrl(this.data.poem, (url) => {
      if (!url) { this.stopAudio(); return }

      const audio = wx.createInnerAudioContext()
      audio.src = url
      audio.play()
      this._audio = audio

      const dur = U.getAudioDuration(this.data.poem)
      const msPerChar = dur && this.data.totalChars ? dur / this.data.totalChars : 300
      let ci = 0
      this._timer = setInterval(() => {
        if (!this.data.playing) return
        ci++
        if (ci >= this.data.totalChars) ci = 0
        this.setData({ highlightIdx: ci })
      }, msPerChar)

      audio.onEnded(() => this.stopAudio())
      audio.onError(() => this.stopAudio())
    })
  },

  stopAudio() {
    this.setData({ playing: false })
    if (this._timer) { clearInterval(this._timer); this._timer = null }
    if (this._audio) { this._audio.destroy(); this._audio = null }
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
      collapsed: { h: '30%', radius: '44rpx' },
      half:      { h: '55%', radius: '44rpx' },
      full:      { h: '85%', radius: '0rpx' }
    }
    const cfg = map[state]
    this.setData({
      drawerState: state,
      drawerH: cfg.h,
      drawerRadius: cfg.radius
    })
  }
})
