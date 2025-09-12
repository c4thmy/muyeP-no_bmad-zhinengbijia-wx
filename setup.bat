# 快速启动脚本 - 创建占位图片

echo "正在创建占位图片文件..."

# 创建SVG占位图片（这些在微信开发者工具中会显示为占位图）
cat > images/placeholder.png << 'EOF'
<!-- 商品占位图 -->
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f5f5f5"/>
  <text x="200" y="200" text-anchor="middle" fill="#999" font-size="16">商品图片</text>
</svg>
EOF

# 创建其他必需的占位文件
touch images/compare.png
touch images/compare-active.png  
touch images/result.png
touch images/result-active.png
touch images/empty-compare.png
touch images/share-image.png
touch images/share-compare.png
touch images/taobao.png
touch images/tmall.png
touch images/jd.png
touch images/pdd.png

# 模拟商品图片
touch images/mock/iphone15.jpg
touch images/mock/mate60.jpg
touch images/mock/mi14.jpg
touch images/mock/findx7.jpg
touch images/product-placeholder.png

echo "占位图片创建完成！"
echo "注意：这些是空文件，在实际使用时请替换为真实图片。"