const U = require('../../utils/store')

// ── 画布参数（2x 高清，iPhone 基准 rpx×2 → canvas px）──
const SCALE = 2
const CW = 520              // 卡片宽（内坐标系，宽与导出图 destWidth 一致）
// CH 由 PIC_H 动态推算（PIC_H + INFO_H + FOOT_H）
// PIC_H 由 _calcLayout() 根据诗词最长列字符数动态计算
const INFO_H = 160          // 信息区高（设计 px）
const FOOT_H = 60           // 底部脚注高（设计 px）
const RADIUS = 40           // 卡片圆角

// ── 诗词竖排绘制参数（对应 poem-vertical "md" 尺寸 × SCALE）──
const TITLE_SIZE  = 40      // rpx
const CHAR_SIZE   = 28
const AUTHOR_SIZE = 24
const COL_GAP_T   = 7       // 标题列左间距（flex row-reverse）
const COL_GAP_A   = 5       // 作者列左间距
const COL_GAP_L   = 8       // 诗句列左间距
const LINE_H_RATIO = 1.4    // 竖排字符行高倍率（与 poem-vertical.wxss line-height:1.4 保持一致）

// ── 卷轴布局常量（wxml rpx 值为准；canvas 内统一 × SCALE 转换）──
// .sc-pic 上下 padding:24rpx
const PIC_PAD_T_R   = 24
const PIC_PAD_B_R   = 24
// .sc-poem padding: 20 32 20 28 rpx（右边距加大，避免诗句贴死卷轴右边）
const POEM_PAD_T_R  = 20
const POEM_PAD_R_R  = 32
const POEM_PAD_B_R  = 20
const POEM_PAD_L_R  = 28
// .sc-poem top:24rpx / right:24rpx
const POEM_TOP_R    = 24
const POEM_RIGHT_R  = 24

// ── 自适应高度区间（rpx）──
const MIN_PIC_H_R    = 460
const MAX_PIC_H_R    = 760
const SCENE_SPACER_R = 180

// ── 竖排文字颜色：Canvas2D 无 text-shadow，使用深色 ink 适配书卷暖纸底色 ─��
const POEM_TEXT_COLOR   = '#1F1B16'                              // 深墨色
const POEM_TEXT_HALO    = 'rgba(255, 248, 232, 0.85)'             // 暖白纸色光晕（描边）
const POEM_TEXT_HALO_DX = 2                                       // 光晕描边宽（屏物理 px）

