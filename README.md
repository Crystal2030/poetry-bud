# 诗芽 PoetryBud - 多端部署方案

## 项目结构

```
poetry-app/
├── index.html              ← H5 版（单文件 Vue3 SPA，可直接打开）
├── poems-full.json          ← 诗词数据源（125首）
├── audio/                   ← M4A 朗读音频（9.9MB，需 CDN）
├── bg-samples/              ← 背景图（90MB，需 CDN）
└── uni-app/
    ├── miniprogram/         ← 微信小程序原生代码
    │   ├── app.js/json/wxss  → 应用入口 + 全局配置
    │   ├── project.config.json → 开发者工具配置
    │   ├── data/poems.js     → 诗词数据模块（376KB）
    │   ├── utils/store.js    → 工具方法
    │   ├── components/poem-vertical/ → 竖排诗组件
    │   └── pages/
    │       ├── index/        → 首页（每日一诗 + 四维探索）
    │       ├── library/      → 诗库（搜索 + 筛选 + 维度切换）
    │       ├── detail/       → 详情（朗读 + 诗卡生成）
    │       ├── card/         → 有声诗卡（分享/保存）
    │       ├── garden/       → 诗径花园（进度 + 徽章）
    │       └── me/           → 我的（数据统计 + 清除记录）
    └── pages/*.vue           ← uni-app Vue3 页面（备用，需装依赖）
```

## H5 版

`index.html` 直接用浏览器打开即可使用。所有 CSS/JS 内联，无构建步骤。

## 小程序版

用微信开发者工具打开 `miniprogram/` 目录。

### 部署前必做

1. **修改 appid**：`project.config.json` → `"appid": "你的小程序appid"`
2. **配置 CDN**：`app.js` → 修改 `CDN.images` 和 `CDN.audio` 为实际地址
3. **上传静态资源到 CDN**：
   - `bg-samples/` → CDN images 目录（90MB，7 张场景图 + 主题图）
   - `audio/*.m4a` + `audio/duration-map.json` → CDN audio 目录（10MB）

### 页面功能对照

| 页面 | Web版 | 小程序版 |
|------|-------|---------|
| 首页 | ✅ 四维探索 + 每日一诗 | ✅ |
| 诗库 | ✅ 搜索 + 主题/朝代/作者/年级 | ✅ |
| 详情 | ✅ 竖排诗 + 朗读 + 诗卡 | ✅ 使用 wx.createInnerAudioContext |
| 诗卡 | ✅ 分享卡 | ✅ |
| 花园 | ✅ 进度 + 徽章 | ✅ |
| 我的 | ✅ 统计 + 清除 | ✅ |

## 为什么没用 uni-app CLI

npm 安装 `@dcloudio/uni-*` 全家桶（~500个包）超出沙箱内存限制。改用原生小程序代码，零依赖，直接可用。

## 后续改进

- TabBar 图标当前为占位圆点，需替换为设计稿图标
- 背景图/音频需 CDN 托管（小程序包体限制 2MB）
- 可接入微信登录 + 云端同步学习记录
