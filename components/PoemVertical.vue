<template>
  <view class="vpoem" :class="[modeClass]" :style="{ gap: gap + 'rpx' }">
    <!-- 标题列 -->
    <view class="col title-col">
      <text class="ch" :style="{ fontSize: titleSize + 'rpx' }">{{ poem.title }}</text>
      <text v-if="!isSm" class="author">{{ poem.dynasty }}·{{ poem.author }}</text>
    </view>
    <!-- 诗句列 -->
    <view class="col line-col" v-for="(line, li) in lines" :key="li">
      <view class="char-stack" v-for="(ch, ci) in line" :key="ci">
        <text v-if="showPinyin && getPy(li, ci)" class="py" :style="{ fontSize: pySize + 'em' }">{{ getPy(li, ci) }}</text>
        <text class="ch" :class="{ hl: highlightIndex !== -1 && globalIndex(li, ci) === highlightIndex }" :style="{ fontSize: charSize + 'rpx' }">{{ ch }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'PoemVertical',
  props: {
    poem: { type: Object, default: () => ({ title: '', paragraphs: [] }) },
    size: { type: String, default: 'md' },  // sm | md | lg
    mode: { type: String, default: 'light' }, // light | dark
    highlightIndex: { type: Number, default: -1 },
    showPinyin: { type: Boolean, default: false }
  },
  computed: {
    lines() {
      if (!this.poem || !this.poem.paragraphs) return []
      return this.poem.paragraphs.map(p => p.split(''))
    },
    isSm() { return this.size === 'sm' },
    gap() { return this.size === 'sm' ? 12 : this.size === 'lg' ? 24 : 20 },
    titleSize() { return this.size === 'sm' ? 30 : this.size === 'lg' ? 52 : 40 },
    charSize() { return this.size === 'sm' ? 22 : this.size === 'lg' ? 42 : 28 },
    pySize() { return this.size === 'sm' ? 0.35 : this.size === 'lg' ? 0.45 : 0.4 },
    modeClass() { return 'mode-' + (this.mode || 'light') }
  },
  methods: {
    globalIndex(li, ci) {
      let idx = 0
      for (let i = 0; i < li; i++) idx += this.lines[i].length
      return idx + ci
    },
    getPy(li, ci) {
      if (!this.poem || !this.poem.pinyinLines) return ''
      const pl = this.poem.pinyinLines[li]
      if (!pl || ci >= pl.length) return ''
      return pl[ci].py || ''
    }
  }
}
</script>

<style scoped>
.vpoem {
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  font-family: "KaiTi", "STKaiti", "楷体", serif;
}

.col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title-col .author {
  display: block;
  margin-top: 16rpx;
  font-size: 0.5em;
  opacity: 0.85;
  letter-spacing: 2px;
}

.char-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.py {
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #C9BBA7;
  letter-spacing: 0;
  white-space: nowrap;
  line-height: 1;
  margin-bottom: 4rpx;
}

/* Mode: light */
.mode-light .ch {
  color: #FFFEF9;
  text-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.55);
}
.mode-light .py {
  color: rgba(255, 255, 255, 0.55);
}

/* Mode: dark */
.mode-dark .ch {
  color: #2C2A26;
  text-shadow: 0 2rpx 8rpx rgba(255, 255, 255, 0.7);
}

/* Highlight */
.ch.hl {
  color: var(--gold) !important;
  text-shadow: 0 0 28rpx rgba(201, 162, 75, 0.9), 0 2rpx 16rpx rgba(0, 0, 0, 0.6) !important;
}
</style>
