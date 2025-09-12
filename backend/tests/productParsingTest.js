const productService = require('../src/services/productService');
const logger = require('../src/utils/logger');

// 测试商品链接
const testUrls = [
  'https://item.taobao.com/item.htm?id=123456789',
  'https://detail.tmall.com/item.htm?id=987654321',
  'https://item.jd.com/12345.html',
  'https://mobile.yangkeduo.com/goods.html?goods_id=54321'
];

async function testProductParsing() {
  logger.info('开始测试商品解析功能...');
  
  for (const url of testUrls) {
    try {
      logger.info(`测试解析: ${url}`);
      
      const startTime = Date.now();
      const product = await productService.parseProduct(url);
      const endTime = Date.now();
      
      logger.info(`解析成功 (${endTime - startTime}ms):`, {
        id: product.id,
        title: product.title,
        price: product.price,
        platform: product.platform,
        paramsCount: Object.keys(product.params).length
      });
      
    } catch (error) {
      logger.error(`解析失败 [${url}]: ${error.message}`);
    }
    
    // 添加延迟避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  logger.info('测试完成');
}

async function testBatchParsing() {
  logger.info('开始测试批量解析功能...');
  
  try {
    const startTime = Date.now();
    const result = await productService.parseMultipleProducts(testUrls);
    const endTime = Date.now();
    
    logger.info(`批量解析完成 (${endTime - startTime}ms):`, {
      total: result.summary.total,
      success: result.summary.success,
      failed: result.summary.failed
    });
    
    result.products.forEach(product => {
      logger.info(`成功商品: ${product.title} - ${product.price}元`);
    });
    
    result.errors.forEach(error => {
      logger.warn(`失败链接: ${error.url} - ${error.error}`);
    });
    
  } catch (error) {
    logger.error(`批量解析失败: ${error.message}`);
  }
}

async function runTests() {
  try {
    // 单个解析测试
    await testProductParsing();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 批量解析测试
    await testBatchParsing();
    
  } catch (error) {
    logger.error('测试执行失败:', error);
  } finally {
    process.exit(0);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  testProductParsing,
  testBatchParsing,
  runTests
};