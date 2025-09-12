// URL解析规则 - 与前端保持一致
const PLATFORMS = {
  TAOBAO: {
    name: '淘宝',
    patterns: [
      /(?:item\.)?taobao\.com\/item\.htm/i,
      /(?:detail\.)?taobao\.com\/item\.htm/i,
      /h5\.m\.taobao\.com\/awp\/core\/detail\.htm/i,
      /e\.tb\.cn\/h\./i,  // 淘宝短链接
      /s\.click\.taobao\.com/i,  // 淘宝分享链接
      /uland\.taobao\.com/i,  // 淘宝联盟链接
      /m\.tb\.cn/i  // 淘宝手机短链接
    ],
    paramExtractors: {
      id: /id[=\/](\d+)/i,
      tk: /tk=([^&\s]+)/i  // 短链接token
    }
  },
  
  TMALL: {
    name: '天猫',
    patterns: [
      /(?:detail\.)?tmall\.com\/item\.htm/i,
      /(?:detail\.)?tmall\.hk\/item\.htm/i,
      /h5\.m\.tmall\.com\/awp\/core\/detail\.htm/i,
      /e\.tb\.cn\/h\./i,  // 天猫也可能使用淘宝短链接
      /s\.click\.tmall\.com/i,  // 天猫分享链接
      /uland\.tmall\.com/i  // 天猫联盟链接
    ],
    paramExtractors: {
      id: /id[=\/](\d+)/i,
      tk: /tk=([^&\s]+)/i
    }
  },
  
  JD: {
    name: '京东',
    patterns: [
      /(?:item\.)?jd\.com\/(\d+)\.html/i,
      /(?:item\.)?jd\.hk\/(\d+)\.html/i,
      /item\.m\.jd\.com\/product\/\d+\.html/i,  // 京东手机端
      /h5\.m\.jd\.com\/dev/i,
      /u\.jd\.com/i,  // 京东短链接
      /3\.cn/i  // 京东短链接
    ],
    paramExtractors: {
      id: /(?:jd\.com|product)\/(\d+)\.html/i,  // 兼容PC和手机端
      sku: /sku=(\d+)/i,
      utm_source: /utm_source=([^&]+)/i,
      utm_campaign: /utm_campaign=([^&]+)/i
    }
  },
  
  PINDUODUO: {
    name: '拼多多',
    patterns: [
      /(?:mobile\.)?yangkeduo\.com\/goods\.html/i,
      /(?:mobile\.)?pdd\.com\/goods\.html/i,
      /p\.pinduoduo\.com/i,  // 拼多多短链接
      /mobile\.pdd\.cn/i,  // 拼多多手机短链接
      /pdd\.cn/i  // 拼多多短链接域名
    ],
    paramExtractors: {
      goods_id: /goods_id[=\/](\d+)/i,
      goods_sign: /goods_sign=([^&]+)/i
    }
  }
};

class UrlParser {
  // 解析URL并返回平台信息
  parseUrl(url) {
    try {
      if (!url || typeof url !== 'string') {
        return {
          valid: false,
          error: 'URL不能为空',
          platform: null,
          originalUrl: url,
          cleanUrl: '',
          params: {}
        };
      }

      const cleanUrl = this.cleanUrl(url);
      
      // 检查是否为有效URL格式
      if (!this.isValidUrlFormat(cleanUrl)) {
        return {
          valid: false,
          error: '请输入有效的商品链接',
          platform: null,
          originalUrl: url,
          cleanUrl,
          params: {}
        };
      }

      // 识别平台
      const platform = this.identifyPlatform(cleanUrl);
      if (!platform) {
        return {
          valid: false,
          error: '暂不支持该电商平台，目前支持：淘宝、天猫、京东、拼多多',
          platform: null,
          originalUrl: url,
          cleanUrl,
          params: {}
        };
      }

      // 提取参数
      const params = this.extractParams(cleanUrl, platform);

      return {
        valid: true,
        error: null,
        platform,
        originalUrl: url,
        cleanUrl,
        params
      };

    } catch (error) {
      return {
        valid: false,
        error: '链接解析失败：' + error.message,
        platform: null,
        originalUrl: url,
        cleanUrl: '',
        params: {}
      };
    }
  }

  // 清理URL
  cleanUrl(url) {
    if (!url) return '';
    
    let cleanUrl = url.trim();
    
    // 添加协议
    if (cleanUrl.startsWith('//')) {
      cleanUrl = 'https:' + cleanUrl;
    } else if (!cleanUrl.match(/^https?:\/\//)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    // 移除追踪参数
    try {
      const urlObj = new URL(cleanUrl);
      
      // 保留重要参数
      const keepParams = ['id', 'goods_id', 'skuId', 'item_id'];
      const searchParams = new URLSearchParams();
      
      for (const [key, value] of urlObj.searchParams) {
        if (keepParams.includes(key) || keepParams.some(param => key.toLowerCase().includes(param))) {
          searchParams.set(key, value);
        }
      }
      
      urlObj.search = searchParams.toString();
      return urlObj.toString();
      
    } catch {
      // 如果URL解析失败，返回原始清理后的URL
      return cleanUrl.split('?')[0] + (cleanUrl.includes('id=') ? '?' + cleanUrl.split('?')[1] : '');
    }
  }

  // 检查URL格式有效性
  isValidUrlFormat(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 识别电商平台
  identifyPlatform(url) {
    for (const [key, platform] of Object.entries(PLATFORMS)) {
      for (const pattern of platform.patterns) {
        if (pattern.test(url)) {
          return {
            key,
            ...platform
          };
        }
      }
    }
    return null;
  }

  // 提取URL参数
  extractParams(url, platform) {
    const params = {};
    
    try {
      // 使用平台特定的参数提取器
      for (const [paramName, extractor] of Object.entries(platform.paramExtractors)) {
        const match = url.match(extractor);
        if (match && match[1]) {
          params[paramName] = match[1];
        }
      }

      // 从查询字符串中提取参数
      const urlObj = new URL(url);
      for (const [key, value] of urlObj.searchParams) {
        if (value && !params[key]) {
          params[key] = value;
        }
      }

    } catch (error) {
      console.warn('参数提取失败:', error);
    }

    return params;
  }

  // 验证URL是否为支持的平台
  isSupported(url) {
    const result = this.parseUrl(url);
    return result.valid;
  }

  // 获取支持的平台列表
  getSupportedPlatforms() {
    return Object.values(PLATFORMS).map(platform => platform.name);
  }
}

module.exports = new UrlParser();