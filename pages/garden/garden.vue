<template>
  <view class="page">
    <!-- 头部 -->
    <view class="garden-head">
      <text class="title">🌳 诗径花园</text>
      <text class="count">已学 {{ store.readCount }} 首</text>
    </view>

    <!-- 进度卡片 -->
    <view class="garden-section">
      <text class="tree">🌳</text>
      <text class="progress-num">{{ progress }}%</text>
      <text class="progress-label">已读 {{ store.readCount }}/{{ total }} 首</text>
      <view class="garden-bar">
        <view class="garden-bar-fill" :style="{ width: progress + '%' }"></view>
      </view>
      <view class="stats">
        <text>❤️ 收藏 {{ favCount }}</text>
        <text>📖 总诗库 {{ total }}</text>
        <text>🌟 级别 {{ level }}</text>
      </view>
    </view>

    <!-- 徽章 -->
    <view class="section-title">🎖 成长徽章</view>
    <view class="badge-grid">
      <view
        v-for="b in badges" :key="b.name"
        class="badge-cell"
        :class="{ earned: b.earned }"
      >
        <text class="badge-icon">{{ b.earned ? b.icon : '🔒' }}</text>
        <text class="badge-name">{{ b.name }}</text>
        <text class="badge-desc">{{ b.desc }}</text>
      </view>
    </view>

    <!-- Toast -->
    <view v-if="store.toastMsg" class="toast">{{ store.toastMsg }}</view>
  </view>
</template>

<script>
import store from '@/store/index.js'
import { computed } from 'vue'

export default {
  data() {
    return { store }
  },
  computed: {
    total() { return store.poems.length },
    favCount() { return store.favorites.size },
    progress() {
      return this.total ? Math.min(100, Math.round(store.readCount / this.total * 100)) : 0
    },
    level() {
      const rc = store.readCount
      return rc >= 100 ? '诗仙' : rc >= 50 ? '小树' : rc >= 20 ? '结果' : rc >= 10 ? '花开' : rc >= 5 ? '小苗' : '初芽'
    },
    badges() {
      const rc = store.readCount
      return [
        { name: '初芽', icon: '🌱', desc: '读了第1首诗', earned: rc >= 1 },
        { name: '小苗', icon: '🪴', desc: '读了5首诗', earned: rc >= 5 },
        { name: '花开', icon: '🌸', desc: '读了10首诗', earned: rc >= 10 },
        { name: '结果', icon: '🍎', desc: '读了20首诗', earned: rc >= 20 },
        { name: '小树', icon: '🌳', desc: '读了50首诗', earned: rc >= 50 },
        { name: '诗仙', icon: '🏆', desc: '读了100首诗', earned: rc >= 100 }
      ]
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 100rpx;
}

.garden-head {
  padding: 16rpx 36rpx 8rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.garden-head .title { font-size: 34rpx; font-weight: 700; }
.garden-head .count { font-size: 26rpx; color: var(--ink-soft); }

.garden-section {
  background: #fff; border-radius: 40rpx;
  padding: 48rpx; text-align: center;
  margin: 32rpx;
  box-shadow: 0 4rpx 6rpx var(--shadow), 0 8rpx 28rpx rgba(0,0,0,0.06);
}
.tree { font-size: 120rpx; display: block; margin-bottom: 16rpx; }
.progress-num { font-size: 60rpx; font-weight: 700; color: var(--moss-deep); }
.progress-label { font-size: 26rpx; color: var(--ink-soft); margin-top: 8rpx; display: block; }
.garden-bar {
  height: 20rpx; background: #E7DECB; border-radius: 10rpx;
  overflow: hidden; margin: 24rpx 0;
}
.garden-bar-fill {
  height: 100%; background: linear-gradient(90deg, #8FBF86, #6FA36A);
  border-radius: 10rpx; transition: width 0.6s ease;
}
.stats {
  display: flex; justify-content: space-around;
  margin-top: 32rpx; font-size: 24rpx; color: var(--ink-soft);
}

.section-title {
  font-size: 28rpx; font-weight: 700; color: var(--ink);
  margin: 32rpx 36rpx 20rpx;
}

.badge-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 20rpx; padding: 0 32rpx 40rpx;
}
.badge-cell {
  border-radius: 28rpx; padding: 28rpx 20rpx; text-align: center;
  background: #f0ede6; opacity: 0.5;
}
.badge-cell.earned { background: #fff; opacity: 1; }
.badge-icon { font-size: 64rpx; display: block; }
.badge-name { font-size: 26rpx; font-weight: 600; color: var(--ink); margin-top: 8rpx; display: block; }
.badge-cell:not(.earned) .badge-name { color: var(--ink-soft); }
.badge-desc { font-size: 20rpx; color: var(--ink-soft); margin-top: 4rpx; display: block; }

.toast {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.78); color: #fff; padding: 24rpx 44rpx;
  border-radius: 24rpx; font-size: 26rpx; z-index: 999;
}
</style>
