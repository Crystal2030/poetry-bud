<template>
  <view class="detail-page">
    <!-- 背景 -->
    <image v-if="poem" class="d-bg" :src="store.getPoemBg(poem)" mode="aspectFill" />
    <view class="d-veil-t"></view>
    <view class="d-veil-b"></view>

    <!-- 加载中 -->
    <view v-if="!poem" class="loading">加载中...</view>

    <template v-if="poem">
      <!-- 顶部栏 -->
      <view class="d-top">
        <view class="icon-btn" @tap="goBack">
          <text style="font-size: 32rpx; color: #fff">‹</text>
        </view>
        <view class="icon-btn" @tap="toggleFav">
          <text style="font-size: 28rpx">{{ store.isFav(poem.id) ? '❤️' : '🤍' }}</text>
        </view>
      </view>

      <!-- 竖排诗 -->
      <view class="d-poem-area">
        <poem-vertical :poem="poem" size="lg" mode="light" :highlightIndex="highlightIdx" />
      </view>

      <!-- 生成诗卡按钮 -->
      <view class="d-cta" @tap="goCard">
        <text style="font-size: 24rpx; margin-right: 8rpx">📜</text>
        <text>生成诗卡</text>
      </view>

      <!-- 朗读条 -->
      <view class="read-bar">
        <view class="play-btn" @tap="togglePlay">
          <text style="font-size: 32rpx">{{ playing ? '⏸' : '▶️' }}</text>
        </view>
        <view class="read-info">
          <text class="ri-title">{{ playing ? '正在朗读...' : '点击朗读古诗' }}</text>
          <view v-if="playing" class="wave-row">
            <view v-for="i in 14" :key="i" class="wave-bar" :style="{ animationDelay: (i * 0.08) + 's' }"></view>
          </view>
        </view>
        <text style="font-size: 28rpx; color: rgba(255,255,255,0.6)">🔊</text>
      </view>

      <!-- 底部信息抽屉 -->
      <view class="drawer">
        <view class="grip"></view>
        <view class="tags">
          <text class="tag">{{ poem.level }}</text>
          <text class="tag" v-if="poem.grade">{{ poem.grade.replace('★', '') }}</text>
          <text class="tag">{{ poem.dynasty }}</text>
          <text class="tag">{{ poem.sceneName || '通用' }}</text>
          <text class="tag" v-if="poem.isRequired">课标必背</text>
        </view>
        <view class="d-title">
          诗意 · 注释 · 译文
          <text class="hint">↑ 上滑展开</text>
        </view>
        <view class="d-desc">{{ poem.funTip || '意境优美，朗朗上口。点击播放按钮，跟着芽芽一起朗读吧～' }}</view>
      </view>
    </template>
  </view>
</template>

<script>
import store from '@/store/index.js'

export default {
  data() {
    return {
      store,
      poem: null,
      playing: false,
      highlightIdx: -1,
      totalChars: 0,
      _timer: null,
      _audio: null
    }
  },
  onLoad(options) {
    this.load(options.id)
  },
  onUnload() {
    this.stopRead()
  },
  methods: {
    load(id) {
      this.poem = store.poems.find(p => p.id === id) || null
      this.playing = false
      this.highlightIdx = -1
      if (this.poem) {
        store.markRead()
        let c = 0
        if (this.poem.pinyinLines) {
          this.poem.pinyinLines.forEach(l => l.forEach(() => c++))
        }
        this.totalChars = c || 80
      }
    },
    goBack() { uni.navigateBack() },
    toggleFav() { store.toggleFav(this.poem.id) },
    goCard() { uni.navigateTo({ url: `/pages/card/card?id=${this.poem.id}` }) },
    togglePlay() {
      if (this.playing) { this.stopRead(); return }
      this.startRead()
    },
    startRead() {
      if (!this.poem || !this.poem.paragraphs) return
      this.playing = true
      this.highlightIdx = 0

      // uni-app 音频
      const url = store.getAudioUrl(this.poem)
      this._audio = uni.createInnerAudioContext()
      this._audio.src = url
      this._audio.play()

      const dur = store.getAudioDuration(this.poem)
      const msPerChar = dur && this.totalChars ? dur / this.totalChars : 300
      let ci = 0
      this._timer = setInterval(() => {
        if (!this.playing) return
        ci++
        if (ci >= this.totalChars) ci = 0
        this.highlightIdx = ci
      }, msPerChar)

      this._audio.onEnded(() => { this.stopRead() })
      this._audio.onError(() => { this.stopRead() })
    },
    stopRead() {
      this.playing = false
      if (this._timer) { clearInterval(this._timer); this._timer = null }
      if (this._audio) { this._audio.destroy(); this._audio = null }
    }
  }
}
</script>

