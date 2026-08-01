Component({
  properties: {
    poem: { type: Object, value: { title: '', paragraphs: [] } },
    size: { type: String, value: 'md' },
    mode: { type: String, value: 'light' },
    highlightIdx: { type: Number, value: -1 },
    showPinyin: { type: Boolean, value: false }
  },

  observers: {
    'size'(val) { this.updateSizes(val) },
    'poem'(val) {
      this.computeTitleAuthor(val)
      this.computeLines()
      this.markHighlight()
    },
    'highlightIdx'(val) { this.markHighlight() }
  },

  lifetimes: {
    attached() {
      this.updateSizes(this.properties.size)
      this.computeLines()
      this.markHighlight()
    }
  },

  methods: {
    updateSizes(size) {
      let gap = 20, titleSize = 40, charSize = 28, authorSize = 24, pySize = 0.4, showAuthor = true
      if (size === 'sm') { gap = 12; titleSize = 30; charSize = 22; authorSize = 18; pySize = 0.35; showAuthor = false }
      if (size === 'lg') { gap = 24; titleSize = 52; charSize = 42; authorSize = 32; pySize = 0.45 }
      this.setData({ gap, titleSize, charSize, authorSize, pySize, showAuthor })
    },

    computeTitleAuthor(poem) {
      if (!poem) return
      // titleChars, authorChars 保留兼容，但 wxml 直接用 poem.title / poem.author
      this.setData({
        titleChars: (poem.title || '').split(''),
        authorChars: ((poem.dynasty || '') + '·' + (poem.author || '')).split('')
      })
    },

    computeLines() {
      const p = this.properties.poem
      if (!p || !p.paragraphs) {
        this.setData({ lines: [], sentenceLines: [], sentenceHL: [] })
        return
      }

      // 把每个 paragraph 按句末标点（，。？！；\n）拆成多句，并过滤掉字符里的标点
      const PUNCT = '，。？！；、：,!?;:\n\r '
      const isPunct = ch => PUNCT.indexOf(ch) !== -1
      const lines = []
      p.paragraphs.forEach((para, pIdx) => {
        let buffer = ''
        let charStart = 0
        for (let i = 0; i < para.length; i++) {
          const ch = para[i]
          if (isPunct(ch)) {
            // 标点作为分句边界，且不计入 buffer
            if (buffer.length > 0) {
              lines.push({
                chars: buffer.split(''),
                pinyinIndex: pIdx,
                charStart: charStart
              })
              charStart = i + 1
              buffer = ''
            }
          } else {
            buffer += ch
          }
        }
        // 段落结尾如果还有残余字符（无标点结尾），也作为一句
        if (buffer.length > 0) {
          lines.push({
            chars: buffer.split(''),
            pinyinIndex: pIdx,
            charStart: charStart
          })
        }
      })

      const sentenceLines = lines.map(l => l.chars)  // 字符数组的数组，每字单独成 <text>
      const sentenceHL = new Array(sentenceLines.length).fill(false)
      this.setData({ lines, sentenceLines, sentenceHL })
    },

    // 全局字符索引（跨所有句）
    globalIndex(li, ci) {
      const lines = this.data.lines || []
      let idx = 0
      for (let i = 0; i < li; i++) idx += lines[i].chars.length
      return idx + ci
    },

    // 标记当前高亮落在哪一句
    markHighlight() {
      const idx = this.properties.highlightIdx
      const lines = this.data.lines
      if (!lines || idx < 0) {
        // 没有高亮，全部清
        const hl = new Array((this.data.sentenceLines || []).length).fill(false)
        this.setData({ sentenceHL: hl })
        return
      }
      // 遍历所有句，找到 idx 所在的句子范围
      let offset = 0
      const hl = new Array(lines.length).fill(false)
      for (let i = 0; i < lines.length; i++) {
        const len = lines[i].chars.length
        if (idx >= offset && idx < offset + len) {
          hl[i] = true
          break
        }
        offset += len
      }
      this.setData({ sentenceHL: hl })
    },

    getPy(li, ci) {
      const p = this.properties.poem
      if (!p || !p.pinyinLines) return ''
      const line = (this.data.lines || [])[li]
      const pl = p.pinyinLines[line ? line.pinyinIndex : li]
      if (!pl) return ''
      const realCi = line ? line.charStart + ci : ci
      if (realCi >= pl.length) return ''
      return pl[realCi].py || ''
    }
  }
})
