# 智能比价小程序 - 生产环境部署指南

## 系统架构概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   微信小程序     │    │   Nginx反向代理   │    │   Node.js API   │
│   (前端界面)     │◄──►│   (负载均衡)     │◄──►│   (业务逻辑)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 │                                 │
                       ▼                                 ▼                                 ▼
                ┌─────────────┐                   ┌─────────────┐                   ┌─────────────┐
                │    Redis    │                   │    MySQL    │                   │  爬虫服务群   │
                │   (缓存)    │                   │  (数据存储)  │                   │ (数据采集)   │
                └─────────────┘                   └─────────────┘                   └─────────────┘
```

## 第一阶段：后端服务部署

### 1.1 服务器准备

**推荐配置：**
- CPU: 2核心
- 内存: 4GB
- 存储: 50GB SSD
- 网络: 5Mbps带宽
- 操作系统: Ubuntu 20.04 LTS

**安装基础环境：**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装MySQL 8.0
sudo apt install mysql-server -y

# 安装Redis
sudo apt install redis-server -y

# 安装Nginx
sudo apt install nginx -y

# 安装PM2进程管理器
sudo npm install -g pm2
```

### 1.2 代码部署

```bash
# 克隆代码仓库
git clone <你的仓库地址>
cd smart-compare-project/backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
vim .env
```

**环境配置示例：**
```env
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=smart_user
DB_PASSWORD=安全密码
DB_NAME=smart_compare

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=Redis密码

# 其他配置
LOG_LEVEL=info
SCRAPER_TIMEOUT=30000
```

### 1.3 数据库初始化

```bash
# 创建数据库和用户
sudo mysql << EOF
CREATE DATABASE smart_compare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smart_user'@'localhost' IDENTIFIED BY '安全密码';
GRANT ALL PRIVILEGES ON smart_compare.* TO 'smart_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 启动服务（自动创建表结构）
npm start
```

### 1.4 Nginx配置

```nginx
# /etc/nginx/sites-available/smart-compare
server {
    listen 80;
    server_name your-domain.com;
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/api/health;
    }
    
    # 静态文件
    location / {
        return 404;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/smart-compare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 第二阶段：SSL证书配置

### 2.1 申请Let's Encrypt证书

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2.2 更新Nginx配置

Certbot会自动更新Nginx配置，添加HTTPS重定向。

## 第三阶段：小程序配置

### 3.1 更新API地址

编辑小程序项目中的 `utils/api.js`：

```javascript
// 替换为实际域名
const BASE_URL = 'https://your-domain.com'
```

### 3.2 微信小程序后台配置

1. 登录微信公众平台 (mp.weixin.qq.com)
2. 进入"开发"-"开发管理"-"开发设置"
3. 配置服务器域名：
   - request合法域名：`https://your-domain.com`
   - 业务域名：`your-domain.com`

### 3.3 提交审核

1. 上传代码到微信开发者工具
2. 预览测试确保功能正常
3. 提交审核
4. 审核通过后发布

## 第四阶段：监控和维护

### 4.1 PM2进程管理

```bash
# 启动服务
pm2 start src/server.js --name "smart-compare-api"

# 查看状态
pm2 status

# 查看日志
pm2 logs smart-compare-api

# 重启服务
pm2 restart smart-compare-api

# 开机自启
pm2 startup
pm2 save
```

### 4.2 日志监控

```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 4.3 性能监控

```bash
# 安装监控工具
npm install -g clinic

# 性能分析
clinic doctor -- node src/server.js

# 数据库性能
mysql -u root -p -e "SHOW PROCESSLIST;"
```

### 4.4 备份策略

```bash
# 数据库备份脚本 /etc/cron.daily/backup-db
#!/bin/bash
mysqldump -u smart_user -p密码 smart_compare > /backup/smart_compare_$(date +%Y%m%d).sql
find /backup -name "smart_compare_*.sql" -mtime +7 -delete

# 设置权限
sudo chmod +x /etc/cron.daily/backup-db
```

## 第五阶段：安全加固

### 5.1 防火墙配置

```bash
# 安装UFW
sudo apt install ufw -y

# 配置规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# 启用防火墙
sudo ufw enable
```

### 5.2 安全更新

```bash
# 自动安全更新
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 5.3 访问控制

```bash
# 限制SSH访问
sudo vim /etc/ssh/sshd_config
# 添加: AllowUsers your-username
# 修改: PasswordAuthentication no (使用密钥登录)

sudo systemctl restart ssh
```

## 第六阶段：扩展和优化

### 6.1 负载均衡

当单台服务器无法满足需求时：

```bash
# 启动多个API实例
pm2 start src/server.js -i max --name "smart-compare-api"

# 或者部署到多台服务器
# 更新Nginx配置支持upstream
```

### 6.2 CDN配置

配置CDN加速图片和静态资源访问。

### 6.3 数据库优化

```sql
-- 创建索引优化查询
CREATE INDEX idx_products_platform_price ON products(platform, price);
CREATE INDEX idx_price_history_product_date ON price_history(product_id, recorded_at);

-- 分区表（大数据量时）
ALTER TABLE price_history PARTITION BY RANGE (YEAR(recorded_at));
```

## 故障排查指南

### 常见问题

1. **API 502错误**
   - 检查Node.js进程状态：`pm2 status`
   - 检查端口占用：`netstat -tulpn | grep 3000`

2. **数据库连接失败**
   - 检查MySQL服务：`sudo systemctl status mysql`
   - 检查连接配置：`mysql -u smart_user -p`

3. **Redis连接失败**
   - 检查Redis服务：`sudo systemctl status redis`
   - 测试连接：`redis-cli ping`

4. **爬虫被反爬**
   - 调整请求频率
   - 更换User-Agent
   - 使用代理IP

### 性能调优

```bash
# 系统资源监控
htop
iostat -x 1
free -h

# 数据库性能
mysql -u root -p -e "SHOW GLOBAL STATUS LIKE 'Slow_queries';"

# API响应时间
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/health
```

## 总结

通过以上步骤，你将拥有一个完整的生产级智能比价小程序系统：

- ✅ 高可用的后端API服务
- ✅ 安全的HTTPS数据传输
- ✅ 完善的监控和日志系统
- ✅ 自动化的部署和备份
- ✅ 可扩展的架构设计

系统具备处理真实用户请求的能力，支持后续功能扩展和性能优化。