<style scoped>
.detail-page {
  position: relative; width: 100vw; height: 100vh; overflow: hidden;
}
.d-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.d-veil-t {
  position: absolute; top: 0; left: 0; right: 0; height: 320rpx; z-index: 5;
  background: linear-gradient(rgba(0,0,0,0.35), transparent);
}
.d-veil-b {
  position: absolute; bottom: 0; left: 0; right: 0; height: 520rpx; z-index: 5;
  background: linear-gradient(transparent, rgba(0,0,0,0.45));
}
.loading {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: #fff; font-size: 28rpx;
}

.d-top {
  position: absolute; top: 80rpx; left: 0; right: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between;
  padding: 8rpx 32rpx;
}
.icon-btn {
  width: 68rpx; height: 68rpx; border-radius: 50%;
  background: rgba(255,255,255,0.22);
  backdrop-filter: blur(12rpx);
  display: flex; align-items: center; justify-content: center;
  border: 2rpx solid rgba(255,255,255,0.3);
}

.d-poem-area {
  position: absolute; top: 152rpx; right: 48rpx; z-index: 30;
  max-width: 480rpx;
}

.d-cta {
  position: absolute; right: 32rpx; bottom: 280rpx; z-index: 37;
  background: var(--seal); color: #fff; font-size: 24rpx;
  padding: 18rpx 30rpx; border-radius: 40rpx;
  display: flex; align-items: center;
  box-shadow: 0 6rpx 24rpx rgba(192,85,63,0.45);
}

.read-bar {
  position: absolute; left: 32rpx; right: 32rpx; bottom: 300rpx; z-index: 35;
  background: rgba(20,28,40,0.42);
  backdrop-filter: blur(20rpx);
  border-radius: 40rpx; padding: 24rpx 28rpx;
  display: flex; align-items: center; gap: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.14);
}
.play-btn {
  width: 88rpx; height: 88rpx; border-radius: 50%;
  background: var(--gold);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.3);
}
.read-info { flex: 1; }
.ri-title { color: #fff; font-size: 24rpx; opacity: 0.88; display: block; }
.wave-row {
  display: flex; align-items: flex-end; gap: 4rpx;
  height: 32rpx; margin-top: 10rpx;
}
.wave-bar {
  width: 5rpx; background: var(--gold); border-radius: 4rpx;
  animation: wave 1.1s ease-in-out infinite;
}
@keyframes wave {
  0%, 100% { height: 10rpx; }
  50% { height: 32rpx; }
}

.drawer {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 40;
  background: linear-gradient(rgba(245,235,218,0.75), rgba(245,235,218,0.97));
  backdrop-filter: blur(24rpx);
  border-radius: 44rpx 44rpx 0 0;
  padding: 24rpx 40rpx 40rpx;
  max-height: 55%;
}
.grip {
  width: 80rpx; height: 10rpx; background: #C9BBA7;
  border-radius: 6rpx; margin: 0 auto 24rpx;
}
.tags { display: flex; gap: 16rpx; margin-bottom: 24rpx; flex-wrap: wrap; }
.tag {
  font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 24rpx;
  background: var(--paper-warm); color: var(--ink-soft);
}
.d-title { font-size: 26rpx; color: var(--ink); font-weight: 600; margin: 24rpx 0 12rpx; }
.d-title .hint { font-size: 22rpx; color: var(--moss-deep); font-weight: 400; }
.d-desc { font-size: 24rpx; color: var(--ink-soft); line-height: 1.8; }
</style>
