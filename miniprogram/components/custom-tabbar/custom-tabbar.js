Component({
  options: { multipleSlots: true },
  properties: {
    current: { type: Number, value: 0 }  // 0/1/2/3
  },
  methods: {
    go(e) {
      const { idx, path } = e.currentTarget.dataset
      if (idx === this.properties.current) return  // 当前页不跳转
      wx.switchTab({ url: path })
    }
  }
})
