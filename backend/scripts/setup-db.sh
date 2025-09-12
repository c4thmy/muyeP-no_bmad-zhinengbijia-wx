# 启动开发数据库脚本

echo "创建开发用数据库..."
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS smart_compare_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'smart_user'@'localhost' IDENTIFIED BY 'smart_password';
GRANT ALL PRIVILEGES ON smart_compare_dev.* TO 'smart_user'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "数据库创建完成！"
echo "数据库名: smart_compare_dev"
echo "用户名: smart_user"
echo "密码: smart_password"