Page({
  data: {
    poem: null,
    poemBg: '',       // 预览层背景图（medium，加载快）
    drawBg: '',       // canvas 绘制层背景图（medium，与预览一致，加载快）
    qrUrl: '',
    qrFail: false,
    waveHeights: [],
    // 自适应诗词区域尺寸（rpx 单位，wxml 与 _drawFullCard 共用同一来源）
    picH: MIN_PIC_H_R,         // .sc-pic 高度（onLoad 时按诗重算）
    poemH: 240,                 // .sc-poem 高度（onLoad 时按诗重算）
    canvasStyleW: CW / SCALE,
    canvasStyleH: 800,          // 初始估值；onLoad 按 PIC_H + INFO_H + FOOT_H × SCALE 重算
    backBtnTop: 0,              // 返回按钮 top（px），onLoad 时按胶囊位置动态计算
    saving: false
  },

  _canvasNode: null, // 缓存 Canvas2D 节点

  onLoad(options) {
    const id = options.id
    const p = getApp().globalData.poems.find(p => p.id === id)
    if (!p) return
    const heights = []
    for (let i = 0; i < 15; i++) heights.push(Math.floor(10 + Math.random() * 34))

    // 诗词竖排所需高度（与 wxml 行内样式共用同一组 rpx 值）
    const layout = this._calcLayout(p)
    // canvasStyleH = canvas DOM CSS 高 (px) = (picH + INFO + FOOT) / SCALE
    const canvasH = (layout.picH + INFO_H + FOOT_H) / SCALE

    // 返回按钮位置：与右上角「胶囊」垂直居中对齐（真机 iOS 状态栏更高，硬编码 100rpx 会下挤）
    // 基础库 2.13.0+ 提供 getMenuButtonBoundingClientRect，旧版无此 API 时保持默认值 0
    let backBtnTop = 0
    try {
      const rect = wx.getMenuButtonBoundingClientRect()
      if (rect && rect.height) {
        const backH = 34 // 68rpx / 2 = 34px
        backBtnTop = Math.round((rect.top + rect.bottom) / 2 - backH / 2)
      }
    } catch (e) { /* 旧基础库无此 API，back-btn 默认 top:0 */ }

    // 背景图用 medium（800x540 jpg ≈186KB）替代 full PNG（1264x848 ≈2MB），加载提速 10 倍
    // 预览层与 canvas 绘制层共用 medium，保证所见即所得
    this.setData({
      poem: p,
      poemBg: U.getPoemBg(p, 'medium'),
      drawBg: U.getPoemBg(p, 'medium'),
      qrUrl: U.getQrUrl(p.id),
      waveHeights: heights,
      picH: layout.picH,
      poemH: layout.poemH,
      canvasStyleH: canvasH,
      backBtnTop
    })
    // 提前缓存 layout，省去 _drawFullCard 内重算
    this._layout = layout
  },

  goBack() { wx.navigateBack() },

  // 预览卡片二维码加载失败 → 回退嫩芽占位（避免空白/破碎图）
  onQrError() {
    this.setData({ qrFail: true })
  },

  // 预览层背景图加载失败 → 按 CDN 节点顺序降级重试
  onBgError() {
    const next = U.nextBgFallback(this.data.poem, this.data.poemBg)
    if (next && next !== this.data.poemBg) {
      this.setData({ poemBg: next })
    }
  },

  /**
   * 计算诗词区域自适应布局（与 canvas _drawFullCard 共用同一规则）
   * 返回 picH/poemH/contentH（rpx 单位），供 wxml 行内样式与 canvas 节点共用
   *
   * 思路：竖排诗词整体高度 = 最长一列的字数 × 字号 × 行高。
   * 短诗（4-5 字）撑不起容器，加 SCENE_SPACER_R 给背景图留氛围；
   * 长诗（>=7 字）限制 PIC_H 上限，避免撑爆整张卡片。
   */
  _calcLayout(poem) {
    // 统计字符数（剔除标点与空白；标点只用作分句边界）
    const PUNCT = '，。？！；、：,!?;:\n\r '
    const countChars = s => {
      const cs = (s || '').split('').filter(c => PUNCT.indexOf(c) === -1)
      return cs.length
    }

    // 取标题列、作者列、各句子列中最长的一列
    let maxChars = 0
    maxChars = Math.max(maxChars, countChars(poem.title || ''))
    maxChars = Math.max(maxChars, countChars(((poem.dynasty || '') + '·' + (poem.author || ''))))
    const sentences = U.getPoemSentences(poem) || []
    sentences.forEach(s => {
      const n = countChars(s.text || '')
      if (n > maxChars) maxChars = n
    })
    // 极端数据兜底：古诗最长句不超过 14 字（"夜泊牛渚怀古"等长律），cap 16 留余量
    maxChars = Math.max(4, Math.min(16, maxChars))

    // 竖排内容高度：用 TITLE_SIZE 保底（最长列字号可能更小，但撑出最大空间避免字符贴底）
    const contentH = maxChars * TITLE_SIZE * LINE_H_RATIO
    // 诗容器高度（内容 + 上下 padding）
    const poemH = contentH + POEM_PAD_T_R + POEM_PAD_B_R
    // 图片框高度（容器 + 上下留白 + 场景留白）
    let picH = PIC_PAD_T_R + poemH + PIC_PAD_B_R + SCENE_SPACER_R
    // 区间兜底
    picH = Math.max(MIN_PIC_H_R, Math.min(MAX_PIC_H_R, picH))

    return {
      picH,           // rpx 高度（wxml 行内 style 与 canvas PIC_H 共用）
      poemH,          // rpx 高度（wxml 行内 style 共用）
      maxChars,       // 最长列字符数（调试用）
      contentH        // 诗内容高度（rpx，不含 padding），canvas 绘制诗词时用
    }
  },

  // ─── 核心：Canvas2D 绘制卡片 → 保存到相册 ───
  async saveCard() {
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '生成卡片中…', mask: true })

    try {
      const canvas = await this._getCanvas()
      const ctx = canvas.getContext('2d')
      const poem = this.data.poem
      const bgImg = await this._loadBgImage(canvas, poem)
      const qrImg = await this._getQrImage(canvas, poem.id)

      // 使用统一绘制方法（修复 Bug#3：消除重复代码）
      this._drawFullCard(ctx, bgImg, poem, qrImg, this._layout || this._calcLayout(poem))

      // 导出 → 保存
      const tempPath = await this._canvasToTemp(canvas)
      await this._saveToAlbum(tempPath)

    } catch (e) {
      console.error('saveCard error:', e)
      // 用户主动取消权限弹窗等场景不弹错误提示；其余失败给出明确原因
      const msg = (e && e.message) || '保存失败，请重试'
      if (msg !== '用户取消') {
        wx.showToast({ title: msg, icon: 'none', duration: 2500 })
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

      // 字体栈：先 Kaiti 系列（macOS/iOS 系统自带），再思源宋体（Android 衬线），
      // 去掉 PingFang SC / Microsoft YaHei 等黑体兜底，避免 Android 落到无衬线观感
      ctx.font = (col.bold ? 'bold ' : '') + fontSize + 'px "STKaiti","Kaiti SC","Kaiti","BiauKai","KaiTi","Songti SC","STSong","FangSong","STFangsong","SimSun","Noto Serif SC","Source Han Serif SC","Noto Serif CJK SC",serif'

      // Canvas2D 无 text-shadow；用「八方向浅色描边 + 深色字」模拟书卷压印效果
      // 描边方向：上下左右 + 四对角，共 8 个偏移
      const D = POEM_TEXT_HALO_DX
      const haloOffsets = [
        [ D, 0], [-D, 0], [0,  D], [0, -D],
        [ D,  D], [ D, -D], [-D,  D], [-D, -D]
      ]

      col.chars.forEach((ch, i) => {
        const cx = curX + colW / 2   // 字符中心 X
        const cy = topY + i * lineH  // 字符顶部 Y

        // 第一层：浅色光晕描边（八方向）
        ctx.fillStyle = POEM_TEXT_HALO
        for (let k = 0; k < haloOffsets.length; k++) {
          ctx.fillText(ch, cx + haloOffsets[k][0], cy + haloOffsets[k][1])
        }

        // 第二层：深墨色字
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
      const poem = this.data.poem
      const bgImg = await this._loadBgImage(canvas, poem)
      const qrImg = await this._getQrImage(canvas, poem.id)

      this._drawFullCard(ctx, bgImg, poem, qrImg, this._layout || this._calcLayout(poem))
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
      wx.showToast({ title: '生成失败：' + ((e && e.message) || '请重试'), icon: 'none', duration: 2500 })
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
      const poem = this.data.poem
      const bgImg = await this._loadBgImage(canvas, poem)
      const qrImg = await this._getQrImage(canvas, poem.id)

      this._drawFullCard(ctx, bgImg, poem, qrImg, this._layout || this._calcLayout(poem))
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
      wx.showToast({ title: '生成失败：' + ((e && e.message) || '请重试'), icon: 'none', duration: 2500 })
    } finally {
      // 修复 Bug#4：重置 saving 标志
      this.setData({ saving: false })
    }
  },

  // ─── 完整卡片绘制（saveCard / shareCard / printCard 共用） ───
  _drawFullCard(ctx, bgImg, poem, qrImg, layout) {
    // ─── canvas 坐标系 = 设计 rpx = iPhone 屏物理像素（rpx 1 = 屏物理 1）───
    // 之前这里全部 ×SCALE=2、CW=520 不×SCALE，导致导出 PNG 高=屏高×2。
    // 全部用设计 rpx 单位后，导出 PNG 比例与屏幕卡片比例一致（≈1:1.4）。
    const PIC_H  = layout.picH                       // 图片区高度（设计 rpx）
    const POEM_X = POEM_PAD_L_R                      // 卷轴背景左边
    const POEM_Y = POEM_TOP_R + POEM_PAD_T_R         // 卷轴背景顶
    const POEM_W = CW - POEM_RIGHT_R - POEM_PAD_L_R - POEM_PAD_R_R   // 卷轴背景宽
    const POEM_H = layout.contentH + POEM_PAD_T_R + POEM_PAD_B_R   // 卷轴背景高（诗内容 + padding）
    const POEM_TEXT_TOP    = POEM_TOP_R + POEM_PAD_T_R + 16         // 诗词起始 Y（给点小偏移）
    // 诗句最右列右边缘：卷轴衬底右边界向内收一个右边 padding，
    // 与预览层 .sc-poem { padding-right: 24rpx } 对齐，避免诗句贴死卷轴右边
    const POEM_SCROLL_RIGHT = POEM_X + POEM_W                        // 卷轴衬底右边界
    const POEM_TEXT_RIGHT_X = POEM_SCROLL_RIGHT - POEM_PAD_R_R       // 诗词最右列 X（距卷轴右边留间距）

    // 卡片总高（设计 rpx）
    const CH = PIC_H + INFO_H + FOOT_H

    // 0) 清除画布，避免复用 Canvas 节点时残留上次绘制内容
    ctx.clearRect(0, 0, CW, CH)

    // 1) 卡片底色 + 圆角裁剪区
    ctx.fillStyle = '#FFFEF9'
    this._roundRect(ctx, 0, 0, CW, CH, RADIUS)
    ctx.fill()
    ctx.save()
    this._roundRect(ctx, 0, 0, CW, CH, RADIUS)
    ctx.clip()

    // 2) 上半部分：背景图（顶对齐，留氛围空间）
    ctx.drawImage(bgImg, 0, 0, CW, PIC_H)

    // 3) 书卷衬底（poem 区域）
    ctx.fillStyle = 'rgba(245,235,218,0.78)'
    this._roundRect(ctx, POEM_X, POEM_Y, POEM_W, POEM_H, 16)
    ctx.fill()
    // 金色卷轴端头（顶部向下 20，底部向上 20，单位设计 px）
    const barW = 10
    const BAR_INSET = 20
    ctx.fillStyle = '#C9A24B'
    this._roundRect(ctx, POEM_X - barW / 2, POEM_Y + BAR_INSET, barW, POEM_H - BAR_INSET * 2, 5)
    ctx.fill()
    this._roundRect(ctx, POEM_X + POEM_W - barW / 2, POEM_Y + BAR_INSET, barW, POEM_H - BAR_INSET * 2, 5)
    ctx.fill()

    // 4) 竖排诗句（从右到左）
    this._drawVerticalPoem(ctx, poem, POEM_TEXT_RIGHT_X, POEM_TEXT_TOP)

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
          // 设置 Canvas backing store 像素：宽固定 CW，高度按诗词布局动态算（与 _drawFullCard 同坐标系 = 设计 rpx）
          const layout = this._layout || { picH: MIN_PIC_H_R }
          const CH = layout.picH + INFO_H + FOOT_H
          node.width = CW
          node.height = CH
          this._canvasNode = node
          resolve(node)
        })
    })
  },

  /**
   * 加载卡片背景图（带 CDN 节点降级重试）
   * 起始用 medium（快）；失败按 nextBgFallback 依次换节点 → 升 full PNG，最多 4 次尝试
   */
  async _loadBgImage(canvas, poem) {
    let url = this.data.drawBg
    const tried = []
    while (url && tried.indexOf(url) === -1 && tried.length < 4) {
      tried.push(url)
      try {
        return await this._loadImage(canvas, url)
      } catch (e) {
        console.warn('[card] 背景图加载失败，降级重试:', url)
        url = U.nextBgFallback(poem, url)
      }
    }
    throw new Error('背景图加载失败')
  },

  /**
   * 加载远程图片（带超时保护）
   * 修复 Bug#5：接受 canvas 节点参数，避免冗余调用 _getCanvas()
   * 修复 Bug#7：添加超时防止 onload/onerror 永不触发导致 Promise 挂起
   */
  _loadImage(canvas, src) {
    return new Promise((resolve, reject) => {
      if (!src) return reject(new Error('背景图片地址为空'))
      const TIMEOUT = 8000 // 8s 超时（medium 图小，8s 足够，减少降级等待）
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
      // 高度按诗词布局动态算（导出 PNG 与屏幕卡片同比例 1:1.42，不再 ×2 拉长）
      const layout = this._layout || { picH: MIN_PIC_H_R }
      const CH = layout.picH + INFO_H + FOOT_H
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
