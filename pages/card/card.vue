<template>
  <view class="card-page">
    <!-- 返回按钮 -->
    <view class="back-btn" @tap="goBack">
      <text style="font-size: 32rpx; color: #fff">‹</text>
    </view>

    <!-- 加载中 -->
    <view v-if="!poem" class="loading">加载中...</view>

    <template v-if="poem">
      <!-- 诗卡 -->
      <view class="share-card">
        <view class="sc-pic">
          <image class="sc-bg" :src="store.getPoemBg(poem)" mode="aspectFill" />
          <view class="sc-poem">
            <poem-vertical :poem="poem" size="md" mode="light" />
          </view>
        </view>
        <view class="sc-info">
          <text class="sn">《{{ poem.title }}》</text>
          <text class="sa">{{ poem.dynasty }}·{{ poem.author }}</text>
          <view class="sc-waves">
            <view v-for="i in 15" :key="i" class="wbar" :style="{ height: waveH() + 'rpx' }"></view>
          </view>
          <view class="sc-qr">
            <!-- 模拟二维码 -->
            <text style="font-size: 10rpx; line-height: 1">扫码听诗</text>
          </view>
        </view>
        <view class="sc-foot">扫码听 · 诗芽 · 一诗一景</view>
      </view>

      <!-- 操作按钮 -->
      <view class="share-acts">
        <view class="sa-btn" @tap="saveCard">
          <view class="cir"><text>📥</text></view>
          <text>保存</text>
        </view>
        <view class="sa-btn" @tap="shareCard">
          <view class="cir"><text>🔗</text></view>
          <text>分享</text>
        </view>
        <view class="sa-btn" @tap="skip">
          <view class="cir"><text>🖨</text></view>
          <text>打印</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import store from '@/store/index.js'

export default {
  data() {
    return { store, poem: null }
  },
  onLoad(options) {
    this.poem = store.poems.find(p => p.id === options.id) || null
  },
  methods: {
    goBack() { uni.navigateBack() },
    waveH() { return Math.floor(10 + Math.random() * 34) },
    saveCard() { store.showToast('卡片已保存到相册') },
    shareCard() { store.showToast('分享链接已复制') },
    skip() { store.showToast('打印功能开发中') }
  }
}
</script>

<style scoped>
.card-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #3a4a5e, #26303f);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 44rpx;
}
.back-btn {
  position: absolute; top: 100rpx; left: 32rpx; z-index: 50;
  width: 68rpx; height: 68rpx; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
}
.loading { color: #fff; font-size: 28rpx; }

.share-card {
  width: 520rpx; border-radius: 40rpx; overflow: hidden;
  box-shadow: 0 32rpx 88rpx rgba(0,0,0,0.5);
}
.sc-pic { height: 640rpx; position: relative; overflow: hidden; }
.sc-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.sc-poem { position: absolute; top: 32rpx; right: 32rpx; z-index: 3; }
.sc-info {
  padding: 28rpx 32rpx; background: var(--paper); position: relative;
}
.sn { font-size: 28rpx; font-weight: 700; color: var(--ink); display: block; }
.sa { font-size: 22rpx; color: var(--ink-soft); margin-top: 2rpx; display: block; }
.sc-waves {
  display: flex; align-items: flex-end; gap: 4rpx;
  height: 44rpx; margin-top: 20rpx;
}
.wbar { flex: 1; background: var(--seal); border-radius: 4rpx; opacity: 0.75; }
.sc-qr {
  position: absolute; right: 28rpx; bottom: 24rpx;
  width: 88rpx; height: 88rpx; background: #fff;
  border-radius: 16rpx; display: flex;
  align-items: center; justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.15);
}
.sc-foot {
  padding: 0 32rpx 28rpx; background: var(--paper);
  font-size: 18rpx; color: var(--ink-soft); text-align: center;
}

.share-acts {
  display: flex; gap: 28rpx; margin-top: 44rpx;
}
.sa-btn {
  display: flex; flex-direction: column; align-items: center;
  gap: 12rpx; color: #fff; font-size: 22rpx;
}
.cir {
  width: 92rpx; height: 92rpx; border-radius: 50%;
  background: rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  border: 2rpx solid rgba(255,255,255,0.25);
  font-size: 36rpx;
}
</style>
