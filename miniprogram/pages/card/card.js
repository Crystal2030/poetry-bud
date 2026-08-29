const U = require('../../utils/store')

// ── 画布参数（2x 高清，iPhone 基准 rpx×2 → canvas px）──
const SCALE = 2
const CW = 520              // 卡片宽
const CH = 860              // 卡片高（pic 640 + info 160 + foot 60）
const PIC_H = 640           // 图片区高
const RADIUS = 40           // 卡片圆角

// ── 诗词竖排绘制参数（对应 poem-vertical "md" 尺寸 × SCALE）──
const TITLE_SIZE  = 40      // rpx
const CHAR_SIZE   = 28
const AUTHOR_SIZE = 24
const COL_GAP_T   = 7       // 标题列左间距（flex row-reverse）
const COL_GAP_A   = 5       // 作者列左间距
const COL_GAP_L   = 8       // 诗句列左间距
const LINE_H_RATIO = 1.25   // 竖排字符行高倍率

// ── 诗歌区域定位（sc-poem: top:24rpx, right:24rpx, padding 20/24/20/28）──
const POEM_TOP  = 48        // 24*2
const POEM_RIGHT = 48
const POEM_PAD_T = 40       // 20*2
const POEM_PAD_R = 48       // 24*2
const POEM_PAD_B = 40
const POEM_PAD_L = 56       // 28*2

// ── 竖排文字颜色：Canvas2D 无 text-shadow，使用深色 ink 适配书卷暖纸底色 ─��
const POEM_TEXT_COLOR = '#2C2A26'
const POEM_TEXT_SHADOW = 'rgba(0,0,0,0.18)'  // 模拟 CSS text-shadow

