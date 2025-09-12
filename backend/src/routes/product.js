const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const { validateProductUrl, validateBatchUrls } = require('../middleware/validation');
const logger = require('../utils/logger');

// 单个商品解析
router.post('/parse', validateProductUrl, async (req, res) => {
  try {
    const { url } = req.body;
    logger.info(`解析商品请求: ${url}`);
    
    const product = await productService.parseProduct(url);
    
    res.json({
      success: true,
      data: product,
      message: '商品解析成功'
    });
  } catch (error) {
    logger.error('商品解析失败:', error);
    res.status(400).json({
      success: false,
      error: error.message || '商品解析失败'
    });
  }
});

// 批量商品解析
router.post('/parse-batch', validateBatchUrls, async (req, res) => {
  try {
    const { urls } = req.body;
    logger.info(`批量解析商品请求: ${urls.length} 个链接`);
    
    const products = await productService.parseMultipleProducts(urls);
    
    res.json({
      success: true,
      data: products,
      message: `成功解析 ${products.length} 个商品`
    });
  } catch (error) {
    logger.error('批量解析失败:', error);
    res.status(400).json({
      success: false,
      error: error.message || '批量解析失败'
    });
  }
});

// 商品价格历史
router.get('/price-history/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;
    
    const history = await productService.getPriceHistory(productId, days);
    
    res.json({
      success: true,
      data: history,
      message: '价格历史获取成功'
    });
  } catch (error) {
    logger.error('价格历史获取失败:', error);
    res.status(400).json({
      success: false,
      error: error.message || '价格历史获取失败'
    });
  }
});

// 商品详情
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await productService.getProductById(productId);
    
    res.json({
      success: true,
      data: product,
      message: '商品详情获取成功'
    });
  } catch (error) {
    logger.error('商品详情获取失败:', error);
    res.status(404).json({
      success: false,
      error: error.message || '商品不存在'
    });
  }
});

module.exports = router;