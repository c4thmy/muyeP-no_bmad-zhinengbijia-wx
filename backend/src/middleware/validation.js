const Joi = require('joi');

// 商品URL验证
const validateProductUrl = (req, res, next) => {
  const schema = Joi.object({
    url: Joi.string().uri().required().messages({
      'string.uri': '请提供有效的商品链接',
      'any.required': '商品链接不能为空'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

// 批量URL验证
const validateBatchUrls = (req, res, next) => {
  const schema = Joi.object({
    urls: Joi.array()
      .items(Joi.string().uri())
      .min(1)
      .max(10)
      .required()
      .messages({
        'array.min': '至少需要提供1个商品链接',
        'array.max': '最多支持批量解析10个商品链接',
        'any.required': '商品链接列表不能为空'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

// 价格历史查询验证
const validatePriceHistoryQuery = (req, res, next) => {
  const schema = Joi.object({
    days: Joi.number().integer().min(1).max(365).optional().default(30)
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validateProductUrl,
  validateBatchUrls,
  validatePriceHistoryQuery
};