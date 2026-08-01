// 诗芽 - 统一 SVG 图标库
// 所有图标采用 24x24 viewBox 矢量路径，描边风格 1.5px，圆角线帽
// 颜色由父元素 color 属性控制（fill / stroke 用 currentColor）

const ICONS = {
  // ── 基础导航 ──
  'home':      '<path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V11z"/>',
  'grid':      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  'flower':    '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5c0-2.5-2-4-2-6 2 0 4 1.5 4 4M12 9.5c0-2.5 2-4 2-6-2 0-4 1.5-4 4M12 14.5c0 2.5-2 4-2 6 2 0 4-1.5 4-4M12 14.5c0 2.5 2 4 2 6-2 0-4-1.5-4-4M9.5 12c-2.5 0-4-2-6-2 0 2 1.5 4 4 4M9.5 12c-2.5 0-4 2-6 2 0-2 1.5-4 4-4M14.5 12c2.5 0 4-2 6-2 0 2-1.5 4-4 4M14.5 12c2.5 0 4 2 6 2 0-2-1.5-4-4-4"/>',
  'user':      '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  'back':      '<polyline points="15 6 9 12 15 18"/>',

  // ── 搜索 / 输入 ──
  'search':    '<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16" y2="16"/>',

  // ── 4 维分类 ──
  'dynasty':   '<path d="M4 22V6l5-2v18M11 22V8l5-2v16M18 22v-12l3-1v13"/><line x1="3" y1="22" x2="21" y2="22"/>',
  'author':    '<path d="M12 19l-1 4M9 19l-1 4M15 19l1 4M5 4h14M5 4l-1 4c0 2 2 3 4 3M19 4l1 4c0 2-2 3-4 3M5 4c0 5 7 8 7 12 0-4 7-7 7-12"/>',
  'grade':     '<path d="M2 9l10-5 10 5-10 5L2 9zM6 11v5c0 2 3 4 6 4s6-2 6-4v-5"/>',
  'theme':     '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>',

  // ── 内容 Tab 标签 ──
  'book':      '<path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V4zM4 4v18"/>',
  'translate': '<path d="M3 5h12M9 3v2M5 5c0 5 4 7 8 8M11 9c0 3-2 6-5 8M14 21l4-10 4 10M15 17h6"/>',
  'tips':      '<path d="M12 3a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2V20h6v-2.3c0-.7.4-1.5 1-2A7 7 0 0 0 12 3z"/><line x1="10" y1="22" x2="14" y2="22"/>',
  'paint':     '<path d="M3 21l5-3 4 4 9-9-3-3-9 9-4-4-3 5zM14 6a2 2 0 1 0 2 2"/>',
  'mountain':  '<path d="M3 20l6-10 4 6 3-4 5 8H3z"/>',
  'person':    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',

  // ── 详情页操作 ──
  'star':      '<polygon points="12 3 14.6 9 21 9.7 16 14 17.5 20.5 12 17 6.5 20.5 8 14 3 9.7 9.4 9 12 3"/>',
  'star-fill': '<polygon points="12 3 14.6 9 21 9.7 16 14 17.5 20.5 12 17 6.5 20.5 8 14 3 9.7 9.4 9 12 3"/>',
  'play':      '<polygon points="6 4 20 12 6 20 6 4"/>',
  'pause':     '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  'card':      '<rect x="7" y="3" width="13" height="13" rx="2" transform="rotate(-8 13 9)"/><rect x="3" y="6" width="13" height="13" rx="2"/>',
  'music':     '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><circle cx="18" cy="18" r="3"/><circle cx="9" cy="15" r="3"/>',
  'mute':      '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="6" y1="18" x2="22" y2="18"/><line x1="3" y1="3" x2="21" y2="21"/>',
  'wave':      '<line x1="3" y1="12" x2="3" y2="12"/><line x1="7" y1="9" x2="7" y2="15"/><line x1="11" y1="6" x2="11" y2="18"/><line x1="15" y1="4" x2="15" y2="20"/><line x1="19" y1="8" x2="19" y2="16"/>',
  'arrow-up':  '<polyline points="6 15 12 9 18 15"/>',
  'arrow-down': '<polyline points="6 9 12 15 18 9"/>',
  'sparkle':   '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',

  // ── 分类网格大图标 ──
  'cat-dynasty':  '<path d="M4 22V8l5-2v16M11 22V10l5-2v14M18 22v-10l3-1v11"/><line x1="3" y1="22" x2="21" y2="22"/>',
  'cat-author':   '<path d="M5 4h14M5 4l-1 4c0 2 2 3 4 3M19 4l1 4c0 2-2 3-4 3M5 4c0 5 7 8 7 12 0-4 7-7 7-12M9 19h6"/>',
  'cat-grade':    '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c0 2 3 4 6 4s6-2 6-4v-5"/>',
  'cat-theme':    '<path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12z"/><line x1="12" y1="10" x2="12" y2="18"/>',

  // ── 诗库过滤 / 花园 / 状态 ──
  'check':    '<polyline points="4 12 10 18 20 6"/>',
  'heart':    '<path d="M12 21s-7-5-7-11a4 4 0 0 1 7-3 4 4 0 0 1 7 3c0 6-7 11-7 11z"/>',
  'clock':    '<circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/>',
  'trash':    '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/>',
  'chevron-right': '<polyline points="9 6 15 12 9 18"/>',
  'menu':     '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',

  // ── 花园 / 徽章 / 通用 ──
  'lock':     '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  'trophy':   '<path d="M6 3h12v2H6zM6 5v3c0 2 2 4 4 4h4c2 0 4-2 4-4V5M18 5h2l1 3c0 3-2 5-5 5h-1M6 5H4L3 8c0 3 2 5 5 5h1"/><path d="M8 15h8v4H8z"/><path d="M10 19v2h4v-2"/>'
}

function getIcon(name) {
  return ICONS[name] || ICONS['home']
}

module.exports = { ICONS, getIcon }
