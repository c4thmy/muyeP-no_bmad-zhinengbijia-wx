const winston = require('winston');
const path = require('path');

// 创建日志目录
const logDir = path.join(__dirname, '../../logs');

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    // 添加元数据
    if (Object.keys(meta).length > 0) {
      logMessage += '\n' + JSON.stringify(meta, null, 2);
    }
    
    // 添加错误堆栈
    if (stack) {
      logMessage += '\n' + stack;
    }
    
    return logMessage;
  })
);

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),

    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
      tailable: true
    }),

    // 访问日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    })
  ]
});

// 开发环境下输出更详细的日志
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 添加请求日志方法
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP请求异常', logData);
  } else {
    logger.http('HTTP请求', logData);
  }
};

// 添加爬虫日志方法
logger.logScraper = (platform, url, success, responseTime, error = null) => {
  const logData = {
    platform,
    url,
    success,
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString()
  };

  if (error) {
    logData.error = error.message;
    logger.error(`爬虫失败 [${platform}]`, logData);
  } else {
    logger.info(`爬虫成功 [${platform}]`, logData);
  }
};

// 添加性能监控日志方法
logger.logPerformance = (operation, duration, metadata = {}) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    ...metadata,
    timestamp: new Date().toISOString()
  };

  if (duration > 5000) { // 超过5秒记录为警告
    logger.warn('性能警告', logData);
  } else {
    logger.info('性能监控', logData);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : null,
    promise: promise.toString()
  });
});

module.exports = logger;