Page({
  data: {
    poem: null,
    poemBg: '',
    qrUrl: '',
    qrFail: false,
    waveHeights: [],
    canvasStyleW: CW / SCALE,
    canvasStyleH: CH / SCALE,
    saving: false
  },

  _canvasNode: null, // 缓存 Canvas2D 节点

  onLoad(options) {
    const id = options.id
    const p = getApp().globalData.poems.find(p => p.id === id)
    if (!p) return
    const heights = []
    for (let i = 0; i < 15; i++) heights.push(Math.floor(10 + Math.random() * 34))
    this.setData({
      poem: p,
      poemBg: U.getPoemBg(p, 'full'),
      qrUrl: U.getQrUrl(p.id),
      waveHeights: heights
    })
  },

  goBack() { wx.navigateBack() },

  // 预览卡片二维码加载失败 → 回退嫩芽占位（避免空白/破碎图）
  onQrError() {
    this.setData({ qrFail: true })
  },

  // ─── 核心：Canvas2D 绘制卡片 → 保存到相册 ───
  async saveCard() {
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '生成卡片中…', mask: true })

    try {
      const canvas = await this._getCanvas()
      const ctx = canvas.getContext('2d')
      const bgImg = await this._loadImage(canvas, this.data.poemBg)
      const poem = this.data.poem
      const qrImg = await this._getQrImage(canvas, poem.id)

      // 使用统一绘制方法（修复 Bug#3：消除重复代码）
      this._drawFullCard(ctx, bgImg, poem, qrImg)

      // 导出 → 保存
      const tempPath = await this._canvasToTemp(canvas)
      await this._saveToAlbum(tempPath)

    } catch (e) {
      console.error('saveCard error:', e)
      // 用户主动取消权限弹窗等场景不弹错误提示
      if (e.message && e.message !== '用户取消') {
        wx.showToast({ title: e.message, icon: 'none' })
      }
    } finally {
      this.setData({ saving: false })
      wx.hideLoading()
    }
  },

  // ─── 竖排诗词绘制 ───
  _drawVerticalPoem(ctx, poem, rightX, topY) {
    const sentences = U.getPoemSentences(poem)
    if (!sentences.length) sentences.push({ text: '暂无' })

    const titleChars = (poem.title || '').split('')
    const authorStr = (poem.dynasty || '') + '·' + (poem.author || '')
    const authorChars = authorStr.split('')
    const colChars = []  // [{ chars, size, bold }]

    // 标题列
    if (titleChars.length) {
      colChars.push({ chars: titleChars, size: TITLE_SIZE, bold: true })
    }
    // 作者列
    if (authorChars.length) {
      colChars.push({ chars: authorChars, size: AUTHOR_SIZE, bold: false })
    }
    // 诗句列
    sentences.forEach(s => {
      const chars = s.text ? s.text.split('') : []
      if (chars.length) {
        colChars.push({ chars, size: CHAR_SIZE, bold: false })
      }
    })

    // 从右到左绘制各列
    let curX = rightX
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    colChars.forEach(col => {
      const fontSize = col.size
      const lineH = Math.round(fontSize * LINE_H_RATIO)
      const colW = fontSize  // 列宽约等于字号
      curX -= colW

      // 修复 Bug#1：使用深色 ink #2C2A26 替代白色 #FFFEF9
      // Canvas2D 不支持 CSS text-shadow，通过先画 shadow 层再画文字层模拟
      ctx.font = (col.bold ? 'bold ' : '') + fontSize + 'px "STKaiti","Kaiti SC",serif'

      col.chars.forEach((ch, i) => {
        const cx = curX + colW / 2   // 字符中心 X
        const cy = topY + i * lineH  // 字符顶部 Y

        // 阴影层：偏移 2px，半透明黑色
        ctx.fillStyle = POEM_TEXT_SHADOW
        ctx.fillText(ch, cx + 2, cy + 2)

        // 文字层：深色 ink
        ctx.fillStyle = POEM_TEXT_COLOR
        ctx.fillText(ch, cx, cy)
      })

      // 左移间距（标题 / 作者 / 诗句列间距不同）
      if (col.bold) curX -= COL_GAP_T
      else if (col.size === AUTHOR_SIZE) curX -= COL_GAP_A
      else curX -= COL_GAP_L
    })
  },

  // ─── 分享卡片（生成图片 → 触发分享） ───
  async shareCard() {
    // 修复 Bug#4：添加 saving 标志防重复点击
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '生成分享图…', mask: true })

    try {
      const canvas = await this._getCanvas()
      const ctx = canvas.getContext('2d')
      const bgImg = await this._loadImage(canvas, this.data.poemBg)
      const poem = this.data.poem
      const qrImg = await this._getQrImage(canvas, poem.id)

      this._drawFullCard(ctx, bgImg, poem, qrImg)
      const tempPath = await this._canvasToTemp(canvas)
      wx.hideLoading()

      // 基础库 2.14.3+ 支持直接分享图片
      if (wx.showShareImageMenu) {
        wx.showShareImageMenu({
          path: tempPath,
          fail: () => {
            // 降级到预览模式
            wx.previewImage({ urls: [tempPath] })
          }
        })
      } else {
        wx.previewImage({ urls: [tempPath] })
      }
    } catch (e) {
      console.error('shareCard error:', e)
      wx.hideLoading()
      wx.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      // 修复 Bug#4：重置 saving 标志
      this.setData({ saving: false })
    }
  },

  // ─── 打印提示 ───
  async printCard() {
    // 修复 Bug#4：添加 saving 标志防重复点击
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '准备打印稿…', mask: true })

    try {
      const canvas = await this._getCanvas()
      const ctx = canvas.getContext('2d')
      const bgImg = await this._loadImage(canvas, this.data.poemBg)
      const poem = this.data.poem
      const qrImg = await this._getQrImage(canvas, poem.id)

      this._drawFullCard(ctx, bgImg, poem, qrImg)
      const tempPath = await this._canvasToTemp(canvas)
      wx.hideLoading()

      wx.previewImage({
        urls: [tempPath],
        success: () => {
          setTimeout(() => {
            wx.showToast({
              title: '可长按保存或截图打印',
              icon: 'none',
              duration: 2500
            })
          }, 300)
        }
      })
    } catch (e) {
      console.error('printCard error:', e)
      wx.hideLoading()
      wx.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      // 修复 Bug#4：重置 saving 标志
      this.setData({ saving: false })
    }
  },

  // ─── 完整卡片绘制（saveCard / shareCard / printCard 共用） ───
  _drawFullCard(ctx, bgImg, poem, qrImg) {
    // 0) 清除画布，避免复用 Canvas 节点时残留上次绘制内容
    ctx.clearRect(0, 0, CW, CH)

    // 1) 卡片底色 + 圆角裁剪区
    ctx.fillStyle = '#FFFEF9'
    this._roundRect(ctx, 0, 0, CW, CH, RADIUS)
    ctx.fill()
    ctx.save()
    this._roundRect(ctx, 0, 0, CW, CH, RADIUS)
    ctx.clip()

    // 2) 上半部分：背景图
    ctx.drawImage(bgImg, 0, 0, CW, PIC_H)

    // 3) 书卷衬底（poem 区域）
    const poemW = CW - POEM_RIGHT - POEM_PAD_L - POEM_PAD_R
    const poemH = PIC_H - POEM_TOP - POEM_PAD_T - POEM_PAD_B
    ctx.fillStyle = 'rgba(245,235,218,0.78)'
    this._roundRect(ctx, POEM_PAD_L, POEM_TOP + POEM_PAD_T, poemW, poemH, 16)
    ctx.fill()
    // 金色卷轴端头
    const barW = 10
    ctx.fillStyle = '#C9A24B'
    this._roundRect(ctx, POEM_PAD_L - barW / 2, POEM_TOP + POEM_PAD_T + 20, barW, poemH - 40, 5)
    ctx.fill()
    this._roundRect(ctx, POEM_PAD_L + poemW - barW / 2, POEM_TOP + POEM_PAD_T + 20, barW, poemH - 40, 5)
    ctx.fill()

    // 4) 竖排诗句（从右到左）
    this._drawVerticalPoem(ctx, poem, CW - POEM_RIGHT - POEM_PAD_R, POEM_TOP + POEM_PAD_T + 16)

    // 5) 下半部分：信息区
    ctx.restore() // 退出卡片圆角裁剪
    const infoY = PIC_H
    ctx.fillStyle = '#FFFEF9'
    ctx.fillRect(0, infoY, CW, CH - infoY)

    // 标题
    ctx.fillStyle = '#2C2A26'
    ctx.font = 'bold 28px "STKaiti","Kaiti SC",serif'
    ctx.fillText('《' + (poem.title || '') + '》', 32, infoY + 38)

    // 作者 / 朝代
    ctx.fillStyle = 'rgba(44,42,38,0.65)'
    ctx.font = '22px "STKaiti","Kaiti SC",serif'
    ctx.fillText((poem.dynasty || '') + ' · ' + (poem.author || ''), 32, infoY + 68)

    // 波形条（缩短宽度，给右下角二维码留空间）
    const waves = this.data.waveHeights
    const waveY = infoY + 90
    const QR_SIZE = 96                     // 二维码边长（占位/真码统一）
    const QR_X = CW - 32 - QR_SIZE         // 二维码左上角 X
    const QR_Y = infoY + 40                // 二维码左上角 Y
    const waveW = QR_X - 32 - 16           // 波形条右侧止于二维码左侧
    const barW2 = waveW / waves.length
    waves.forEach((h, i) => {
      ctx.fillStyle = 'rgba(193,67,67,0.75)'
      ctx.fillRect(32 + i * barW2, waveY + 44 - h * 1.4, barW2 - 4, h * 1.4)
    })

    // 右下角二维码（真码优先，无真码时画占位码）
    if (qrImg) {
      ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE)
    } else {
      this._drawPlaceholderQr(ctx, QR_X, QR_Y, QR_SIZE, (poem.id || 'poem'))
    }
    // 二维码下方提示文字
    ctx.fillStyle = 'rgba(44,42,38,0.55)'
    ctx.font = '15px "PingFang SC",sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('扫码听诗', QR_X + QR_SIZE / 2, QR_Y + QR_SIZE + 18)
    ctx.textAlign = 'left'

    // 底部品牌标记
    ctx.fillStyle = 'rgba(44,42,38,0.4)'
    ctx.font = '16px "PingFang SC",sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('诗芽 · 一诗一景', CW - 32, CH - 20)
    ctx.textAlign = 'left'
  },

  // ─── 工具方法 ───

  /** 获取 Canvas2D 节点（缓存 + 重试） */
  _getCanvas(retryCount = 0) {
    if (this._canvasNode) return Promise.resolve(this._canvasNode)
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#cardCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const info = res && res[0]
          if (!info || !info.node) {
            // 首次查询可能因 Canvas 尚未挂载而失败，延迟 200ms 重试一次
            if (retryCount === 0) {
              console.warn('[card] _getCanvas 首次查询失败，200ms 后重试…', info)
              setTimeout(() => {
                this._getCanvas(1).then(resolve).catch(reject)
              }, 200)
              return
            }
            return reject(new Error('获取 Canvas 失败'))
          }
          const node = info.node
          // 设置 Canvas 像素尺寸（2x 高清）
          node.width = CW
          node.height = CH
          this._canvasNode = node
          resolve(node)
        })
    })
  },

  /**
   * 加载远程图片（带超时保护）
   * 修复 Bug#5：接受 canvas 节点参数，避免冗余调用 _getCanvas()
   * 修复 Bug#7：添加超时防止 onload/onerror 永不触发导致 Promise 挂起
   */
  _loadImage(canvas, src) {
    return new Promise((resolve, reject) => {
      if (!src) return reject(new Error('背景图片地址为空'))
      const TIMEOUT = 12000 // 12s 超时
      let settled = false

      const timeout = setTimeout(() => {
        if (settled) return
        settled = true
        console.error('[card] 图片加载超时:', src)
        reject(new Error('背景图片加载超时'))
      }, TIMEOUT)

      const img = canvas.createImage()
      img.onload = () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        resolve(img)
      }
      img.onerror = (err) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        console.error('[card] 图片加载失败:', src, err)
        reject(new Error('背景图片加载失败'))
      }
      img.src = src
    })
  },

  /**
   * 获取诗词对应的小程序码图片（Canvas image）
   * 优先加载 CDN 静态真码（scene=id=诗id 已烧录）；CDN 失败 → 云函数动态生成；
   * 都失败 → 返回 null（降级占位码）。结果按 poemId 缓存，避免重复请求
   */
  async _getQrImage(canvas, poemId) {
    if (!poemId) return null
    if (this._qrCache && this._qrCache[poemId] !== undefined) return this._qrCache[poemId]

    // 1. 优先 CDN 静态小程序码（扫码直达详情页）
    const qrUrl = U.getQrUrl(poemId)
    if (qrUrl) {
      try {
        const img = await this._loadImage(canvas, qrUrl)
        this._qrCache = this._qrCache || {}
        this._qrCache[poemId] = img
        return img
      } catch (e) {
        console.warn('[card] CDN 小程序码加载失败，尝试云函数:', e)
      }
    }

    // 2. 降级：云函数动态生成（需开通云开发 + 部署 getWxaCode）
    const app = getApp()
    const cloudReady = app && app.globalData && app.globalData.cloudReady
    if (cloudReady && wx.cloud) {
      try {
        const res = await wx.cloud.callFunction({ name: 'getWxaCode', data: { poemId } })
        const r = res && res.result
        if (r && r.code === 0 && r.base64) {
          const img = await this._loadImageFromBase64(r.base64)
          this._qrCache = this._qrCache || {}
          this._qrCache[poemId] = img
          return img
        }
        console.warn('[card] 云函数生成失败，降级占位码:', r && r.msg)
      } catch (e) {
        console.warn('[card] 云函数调用失败，降级占位码:', e)
      }
    }

    return null
  },

  /**
   * base64 data URL → Canvas image（用于小程序码）
   */
  _loadImageFromBase64(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = wx.createImage ? wx.createImage() : null
      if (!img) return reject(new Error('当前环境不支持 createImage'))
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(new Error('小程序码图片解码失败'))
      img.src = dataUrl
    })
  },

  /**
   * 绘制占位二维码（视觉占位，扫码无效）
   * 真码接入后（云函数部署 + 配置 AppSecret）会被 _getQrImage 返回的真码替换
   * seed 保证同一首诗占位码图案一致
   */
  _drawPlaceholderQr(ctx, x, y, size, seed) {
    // 白底圆角
    ctx.fillStyle = '#FFFFFF'
    this._roundRect(ctx, x, y, size, size, 12)
    ctx.fill()

    // 伪随机数（seed 决定图案）
    let s = 0
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }

    const N = 21               // 21x21 模块
    const cell = size / N
    ctx.fillStyle = '#1F1F1F'

    // 数据区随机格子（避开三个定位角）
    const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7)
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (inFinder(r, c)) continue
        if (rand() < 0.48) {
          ctx.fillRect(x + c * cell, y + r * cell, cell, cell)
        }
      }
    }

    // 三个定位角（回字形）
    const drawFinder = (fx, fy) => {
      ctx.fillStyle = '#1F1F1F'
      ctx.fillRect(fx, fy, cell * 7, cell * 7)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(fx + cell, fy + cell, cell * 5, cell * 5)
      ctx.fillStyle = '#1F1F1F'
      ctx.fillRect(fx + cell * 2, fy + cell * 2, cell * 3, cell * 3)
    }
    drawFinder(x, y)                              // 左上
    drawFinder(x + (N - 7) * cell, y)             // 右上
    drawFinder(x, y + (N - 7) * cell)             // 左下

    // 中心 logo：小圆 + 「诗」字
    const cx = x + size / 2, cy = y + size / 2
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(cx - cell * 2.5, cy - cell * 2.5, cell * 5, cell * 5)
    ctx.fillStyle = '#B85A3E'
    ctx.beginPath()
    ctx.arc(cx, cy, cell * 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFEF9'
    ctx.font = 'bold ' + Math.round(cell * 2.6) + 'px "STKaiti","Kaiti SC",serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('诗', cx, cy + 1)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  },

  /**
   * Canvas → 临时文件
   * 修复 Bug#6：reject 时封装可读的错误消息
   */
  _canvasToTemp(canvas) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        x: 0,
        y: 0,
        width: CW,
        height: CH,
        destWidth: CW,
        destHeight: CH,
        fileType: 'png',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => {
          console.error('canvasToTempFilePath fail:', err)
          reject(new Error('图片生成失败'))
        }
      })
    })
  },

  /**
   * 保存到相册（含权限检查和处理）
   * 修复 Bug#2：权限被拒时正确 reject Promise，避免 saveCard 永久挂起
   */
  _saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      // 执行实际保存操作
      const doSave = () => {
        wx.saveImageToPhotosAlbum({
          filePath,
          success: () => {
            wx.showToast({ title: '已保存到相册', icon: 'success' })
            resolve()
          },
          fail: (err) => {
            console.error('saveImageToPhotosAlbum fail:', err)
            const errMsg = err.errMsg || ''
            if (errMsg.indexOf('auth deny') !== -1 || errMsg.indexOf('auth denied') !== -1) {
              // 权限被拒：弹窗引导去设置
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许小程序访问相册，以便保存诗词卡片',
                confirmText: '去设置',
                success: (m) => {
                  if (m.confirm) {
                    wx.openSetting({
                      success: () => {
                        // 用户从设置返回后，需要重新保存（权限可能已变更）
                      }
                    })
                  }
                }
              })
              // 修复 Bug#2：权限被拒时必须 reject，否则 Promise 永久挂起
              reject(new Error('用户取消'))
            } else if (errMsg.indexOf('cancel') !== -1) {
              // 用户在系统授权弹窗点了取消
              reject(new Error('用户取消'))
            } else {
              reject(new Error('保存到相册失败'))
            }
          }
        })
      }

      // 先检查当前授权状态
      wx.getSetting({
        success: (s) => {
          const granted = s.authSetting['scope.writePhotosAlbum']
          if (granted === false) {
            // 用户之前明确拒绝了权限，弹窗引导去设置
            // 修复 Bug#2：弹窗后 reject Promise
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许小程序访问相册，以便保存诗词卡片',
              confirmText: '去设置',
              success: (m) => {
                if (m.confirm) {
                  wx.openSetting({
                    success: () => {
                      // 从设置返回，用户需重新点击保存
                    }
                  })
                }
              }
            })
            reject(new Error('用户取消'))
          } else {
            // 未授权或已授权，尝试保存（首次会触发系统授权弹窗）
            doSave()
          }
        },
        fail: () => {
          // getSetting 失败时仍然尝试保存（首次使用时会触发系统授权）
          doSave()
        }
      })
    })
  },

  /** 裁剪圆角矩形路径 */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }
})
