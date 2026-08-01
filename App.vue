<script>
export default {
  onLaunch() {
    console.log('🌸 诗芽 PoetryBud 启动')
  },
  onShow() {},
  onHide() {}
}
</script>

<style lang="scss">
/* 全局样式变量 */
page {
  --ink: #2C2A26;
  --ink-soft: #5A5347;
  --paper: #F4EBDA;
  --paper-warm: #EDE0C8;
  --seal: #C0553F;
  --gold: #C9A24B;
  --jade: #3E5C6B;
  --moss: #6E8A5E;
  --moss-deep: #4C6B47;
  --clay: #C98B5A;
  --clay-deep: #A66A3C;
  --lotus: #D9A6A0;
  --shadow: rgba(43, 42, 40, 0.2);
  --snow: #E8EEF2;

  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #E8E2D6;
  color: var(--ink);
  height: 100vh;
  overflow: hidden;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
