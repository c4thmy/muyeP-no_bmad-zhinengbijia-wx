const logger = require('../utils/logger');

// 404错误处理
const notFound = (req, res, next) => {
  const error = new Error(`接口不存在 - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// 全局错误处理
const errorHandler = (error, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = error.message;

  // 记录错误日志
  logger.error(`API错误 [${req.method} ${req.originalUrl}]:`, {
    message: error.message,
    stack: error.stack,
    statusCode,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 根据错误类型设置状态码和消息
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '访问未授权';
  } else if (error.code === 'ENOTFOUND') {
    statusCode = 503;
    message = '网络连接失败';
  } else if (error.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = '请求超时';
  }

  // 生产环境下不暴露详细错误信息
  const response = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  };

  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler
};