<template>
  <view class="page">
    <!-- 头部 -->
    <view class="lib-head">
      <text class="title">诗库</text>
      <text class="count">{{ filteredPoems.length }}首</text>
    </view>

    <!-- 搜索条 -->
    <view class="search-bar">
      <text class="search-icon">🔍</text>
      <input
        v-model="searchQuery"
        class="search-input"
        placeholder="输入诗名、作者或朝代…"
        placeholder-style="color:#C9BBA7;font-size:26rpx"
      />
    </view>

    <!-- 维度切换 -->
    <view class="dim-pills">
      <view
        v-for="d in dims" :key="d.key"
        class="dpill" :class="{ on: dim === d.key }"
        @tap="switchDim(d.key)"
      >{{ d.label }}</view>
    </view>

    <!-- 分类筛选 -->
    <scroll-view v-if="items.length" class="filter-row" scroll-x>
      <view
        class="ftab" v-for="item in items" :key="item"
        :class="{ on: selected === item }"
        @tap="filter(item)"
      >{{ item }}</view>
    </scroll-view>

    <!-- 诗卡网格 -->
    <view class="lib-grid">
      <view class="pcard" v-for="p in filteredPoems" :key="p.id" @tap="goDetail(p.id)">
        <image class="pc-bg" :src="store.getPoemBg(p)" mode="aspectFill" />
        <text class="pc-tag">{{ p.theme || p.sceneName || '诗词' }}</text>
        <view class="pc-poem">
          <poem-vertical :poem="p" size="sm" mode="light" />
        </view>
        <view class="pc-foot">
          <text class="nm">{{ p.title }}</text>
          <text class="au">{{ p.author }}·{{ p.dynasty }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!filteredPoems.length" class="empty-state">
      {{ searchQuery ? '没有找到匹配的诗，试试其他关键词' : '没有找到诗' }}
    </view>

    <!-- Toast -->
    <view v-if="store.toastMsg" class="toast">{{ store.toastMsg }}</view>
  </view>
</template>

<script>
import store, { THEMES, DYNASTIES, GRADES } from '@/store/index.js'

const dims = [
  { key: 'theme', label: '主题' },
  { key: 'dynasty', label: '朝代' },
  { key: 'author', label: '作者' },
  { key: 'grade', label: '年级' }
]

export default {
  data() {
    return {
      store,
      dims,
      dim: 'theme',
      items: [],
      poems: [],
      selected: '全部',
      searchQuery: ''
    }
  },
  computed: {
    filteredPoems() {
      if (!this.searchQuery.trim()) return this.poems
      const q = this.searchQuery.trim().toLowerCase()
      return this.poems.filter(p => {
        return (p.title || '').includes(q) ||
          (p.author || '').includes(q) ||
          (p.dynasty || '').includes(q) ||
          (p.sceneName || '').includes(q) ||
          (p.theme || '').includes(q) ||
          (p.paragraphs || []).some(line => line.includes(q))
      })
    }
  },
  onLoad(options) {
    const qd = options.dim
    if (qd && ['theme', 'dynasty', 'author', 'grade'].includes(qd)) {
      this.dim = qd
    }
    this.buildItems()
  },
  methods: {
    switchDim(d) {
      this.dim = d
      this.searchQuery = ''
      this.buildItems()
    },
    buildItems() {
      if (this.dim === 'theme') this.items = THEMES
      else if (this.dim === 'dynasty') this.items = DYNASTIES
      else if (this.dim === 'author') {
        this.items = ['全部', ...new Set(store.poems.map(p => p.author).filter(Boolean))]
      } else if (this.dim === 'grade') this.items = GRADES
      else this.items = ['全部']
      this.selected = '全部'
      this.poems = store.getPoemsByFilter(this.dim, '全部')
    },
    filter(val) {
      this.poems = store.getPoemsByFilter(this.dim, val)
      this.selected = val
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/detail/detail?id=${id}` })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 100rpx;
}

.lib-head {
  padding: 20rpx 36rpx 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lib-head .title { font-size: 34rpx; font-weight: 700; }
.lib-head .count { font-size: 22rpx; color: var(--ink-soft); }

.search-bar {
  margin: 16rpx 32rpx 0;
  background: #fff; border-radius: 44rpx;
  border: 2rpx solid #E7DECB;
  padding: 18rpx 28rpx;
  display: flex; align-items: center; gap: 16rpx;
}
.search-icon { font-size: 28rpx; }
.search-input { flex: 1; font-size: 28rpx; color: var(--ink); }

.dim-pills {
  display: flex; gap: 12rpx;
  padding: 20rpx 32rpx 12rpx;
}
.dpill {
  font-size: 24rpx; padding: 10rpx 30rpx; border-radius: 28rpx;
  background: #fff; color: var(--ink-soft);
  border: 2rpx solid #E7DECB;
}
.dpill.on {
  background: var(--moss-deep); color: #fff;
  border-color: var(--moss-deep);
}

.filter-row {
  display: flex; gap: 16rpx;
  padding: 12rpx 32rpx 20rpx;
  white-space: nowrap;
}
.ftab {
  flex-shrink: 0; font-size: 26rpx;
  padding: 14rpx 30rpx; border-radius: 36rpx;
  background: #fff; color: var(--ink-soft);
  border: 2rpx solid #E7DECB;
}
.ftab.on {
  background: var(--ink); color: #fff;
  border-color: var(--ink);
}

.lib-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 24rpx; padding: 0 32rpx 40rpx;
}
.pcard {
  border-radius: 32rpx; overflow: hidden;
  position: relative; height: 350rpx;
  box-shadow: 0 4rpx 6rpx var(--shadow), 0 10rpx 32rpx rgba(0,0,0,0.1);
}
.pc-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.pc-tag {
  position: absolute; top: 20rpx; left: 20rpx; z-index: 4;
  background: rgba(255,255,255,0.88); color: var(--moss-deep);
  font-size: 20rpx; font-weight: 700;
  padding: 4rpx 18rpx; border-radius: 20rpx;
}
.pc-poem { position: absolute; top: 24rpx; right: 24rpx; z-index: 3; }
.pc-foot {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 3;
  padding: 36rpx 20rpx 16rpx;
  background: linear-gradient(transparent, rgba(0,0,0,0.55));
  color: #fff;
}
.pc-foot .nm { font-size: 24rpx; font-weight: 600; display: block; }
.pc-foot .au { font-size: 20rpx; opacity: 0.85; display: block; }

.empty-state {
  text-align: center; padding: 80rpx 40rpx;
  color: var(--ink-soft); font-size: 26rpx;
}

.toast {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.78); color: #fff; padding: 24rpx 44rpx;
  border-radius: 24rpx; font-size: 26rpx; z-index: 999;
}
</style>
