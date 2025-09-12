# 微信小程序网络请求域名配置指南

## 问题说明

微信小程序为了安全考虑，只允许与指定的域名进行网络通信。当尝试请求未配置的域名时，会出现以下错误：

```
Error: module 'utils/axios.js' is not defined, require args is 'axios'
```

或

```
request:fail url not in domain list
```

## 解决方案

### 方案一：配置合法域名（推荐开发测试）

1. 登录微信公众平台 (mp.weixin.qq.com)
2. 进入小程序管理后台
3. 点击「开发」→「开发管理」→「开发设置」
4. 在「服务器域名」中配置以下request合法域名：

```
https://item.jd.com
https://item.m.jd.com
https://detail.tmall.com
https://h5.m.tmall.com
https://item.taobao.com
https://h5.m.taobao.com
https://mobile.yangkeduo.com
https://yangkeduo.com
https://e.tb.cn
https://s.click.taobao.com
https://uland.taobao.com
https://m.tb.cn
https://u.jd.com
https://3.cn
https://p.pinduoduo.com
https://pdd.cn
https://mobile.pdd.cn
```

### 方案二：开发工具设置（仅用于开发调试）

1. 在微信开发者工具中
2. 点击右上角「详情」
3. 在「本地设置」中勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」

**注意：此方案仅在开发工具中有效，真机运行仍需配置合法域名**

### 方案三：后端代理（生产环境推荐）

创建后端API服务，代理商品信息获取：

```javascript
// 后端API示例 (Node.js/Express)
app.get('/api/product/parse', async (req, res) => {
  const { url } = req.query
  
  try {
    // 后端直接请求电商网站
    const productInfo = await realProductScraper.scrapeProduct(url, platform)
    res.json({ success: true, data: productInfo })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})
```

小程序中调用后端API：

```javascript
// 小程序中的请求
wx.request({
  url: 'https://你的后端域名.com/api/product/parse',
  data: { url: productUrl },
  success: (res) => {
    if (res.data.success) {
      // 处理商品信息
      console.log(res.data.data)
    }
  }
})
```

## 当前系统适配

系统已经做了以下适配：

1. **自动检测环境**：检测是否在微信小程序环境中运行
2. **替代HTTP客户端**：使用`wx.request`替代`axios`
3. **域名限制处理**：当检测到域名限制时，提供配置指导
4. **错误提示优化**：提供用户友好的错误信息和解决建议

## 使用建议

- **开发阶段**：使用方案二，关闭域名校验进行快速开发
- **测试阶段**：使用方案一，配置必要的域名进行真机测试
- **生产环境**：使用方案三，通过后端代理确保稳定性和安全性

## 注意事项

1. 每个小程序最多可配置20个request域名
2. 域名配置后需要重新发布小程序才能生效
3. 短链接重定向可能涉及多个域名，需要逐一配置
4. 电商网站可能有反爬虫机制，建议使用后端代理