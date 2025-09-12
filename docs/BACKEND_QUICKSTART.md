# 智能比价后端服务

## 快速启动指南

### 1. 环境准备
```bash
# 安装Node.js (推荐v16+)
# 创建项目目录
mkdir smart-compare-api
cd smart-compare-api

# 初始化项目
npm init -y

# 安装依赖
npm install express cors helmet morgan dotenv
npm install cheerio axios puppeteer redis mysql2
npm install --save-dev nodemon

# 开发启动
npm run dev
```

### 2. 项目结构
```
smart-compare-api/
├── src/
│   ├── controllers/     # 控制器
│   ├── services/       # 业务逻辑
│   ├── models/         # 数据模型
│   ├── middleware/     # 中间件
│   ├── utils/          # 工具函数
│   └── routes/         # 路由
├── config/             # 配置文件
├── logs/              # 日志文件
└── tests/             # 测试文件
```

### 3. 核心API接口

#### 商品解析接口
```javascript
POST /api/parse-product
{
  "url": "https://item.taobao.com/item.htm?id=123456"
}

Response:
{
  "success": true,
  "data": {
    "title": "商品标题",
    "price": "999.00",
    "image": "图片URL",
    "platform": "淘宝",
    "params": {...}
  }
}
```

#### 批量解析接口
```javascript
POST /api/parse-products
{
  "urls": ["url1", "url2", "url3"]
}
```

#### 健康检查
```javascript
GET /api/health
```

### 4. 部署配置

#### 环境变量 (.env)
```
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=smart_compare

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 安全配置
JWT_SECRET=your-secret-key
```

#### Docker配置 (可选)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 5. 数据库设计

#### 商品表 (products)
```sql
CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  price DECIMAL(10,2),
  platform VARCHAR(20),
  url TEXT,
  image_url TEXT,
  params JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 价格历史表 (price_history)
```sql
CREATE TABLE price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(50),
  price DECIMAL(10,2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 6. 反爬虫策略

- User-Agent轮换
- 代理IP池
- 请求频率限制
- 验证码处理
- 会话管理

### 7. 监控和日志

- API响应时间监控
- 错误率统计
- 访问日志记录
- 性能指标收集

### 8. 安全措施

- CORS跨域配置
- 请求频率限制
- 输入数据验证
- SQL注入防护
- XSS攻击防护

## 快速部署到云服务器

### 腾讯云部署
1. 购买云服务器CVM
2. 配置安全组（开放3000端口）
3. 安装Node.js和PM2
4. 克隆代码并启动服务

### 阿里云部署  
1. 购买ECS实例
2. 配置域名和SSL证书
3. 使用PM2进行进程管理
4. 配置Nginx反向代理

### 使用Docker部署
```bash
# 构建镜像
docker build -t smart-compare-api .

# 运行容器
docker run -d -p 3000:3000 --name api smart-compare-api
```

## 开发建议

1. **从MVP开始**：先实现基础的商品解析功能
2. **逐步优化**：添加缓存、反爬、监控等高级功能  
3. **注重安全**：严格验证输入，防止恶意攻击
4. **监控运维**：建立完善的日志和监控体系
5. **合规运营**：遵守相关法律法规，尊重网站robots.txt