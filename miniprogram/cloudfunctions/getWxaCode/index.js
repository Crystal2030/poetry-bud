// =============================================================
// 云函数：生成带 scene 参数的小程序码（扫码直达诗词详情页）
//
// 使用前：
//   1. 在微信开发者工具中开通「云开发」
//   2. 把本目录（getWxaCode）右键「上传并部署：云端安装依赖」
//   3. 密钥已写入本目录 config.json（部署时随包上传），云端可直接用；
//      也可改用环境变量覆盖：WX_APPID / WX_APPSECRET
//
// 返回：{ code: 0, base64: "data:image/png;base64,..." }
//       { code: <0, msg: 错误信息 }
// =============================================================

const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 读取本地 config.json（部署时随目录一起打包，云端可直接用）
// 环境变量优先级更高；config.json 兜底，避免每次手动配环境变量
let CFG = {}
try { CFG = require('./config.json') || {} } catch (e) { CFG = {} }

const APPID = process.env.WX_APPID || CFG.appid || 'wxf4e0cd9bb42be3ac'
const APPSECRET = process.env.WX_APPSECRET || CFG.appsecret || ''

/** GET 请求（返回 JSON） */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(new Error('解析失败: ' + data.slice(0, 120))) }
      })
    }).on('error', reject)
  })
}

/** POST 请求（返回二进制 Buffer） */
function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }
    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

exports.main = async (event) => {
  const poemId = event && event.poemId
  if (!poemId) return { code: -1, msg: '缺少 poemId' }
  if (!APPSECRET) return { code: -2, msg: '未配置 WX_APPSECRET 环境变量' }

  try {
    // 1. 换取 access_token
    const tokenRes = await httpsGet(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`
    )
    if (!tokenRes.access_token) {
      return { code: -3, msg: '获取 access_token 失败: ' + (tokenRes.errmsg || JSON.stringify(tokenRes)) }
    }

    // 2. 生成小程序码（scene 最长 32 字符，page 需已发布）
    const body = JSON.stringify({
      scene: 'id=' + poemId,        // 扫码后 detail 页 onLoad 通过 options.scene 接收
      page: 'pages/detail/detail',
      width: 280,                    // 280px，2x 高清，适合 96px 卡片显示
      check_path: false,             // 不校验 page 是否发布，避免开发期报错
      env_version: 'release'
    })
    const buf = await httpsPost(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${tokenRes.access_token}`,
      body
    )

    // 3. 微信出错时返回的是 JSON（以 '{' 开头），成功才是图片二进制
    if (buf.length > 0 && buf[0] === 0x7b /* '{' */) {
      const err = JSON.parse(buf.toString())
      return { code: -4, msg: '生成小程序码失败: ' + (err.errmsg || buf.toString()) }
    }

    return { code: 0, base64: 'data:image/png;base64,' + buf.toString('base64') }
  } catch (e) {
    return { code: -5, msg: '异常: ' + (e && e.message ? e.message : String(e)) }
  }
}
