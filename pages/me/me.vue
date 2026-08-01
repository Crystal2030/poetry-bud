<template>
  <view class="page">
    <!-- 头像区 -->
    <view class="profile">
      <view class="avatar-wrap">
        <text style="font-size: 72rpx">🌱</text>
      </view>
      <text class="name">小朋友</text>
      <text class="tagline">诗芽在手，古诗不愁 🌱</text>
    </view>

    <!-- 数据卡片 -->
    <view class="stat-cards">
      <view class="stat-item">
        <text class="stat-num c-green">{{ store.readCount }}</text>
        <text class="stat-label">已读</text>
      </view>
      <view class="stat-item">
        <text class="stat-num c-red">{{ favCount }}</text>
        <text class="stat-label">收藏</text>
      </view>
      <view class="stat-item">
        <text class="stat-num c-gold">125</text>
        <text class="stat-label">诗库</text>
      </view>
    </view>

    <!-- 菜单 -->
    <view class="menu">
      <view class="menu-item" @tap="resetData">
        <text>🧹 清除学习记录</text>
        <text style="color: #C9BBA7">›</text>
      </view>
    </view>

    <!-- 版本信息 -->
    <view class="version">
      诗芽 PoetryBud v2.0 · 一诗一景 · 四步学习
    </view>

    <!-- Toast -->
    <view v-if="store.toastMsg" class="toast">{{ store.toastMsg }}</view>
  </view>
</template>

<script>
import store from '@/store/index.js'

export default {
  data() {
    return { store }
  },
  computed: {
    favCount() { return store.favorites.size }
  },
  methods: {
    resetData() {
      uni.showModal({
        title: '确认',
        content: '确定要清除所有学习记录吗？这个操作不可恢复。',
        success: (res) => {
          if (res.confirm) {
            uni.removeStorageSync('pb_read')
            uni.removeStorageSync('pb_fav')
            store.readCount = 0
            store.favorites = new Set()
            store.showToast('学习记录已清除')
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 100rpx;
}

.profile {
  padding: 40rpx 36rpx; text-align: center;
}
.avatar-wrap {
  width: 120rpx; height: 120rpx; border-radius: 50%;
  background: linear-gradient(135deg, #CDE3C6, #A9C9A4);
  margin: 0 auto 24rpx;
  display: flex; align-items: center; justify-content: center;
}
.name { font-size: 32rpx; font-weight: 700; display: block; }
.tagline { font-size: 24rpx; color: var(--ink-soft); margin-top: 8rpx; display: block; }

.stat-cards {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  gap: 24rpx; margin: 0 32rpx 40rpx;
}
.stat-item {
  background: #fff; border-radius: 28rpx;
  padding: 32rpx 24rpx; text-align: center;
  box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.05);
}
.stat-num { font-size: 44rpx; font-weight: 700; display: block; }
.stat-label { font-size: 22rpx; color: var(--ink-soft); margin-top: 4rpx; display: block; }
.c-green { color: var(--moss-deep); }
.c-red { color: var(--seal); }
.c-gold { color: #E8C063; }

.menu {
  margin: 0 32rpx 32rpx;
  background: #fff; border-radius: 32rpx; overflow: hidden;
  box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.05);
}
.menu-item {
  padding: 28rpx 32rpx; font-size: 28rpx;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 2rpx solid #f0ede6;
}

.version {
  padding: 28rpx 32rpx; font-size: 22rpx; color: var(--ink-soft); text-align: center;
}

.toast {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.78); color: #fff; padding: 24rpx 44rpx;
  border-radius: 24rpx; font-size: 26rpx; z-index: 999;
}
</style>
