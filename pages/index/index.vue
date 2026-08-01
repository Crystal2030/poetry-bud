<template>
  <view class="page">
    <!-- 头部 -->
    <view class="home-head">
      <view class="greet">
        <text>下午好，小朋友</text>
        <text class="bold">今天想读哪首诗？</text>
      </view>
      <view class="avatar">
        <text style="font-size: 48rpx">🌱</text>
      </view>
    </view>

    <!-- 每日一诗 -->
    <view class="home-body">
      <view v-if="daily" class="daily-card" @tap="goDetail(daily.id)">
        <image class="daily-bg" :src="store.getPoemBg(daily)" mode="aspectFill" />
        <text class="daily-badge">✦ 每日一诗</text>
        <view class="daily-poem">
          <poem-vertical :poem="daily" size="sm" :mode="sceneMode(daily)" />
        </view>
        <view class="daily-foot">
          <text class="nm">《{{ daily.title }}》· {{ daily.author }}</text>
          <text class="sub">{{ daily.funTip || '点击走进诗中世界 ›' }}</text>
        </view>
      </view>

      <!-- 四维探索 -->
      <view class="section-title">
        <text>🧭 四维探索</text>
      </view>
      <view class="cat-grid">
        <view class="cat c1" @tap="goLibrary('dynasty')">
          <text class="n">朝代</text>
          <text class="d">穿越千年时光</text>
          <text class="em">🏛</text>
        </view>
        <view class="cat c2" @tap="goLibrary('author')">
          <text class="n">作者</text>
          <text class="d">和诗人交朋友</text>
          <text class="em">✍</text>
        </view>
        <view class="cat c3" @tap="goLibrary('grade')">
          <text class="n">年级</text>
          <text class="d">课标进度书架</text>
          <text class="em">📚</text>
        </view>
        <view class="cat c4" @tap="goLibrary('theme')">
          <text class="n">主题</text>
          <text class="d">山水·思乡·咏物</text>
          <text class="em">🌸</text>
        </view>
      </view>

      <!-- 芽芽提示 -->
      <view class="buddy-row">
        <text style="font-size: 80rpx">🌱</text>
        <view class="txt">
          <text class="b1">芽芽：你已经读了 {{ store.readCount }} 首诗啦！</text>
          <text class="b2" @tap="goGarden">诗径花园里又开了一朵花 🌷 去看看 ›</text>
        </view>
      </view>
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
    daily() { return store.getDailyPoem() }
  },
  methods: {
    sceneMode(poem) {
      const bright = ['field', 'grass', 'pond', 'snow']
      return bright.includes(poem.sceneId) ? 'dark' : 'light'
    },
    goDetail(id) { uni.navigateTo({ url: `/pages/detail/detail?id=${id}` }) },
    goLibrary(dim) { uni.switchTab({ url: '/pages/library/library' }) },
    goGarden() { uni.switchTab({ url: '/pages/garden/garden' }) }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 100rpx;
}

.home-head {
  padding: 16rpx 36rpx 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.greet { font-size: 26rpx; color: var(--ink-soft); }
.greet .bold { color: var(--ink); font-size: 32rpx; display: block; margin-top: 4rpx; font-weight: 700; }
.avatar {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: linear-gradient(135deg, #CDE3C6, #A9C9A4);
  display: flex; align-items: center; justify-content: center;
}

.home-body { padding: 0 32rpx; }

.daily-card {
  border-radius: 44rpx; overflow: hidden; position: relative;
  height: 520rpx; margin: 16rpx 0;
  box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.18);
}
.daily-bg { width: 100%; height: 100%; position: absolute; inset: 0; }
.daily-badge {
  position: absolute; top: 24rpx; left: 24rpx; z-index: 4;
  background: rgba(255,255,255,0.88); color: var(--seal);
  font-size: 22rpx; font-weight: 700; padding: 10rpx 26rpx;
  border-radius: 28rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}
.daily-poem { position: absolute; top: 40rpx; right: 40rpx; z-index: 3; }
.daily-foot {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 3;
  padding: 60rpx 32rpx 28rpx; color: #fff;
  background: linear-gradient(transparent, rgba(0,0,0,0.55));
}
.daily-foot .nm { font-size: 30rpx; font-weight: 600; }
.daily-foot .sub { font-size: 22rpx; opacity: 0.88; margin-top: 6rpx; display: block; }

.section-title {
  font-size: 28rpx; font-weight: 700; color: var(--ink);
  margin: 32rpx 8rpx 20rpx; display: flex; align-items: center; gap: 12rpx;
}

.cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin-bottom: 24rpx; }
.cat {
  display: flex; flex-direction: column; justify-content: space-between;
  border-radius: 32rpx; padding: 32rpx 28rpx; color: #fff;
  height: 156rpx; position: relative; overflow: hidden;
  box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.12);
}
.cat .n { font-size: 32rpx; font-weight: 700; position: relative; z-index: 1; }
.cat .d { font-size: 20rpx; opacity: 0.92; position: relative; z-index: 1; }
.cat .em { position: absolute; right: 16rpx; bottom: 0; font-size: 76rpx; opacity: 0.24; }
.c1 { background: linear-gradient(135deg, #B5896B, #8A5F42); }
.c2 { background: linear-gradient(135deg, #7FA8C9, #5E86A8); }
.c3 { background: linear-gradient(135deg, #8FBF86, #6FA36A); }
.c4 { background: linear-gradient(135deg, #C9857F, #B0655E); }

.buddy-row {
  margin: 24rpx 0 12rpx; background: #fff; border-radius: 32rpx;
  padding: 24rpx 28rpx; display: flex; align-items: center; gap: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.06);
}
.buddy-row .txt .b1 { font-size: 26rpx; font-weight: 600; color: var(--ink); display: block; }
.buddy-row .txt .b2 { font-size: 22rpx; color: var(--ink-soft); margin-top: 4rpx; display: block; }

.toast {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.78); color: #fff; padding: 24rpx 44rpx;
  border-radius: 24rpx; font-size: 26rpx; z-index: 999;
}
</style>
