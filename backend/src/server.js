const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const productRoutes = require('./routes/product');
const healthRoutes = require('./routes/health');
const redirectRoutes = require('./routes/redirect'); // 新增重定向路由
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://servicewechat.com', 'https://developers.weixin.qq.com']
    : true,
  credentials: true
}));

// 请求限制 - 基础限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: { error: '请求过于频繁，请稍后再试' }
});

// 严格限制 - 用于重定向解析
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 每个IP每分钟最多10个请求
  message: { error: '重定向解析请求过于频繁，请稍后再试' }
});

app.use('/api/', limiter);
app.use('/api/resolve-redirect', strictLimiter);
app.use('/api/batch-resolve-redirect', strictLimiter);

// 日志记录
app.use(morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  },
  skip: (req) => req.originalUrl === '/api/health' // 跳过健康检查日志
}));

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 根路径 - API信息
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '智能比价API服务',
    version: '2.0.0',
    features: [
      '商品信息解析',
      '多平台支持',
      'URL重定向跟踪',
      '短链接解析',
      '批量处理',
      '缓存优化'
    ],
    endpoints: {
      health: '/api/health',
      parseProduct: '/api/parse-product',
      batchParse: '/api/batch-parse-products',
      resolveRedirect: '/api/resolve-redirect',
      batchResolveRedirect: '/api/batch-resolve-redirect',
      urlInfo: '/api/url-info'
    }
  });
});

// 路由注册
app.use('/api/health', healthRoutes);
app.use('/api', productRoutes);
app.use('/api', redirectRoutes); // 注册重定向路由

// 错误处理
app.use(notFound);
app.use(errorHandler);

// 优雅关闭处理
const server = app.listen(PORT, () => {
  logger.info(`智能比价API服务启动成功，端口: ${PORT}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
  
  // 输出可用的API接口
  logger.info('可用的API接口:');
  logger.info('  GET  / - API信息');
  logger.info('  GET  /api/health - 健康检查');
  logger.info('  POST /api/parse-product - 解析单个商品');
  logger.info('  POST /api/batch-parse-products - 批量解析商品');
  logger.info('  POST /api/resolve-redirect - 解析URL重定向');
  logger.info('  POST /api/batch-resolve-redirect - 批量解析重定向');
  logger.info('  POST /api/url-info - 获取URL信息');
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，开始优雅关闭服务器...');
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，开始优雅关闭服务器...');
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;