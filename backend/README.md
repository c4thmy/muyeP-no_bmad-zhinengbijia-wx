# 智能比价后端API服务 - 部署指南

## 快速部署

### 1. 环境准备

```bash
# 克隆代码
cd backend

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env

# 编辑环境配置
vim .env
```

### 2. 数据库设置

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE smart_compare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 启动服务（自动创建表）
npm start
```

### 3. Redis安装

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# CentOS/RHEL
sudo yum install redis

# 启动Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 使用PM2管理进程
npm install -g pm2
pm2 start src/server.js --name "smart-compare-api"
```

## API接口文档

### 商品解析

**POST /api/products/parse**

请求体：
```json
{
  "url": "https://item.taobao.com/item.htm?id=123456"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "title": "商品标题",
    "price": "999.00",
    "platform": "淘宝",
    "image": "图片URL",
    "params": {...}
  },
  "message": "商品解析成功"
}
```

### 批量解析

**POST /api/products/parse-batch**

请求体：
```json
{
  "urls": [
    "https://item.taobao.com/item.htm?id=123456",
    "https://item.jd.com/789.html"
  ]
}
```

### 价格历史

**GET /api/products/price-history/:productId?days=30**

### 健康检查

**GET /api/health**

## 监控和维护

### 日志文件
- `logs/app.log` - 应用日志
- `logs/error.log` - 错误日志  
- `logs/access.log` - 访问日志

### 性能监控
```bash
# 查看PM2状态
pm2 status

# 查看日志
pm2 logs smart-compare-api

# 重启服务
pm2 restart smart-compare-api
```

### 数据库维护
```bash
# 清理过期数据
mysql -u root -p smart_compare -e "DELETE FROM price_history WHERE recorded_at < DATE_SUB(NOW(), INTERVAL 90 DAY);"
```

## 安全配置

### Nginx反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL证书
```bash
# 使用Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 扩展功能

### 1. 增加平台支持
- 在 `src/scrapers/` 目录添加新的爬虫类
- 在 `src/utils/urlParser.js` 中添加平台识别规则
- 在 `src/scrapers/index.js` 中注册新爬虫

### 2. 添加缓存预热
```javascript
// 定时任务预热热门商品
setInterval(async () => {
  const popularProducts = await database.getPopularProducts();
  // 重新爬取更新缓存
}, 3600000); // 每小时执行一次
```

### 3. 价格监控
```javascript
// 价格变动通知
const checkPriceChanges = async () => {
  // 检查价格变动逻辑
  // 发送通知给关注用户
};
```

## 故障排除

### 常见问题
1. **数据库连接失败** - 检查数据库服务状态和连接配置
2. **Redis连接失败** - 检查Redis服务状态  
3. **爬虫被反爬** - 调整请求频率和User-Agent
4. **内存使用过高** - 检查缓存设置和数据清理

### 性能优化
- 启用数据库索引
- 调整缓存TTL时间
- 使用连接池
- 实现请求去重

## 更新部署

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重启服务
pm2 restart smart-compare-api

# 检查服务状态
pm2 status
```