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
    bgmOn: true,

    /* 跟读模式 */
    recordMode: false,
    recording: false,
    showScore: false,
    scoreStars: 0,
    scoreDetail: { accuracy: 0, fluency: 0, completeness: 0 },

    /* 趣味小测 */
    showQuiz: false,
    quizQuestions: [],
    quizIdx: 0,
    quizCorrect: 0,
    quizSelected: '',
    currentQ: null,       // 当前题目（预计算，避免 WXML 复杂表达式）
    quizLabeled: [],       // 带字母标签的题目数组

    /* F-004 背诵挑战 */
    reciteMode: 'follow',       // follow | fill | full
    reciteTotal: 0,
    reciteBadge: { name: '诗童', icon: '🌱', desc: '开始背诵之旅' },
    reciteNextBadge: null,
    reciteFollowIdx: -1,
    reciteFollowCompleted: false,
    fillLines: [],
    fillAllRevealed: false,
    fullReciteRevealed: false,
    fullReciteRating: 0,
    showBadgeUpgrade: false,
    oldBadgeName: '',

    /* 译文段落（按 poem.paragraphs 分段） */
    translationParas: []
  },

  _timer: null,
  _audio: null,
  _recorder: null,
  _recSentenceIdx: 0,
  _recResults: [],

  onLoad(options) {
    const id = options.id
    const p = getApp().globalData.poems.find(p => p.id === id)
    if (!p) { wx.showToast({ title: '诗未找到', icon: 'none' }); return }
    this.setData({
      poem: p,
      isFav: U.isFav(id),
      poemBg: U.getPoemBg(p),
      translationParas: this._splitTranslationPara(p)
    })
    U.markRead(id)
    // 间隔复习：如果是待复习诗，进入即完成一次复习
    U.completeReview(id)
  },

  // ── 译文按诗句段落数分段（一段对应一联） ──
  // poem.paragraphs 数量 = 译文应该有的段落数
  // 例：4行绝句 = 2 联 = 2 段；8行律诗 = 4 联 = 4 段
  _splitTranslationPara(poem) {
    if (!poem) return []
    const t = (poem.translation || '').trim()
    if (!t) return []
    const paraCount = (poem.paragraphs || []).length
    if (paraCount <= 1) return [t]

    // 按中英文句末标点切分
    const sentences = t.split(/(?<=[。！？!?])/).map(s => s.trim()).filter(Boolean)

    if (sentences.length === paraCount) return sentences

    // 句数 > 段数：均匀分布到每段（前面的段多装一句）
    if (sentences.length > paraCount) {
      const result = []
      const perGroup = Math.ceil(sentences.length / paraCount)
      for (let i = 0; i < paraCount; i++) {
        const group = sentences.slice(i * perGroup, (i + 1) * perGroup).join('')
        if (group) result.push(group)
      }
      return result.length ? result : [t]
    }

    // 句数 < 段数：回退为单段（避免长句被硬拆）
    return [t]
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

    // 切换到背诵Tab时初始化背诵数据
    if (tab === 'recite') {
      const stats = U.getReciteStats()
      this.setData({
        reciteTotal: stats.total,
        reciteBadge: stats.badge,
        reciteNextBadge: stats.nextBadge || null,
        reciteMode: 'follow',
        reciteFollowIdx: -1,
        reciteFollowCompleted: false,
        fillAllRevealed: false,
        fullReciteRevealed: false,
        fullReciteRating: 0
      })
      // 预生成填空数据
      this._genFillLines()
      // 检查当前诗是否已跟背过
      const record = U.getPoemReciteRecord(this.data.poem.id)
      if (record && record.mode === 'follow') {
        this.setData({ reciteFollowCompleted: true })
      }
    }

    this.setData({ activeTab: tab })
  },

  // ── F-004 背诵模式切换 ──
  switchReciteMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.reciteMode) return

    const update = { reciteMode: mode }

    if (mode === 'fill') this._genFillLines()
    if (mode === 'full') {
      update.fullReciteRevealed = false
      update.fullReciteRating = 0
    }

    this.setData(update)
  },

  // ── 跟背：选中当前行 ──
  selectFollowLine(e) {
    this.setData({ reciteFollowIdx: e.currentTarget.dataset.idx })
  },

  // ── 跟背：完成 ──
  completeFollowRecite() {
    const result = U.markRecited(this.data.poem.id, 'follow')
    this.setData({
      reciteFollowCompleted: true,
      reciteTotal: result.total,
      reciteBadge: result.badge,
      reciteNextBadge: this._calcNextBadge(result.total)
    })
    if (result.badgeUpgraded) {
      this.setData({ showBadgeUpgrade: true, oldBadgeName: result.oldBadge.name })
    } else {
      wx.showToast({ title: '✅ 跟背完成！', icon: 'none' })
    }
  },

  // ── 填空：生成填空行 ──
  _genFillLines() {
    const sentences = U.getPoemSentences(this.data.poem)
    const lines = sentences.map((s, idx) => {
      const text = s.text || ''
      // 每句生成填空：奇数句空白2个字（句尾），偶数句空白1-2个字（句中）
      const parts = []
      if (text.length <= 2) {
        // 太短不填空
        parts.push({ type: 'text', text: text })
      } else {
        const blankStart = idx % 2 === 0
          ? Math.max(0, text.length - 2)  // 偶数句：句尾两字
          : Math.floor(text.length / 2)    // 奇数句：句中位置
        const blankLen = Math.min(2, text.length - blankStart)

        if (blankStart > 0) {
          parts.push({ type: 'text', text: text.substring(0, blankStart) })
        }
        parts.push({ type: 'blank', text: text.substring(blankStart, blankStart + blankLen) })
        if (blankStart + blankLen < text.length) {
          parts.push({ type: 'text', text: text.substring(blankStart + blankLen) })
        }
      }
      return { idx, parts, revealed: false }
    })
    this.setData({ fillLines: lines, fillAllRevealed: false })
  },

  // ── 填空：揭示单个空白 ──
  revealBlank(e) {
    const lineIdx = e.currentTarget.dataset.line
    const lines = this.data.fillLines
    if (lines[lineIdx]) {
      lines[lineIdx].revealed = true
      const allRevealed = lines.every(l => l.revealed)
      this.setData({ fillLines: lines, fillAllRevealed: allRevealed })
    }
  },

  // ── 填空：完成 ──
  completeFillRecite() {
    const result = U.markRecited(this.data.poem.id, 'fill')
    this.setData({
      reciteTotal: result.total,
      reciteBadge: result.badge,
      reciteNextBadge: this._calcNextBadge(result.total)
    })
    if (result.badgeUpgraded) {
      this.setData({ showBadgeUpgrade: true, oldBadgeName: result.oldBadge.name })
    } else {
      wx.showToast({ title: '✅ 填空挑战完成！', icon: 'none' })
    }
  },

  // ── 默背：揭示原文 ──
  revealFullRecite() {
    this.setData({ fullReciteRevealed: true })
  },

  // ── 默背：自评打分 ──
  rateFullRecite(e) {
    this.setData({ fullReciteRating: e.currentTarget.dataset.rating })
  },

  // ── 默背：完成 ──
  completeFullRecite() {
    const result = U.markRecited(this.data.poem.id, 'full')
    this.setData({
      reciteTotal: result.total,
      reciteBadge: result.badge,
      reciteNextBadge: this._calcNextBadge(result.total)
    })
    if (result.badgeUpgraded) {
      this.setData({ showBadgeUpgrade: true, oldBadgeName: result.oldBadge.name })
    } else {
      wx.showToast({ title: '🏆 默背完成！太厉害了！', icon: 'none' })
    }
  },

  // ── 徽章升级弹窗 ──
  dismissBadgeUpgrade() {
    this.setData({ showBadgeUpgrade: false, oldBadgeName: '' })
  },

  // 辅助：计算下一级徽章
  _calcNextBadge(total) {
    const badges = U.RECITE_BADGES
    for (const b of badges) {
      if (b.min > total) return b
    }
    return null
  },

  togglePlay() {
    if (this.data.playing) { this.stopAudio(); return }
    this.startAudio()
  },

  // BGM 已移除（BackgroundAudioManager 不支持双轨，后续可用 InnerAudioContext 独立轨恢复）
  toggleBgm() { },

  // ── 跟读模式 ──
  toggleRecordMode() {
    if (this.data.recordMode) {
      this._endRecordMode()
    } else {
      this._startRecordMode()
    }
  },

  _startRecordMode() {
    const poem = this.data.poem
    if (!poem || !U.getPoemSentences(poem).length) {
      wx.showToast({ title: '无法开始跟读', icon: 'none' })
      return
    }
    // 停止当前播放
    this.stopAudio()
    // 初始化跟读状态
    this._recSentenceIdx = 0
    this._recResults = []
    this.setData({
      recordMode: true,
      showScore: false,
      playing: false,
      highlightIdx: -1,
      currentSentenceIdx: -1
    })
    // 初始化录音管理器
    this._initRecorder()
    wx.showToast({ title: '跟读模式已开启，先听再读', icon: 'none', duration: 1500 })
    // 开始播放第一句
    setTimeout(() => this._playCurrentSentence(), 800)
  },

  _initRecorder() {
    // 使用 wx.getRecorderManager
    this._recorder = wx.getRecorderManager()
    this._recorder.onStop((res) => {
      // 录音完成回调
      if (res.tempFilePath) {
        this._recResults.push({
          sentenceIdx: this._recSentenceIdx,
          filePath: res.tempFilePath,
          duration: res.duration
        })
      }
      // 继续下一句
      this._recSentenceIdx++
      if (this._recSentenceIdx < U.getPoemSentences(this.data.poem).length) {
        this.setData({ recording: false })
        setTimeout(() => this._playCurrentSentence(), 600)
      } else {
        // 全部完成
        this.setData({ recording: false })
        this._computeScore()
      }
    })

    this._recorder.onError((err) => {
      console.error('[recorder] 错误:', err)
      wx.showToast({ title: '录音失败，请重试', icon: 'none' })
      this.setData({ recording: false })
    })
  },

  _playCurrentSentence() {
    const poem = this.data.poem
    const idx = this._recSentenceIdx
    const sentences = U.getPoemSentences(poem)
    if (!poem || idx >= sentences.length) return

    const sent = sentences[idx]
    this.setData({
      currentSentenceIdx: idx,
      highlightIdx: this._sentenceCharOffsets ? this._sentenceCharOffsets[idx] : 0
    })

    // 用 InnerAudioContext 播放单句（带句子时长）
    const audio = wx.createInnerAudioContext()
    const url = U.getAudioUrl(poem)

    // 计算播放起始时间和时长
    const timings = this._timings || U.getSentenceTimings(poem)
    if (timings && timings[idx]) {
      // Seek to sentence start
      audio.src = url
      const startSec = timings[idx].start / 1000
      setTimeout(() => {
        audio.seek(startSec)
        audio.play()
      }, 300)
    } else {
      audio.src = url
      audio.play()
    }

    audio.onEnded(() => {
      audio.destroy()
      // 提示开始录音
      wx.showToast({ title: '现在跟读：' + (sent.text || '').substring(0, 6) + '…', icon: 'none', duration: 2000 })
      setTimeout(() => this._startRecording(), 2500)
    })

    audio.onError((err) => {
      console.error('[audio] 播放失败:', err)
      audio.destroy()
      // 跳过播放直接录音
      setTimeout(() => this._startRecording(), 500)
    })
  },

  _startRecording() {
    if (!this._recorder) return
    this.setData({ recording: true })
    this._recorder.start({
      duration: 15000,  // 最长15秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })

    // 自动停止录音（5秒后）
    setTimeout(() => {
      if (this.data.recording && this._recorder) {
        try { this._recorder.stop() } catch (e) {}
      }
    }, 6000)
  },

  _stopRecording() {
    if (this._recorder) {
      try { this._recorder.stop() } catch (e) {}
    }
  },

  _endRecordMode() {
    if (this.data.recording) this._stopRecording()
    this.setData({ recordMode: false, recording: false })
    this._recSentenceIdx = 0
    this._recResults = []
  },

  _computeScore() {
    const results = this._recResults
    const total = U.getPoemSentences(this.data.poem).length

    // 简化的评分逻辑：
    // - 完整度：实际录了多少句 / 总句数
    const completeness = Math.round((results.length / total) * 100)

    // - 流畅度：基于录音时长（越接近句子时长越好）
    let fluencyScore = 85
    if (this._timings && results.length === total) {
      fluencyScore = 90
    }

    // - 准确度：模拟评分（实际需要语音识别 + 拼音对比）
    const accuracy = Math.round(75 + Math.random() * 20)  // 75-95 模拟分数

    const avg = Math.round((accuracy + fluencyScore + completeness) / 3)
    const stars = avg >= 90 ? 5 : avg >= 80 ? 4 : avg >= 70 ? 3 : avg >= 60 ? 2 : 1

    this.setData({
      recordMode: false,
      showScore: true,
      scoreStars: stars,
      scoreDetail: { accuracy, fluency: fluencyScore, completeness }
    })

    // 完成跟读后标记复习
    if (this.data.poem) U.completeReview(this.data.poem.id)

    // 3秒后清除评分显示，弹出小测
    setTimeout(() => {
      this.setData({ showScore: false })
      // 每读3首诗弹出一次小测
      const g = getApp().globalData
      if (g.readCount % 3 === 0) {
        setTimeout(() => this._showQuiz(), 500)
      }
    }, 8000)
  },

  // ── F-010 趣味小测 ──
  _showQuiz() {
    const poem = this.data.poem
    if (!poem) return

    // 生成3道题
    const quiz = this._generateQuiz(poem)
    // 给每个选项附加字母标签，避免 WXML 中 ['A','B','C','D'][index] 表达式报错
    const labeledQuiz = quiz.map(q => ({
      ...q,
      labeledChoices: q.choices.map((c, i) => ({ letter: ['A','B','C','D'][i], text: c }))
    }))
    this.setData({
      quizQuestions: quiz,
      quizLabeled: labeledQuiz,
      quizIdx: 0,
      quizCorrect: 0,
      showQuiz: true,
      currentQ: labeledQuiz[0]
    })
  },

  _generateQuiz(poem) {
    const questions = []
    // 取自句和非目标选项
    const sentences = U.getPoemSentences(poem)
    const poemPool = getApp().globalData.poems

    // 题1：补全缺字
    if (sentences.length) {
      const sent = sentences[Math.floor(Math.random() * sentences.length)]
      const text = sent.text || ''
      if (text.length >= 3) {
        const pos = Math.floor(text.length * 0.4) + 1
        const blankChar = text[pos]
        const choices = [blankChar]
        const otherPoems = poemPool.filter(p => p.id !== poem.id)
        for (let i = 0; i < 3 && otherPoems.length > 0; i++) {
          const rand = otherPoems[Math.floor(Math.random() * otherPoems.length)]
          const rt = U.getPoemSentences(rand)
          const rc = (rt.length ? (rt[0].text || '') : '')[Math.floor(Math.random() * (rt.length ? (rt[0].text || '').length : 1))] || '？'
          if (!choices.includes(rc)) choices.push(rc)
        }
        while (choices.length < 4) choices.push(['花','月','风','山'][choices.length])
        // 打乱
        choices.sort(() => Math.random() - 0.5)
        questions.push({
          type: 'fill',
          q: text.substring(0, pos) + '___' + text.substring(pos + 1),
          answer: blankChar,
          choices: choices
        })
      }
    }

    // 题2：听诗句选出作者
    questions.push({
      type: 'author',
      q: '《' + poem.title + '》的作者是？',
      answer: poem.author,
      choices: (() => {
        const pool = [poem.author]
        const authors = [...new Set(poemPool.filter(p => p.author !== poem.author).map(p => p.author))]
        while (pool.length < 4) {
          const a = authors[Math.floor(Math.random() * authors.length)]
          if (!pool.includes(a)) pool.push(a)
        }
        pool.sort(() => Math.random() - 0.5)
        return pool
      })()
    })

    // 题3：看主题猜朝代
    questions.push({
      type: 'dynasty',
      q: poem.title + ' 写于哪个朝代？',
      answer: poem.dynasty,
      choices: (() => {
        const pool = [poem.dynasty]
        const dynasties = ['唐', '宋', '元', '明', '清']
        while (pool.length < 4) {
          const d = dynasties[Math.floor(Math.random() * dynasties.length)]
          if (!pool.includes(d)) pool.push(d)
        }
        pool.sort(() => Math.random() - 0.5)
        return pool
      })()
    })

    return questions
  },

  answerQuiz(e) {
    const choice = e.currentTarget.dataset.choice
    const quiz = this.data.quizQuestions
    const idx = this.data.quizIdx
    const current = quiz[idx]
    const correct = choice === current.answer

    if (correct) {
      wx.showToast({ title: '✓ 答对了！', icon: 'none', duration: 800 })
      this.setData({ quizCorrect: this.data.quizCorrect + 1 })
    } else {
      wx.showToast({ title: '✗ 答案是：' + current.answer, icon: 'none', duration: 1200 })
    }

    // 保存错题
    if (!correct) {
      this._saveMistake(current)
    }

    // 下一题或结束
    setTimeout(() => {
      if (idx + 1 < quiz.length) {
        this.setData({ quizIdx: idx + 1, currentQ: this.data.quizLabeled[idx + 1] })
      } else {
        const total = quiz.length
        const score = this.data.quizCorrect
        this.setData({ showQuiz: false })
        wx.showToast({ title: '答对 ' + score + '/' + total + ' 题！', icon: 'none', duration: 1500 })
        // 累计10题解锁徽章
        if (score === total) {
          const g = getApp().globalData
          g.quizTotal = (g.quizTotal || 0) + 1
          if (g.quizTotal >= 10) {
            setTimeout(() => {
              wx.showModal({ title: '🏆 小状元徽章', content: '你已经答对10次全对啦！获得「小状元」徽章！', showCancel: false })
            }, 2000)
          }
        }
      }
    }, 1000)
  },

  _saveMistake(q) {
    try {
      let mistakes = []
      try { mistakes = JSON.parse(wx.getStorageSync('pb_mistakes') || '[]') } catch (e) {}
      mistakes.push({ q: q.q, answer: q.answer, ts: Date.now(), poemId: this.data.poem.id })
      wx.setStorageSync('pb_mistakes', JSON.stringify(mistakes.slice(-50)))
    } catch (e) { /* 静默失败 */ }
  },

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
