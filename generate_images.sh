#!/bin/bash

# 快速图片资源生成脚本
# 使用纯色背景创建基础图片，用于临时替代

echo "开始生成基础图片资源..."

# 创建目录
mkdir -p images/mock

# 生成SVG占位图片的内容

# 商品占位图 (400x400)
cat > images/placeholder.png.svg << 'EOF'
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f0f0f0"/>
  <rect x="50" y="150" width="300" height="100" rx="10" fill="#ddd"/>
  <text x="200" y="210" text-anchor="middle" fill="#999" font-size="18" font-family="Arial">商品图片</text>
  <circle cx="120" cy="280" r="15" fill="#4CAF50"/>
  <circle cx="200" cy="280" r="15" fill="#4CAF50"/>
  <circle cx="280" cy="280" r="15" fill="#4CAF50"/>
</svg>
EOF

# TabBar图标 - 比价 (81x81)
cat > images/compare.png.svg << 'EOF'
<svg width="81" height="81" xmlns="http://www.w3.org/2000/svg">
  <rect width="81" height="81" fill="none"/>
  <rect x="15" y="20" width="20" height="30" fill="#666" rx="2"/>
  <rect x="46" y="15" width="20" height="35" fill="#666" rx="2"/>
  <text x="40" y="65" text-anchor="middle" fill="#666" font-size="10">比价</text>
</svg>
EOF

# TabBar图标 - 比价激活态 (81x81)
cat > images/compare-active.png.svg << 'EOF'
<svg width="81" height="81" xmlns="http://www.w3.org/2000/svg">
  <rect width="81" height="81" fill="none"/>
  <rect x="15" y="20" width="20" height="30" fill="#4CAF50" rx="2"/>
  <rect x="46" y="15" width="20" height="35" fill="#4CAF50" rx="2"/>
  <text x="40" y="65" text-anchor="middle" fill="#4CAF50" font-size="10">比价</text>
</svg>
EOF

# TabBar图标 - 结果 (81x81)
cat > images/result.png.svg << 'EOF'
<svg width="81" height="81" xmlns="http://www.w3.org/2000/svg">
  <rect width="81" height="81" fill="none"/>
  <rect x="20" y="15" width="40" height="35" fill="none" stroke="#666" stroke-width="2" rx="3"/>
  <line x1="25" y1="25" x2="55" y2="25" stroke="#666" stroke-width="1"/>
  <line x1="25" y1="30" x2="50" y2="30" stroke="#666" stroke-width="1"/>
  <line x1="25" y1="35" x2="45" y2="35" stroke="#666" stroke-width="1"/>
  <text x="40" y="65" text-anchor="middle" fill="#666" font-size="10">结果</text>
</svg>
EOF

# TabBar图标 - 结果激活态 (81x81)
cat > images/result-active.png.svg << 'EOF'
<svg width="81" height="81" xmlns="http://www.w3.org/2000/svg">
  <rect width="81" height="81" fill="none"/>
  <rect x="20" y="15" width="40" height="35" fill="none" stroke="#4CAF50" stroke-width="2" rx="3"/>
  <line x1="25" y1="25" x2="55" y2="25" stroke="#4CAF50" stroke-width="1"/>
  <line x1="25" y1="30" x2="50" y2="30" stroke="#4CAF50" stroke-width="1"/>
  <line x1="25" y1="35" x2="45" y2="35" stroke="#4CAF50" stroke-width="1"/>
  <text x="40" y="65" text-anchor="middle" fill="#4CAF50" font-size="10">结果</text>
</svg>
EOF

# 平台图标 - 淘宝 (48x48)
cat > images/taobao.png.svg << 'EOF'
<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#FF6900" rx="8"/>
  <text x="24" y="30" text-anchor="middle" fill="white" font-size="14" font-weight="bold">淘</text>
</svg>
EOF

# 平台图标 - 天猫 (48x48)
cat > images/tmall.png.svg << 'EOF'
<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#FF0036" rx="8"/>
  <text x="24" y="30" text-anchor="middle" fill="white" font-size="14" font-weight="bold">猫</text>
</svg>
EOF

# 平台图标 - 京东 (48x48)
cat > images/jd.png.svg << 'EOF'
<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#E93323" rx="8"/>
  <text x="24" y="30" text-anchor="middle" fill="white" font-size="14" font-weight="bold">京</text>
</svg>
EOF

# 平台图标 - 拼多多 (48x48)
cat > images/pdd.png.svg << 'EOF'
<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#E02020" rx="8"/>
  <text x="24" y="30" text-anchor="middle" fill="white" font-size="14" font-weight="bold">拼</text>
</svg>
EOF

# 空状态图 (200x200)
cat > images/empty-compare.png.svg << 'EOF'
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="none"/>
  <circle cx="100" cy="80" r="30" fill="none" stroke="#ddd" stroke-width="3"/>
  <line x1="85" y1="65" x2="85" y2="75" stroke="#ddd" stroke-width="2"/>
  <line x1="115" y1="65" x2="115" y2="75" stroke="#ddd" stroke-width="2"/>
  <path d="M 80 95 Q 100 105 120 95" fill="none" stroke="#ddd" stroke-width="2"/>
  <text x="100" y="140" text-anchor="middle" fill="#999" font-size="16">暂无比较商品</text>
  <text x="100" y="160" text-anchor="middle" fill="#ccc" font-size="12">请先添加商品链接</text>
</svg>
EOF

# 模拟商品图片
for product in iphone15 mate60 mi14 findx7 vivox100 realmegt5 magic6 oneplus12; do
  cat > images/mock/${product}.jpg.svg << EOF
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f8f8f8"/>
  <rect x="50" y="150" width="300" height="100" rx="10" fill="#e0e0e0"/>
  <text x="200" y="210" text-anchor="middle" fill="#666" font-size="18" font-family="Arial">${product}</text>
</svg>
EOF
done

echo "图片资源生成完成！"
echo ""
echo "注意：生成的是SVG文件，在实际使用时需要："
echo "1. 将.svg文件转换为对应的.png/.jpg文件"
echo "2. 或者使用在线工具/AI生成真实图片"
echo "3. 确保图片尺寸符合微信小程序要求"