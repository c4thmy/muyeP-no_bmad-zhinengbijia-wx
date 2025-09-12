#!/bin/bash

# 智能比价后端服务启动脚本

echo "正在启动智能比价后端服务..."

# 检查环境
if [ ! -f ".env" ]; then
    echo "复制环境配置文件..."
    cp .env.example .env
    echo "请编辑 .env 文件配置数据库和Redis连接信息"
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "安装npm依赖..."
    npm install
fi

# 创建日志目录
mkdir -p logs

# 检查Redis连接
echo "检查Redis服务..."
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Redis服务未启动，正在启动..."
    sudo systemctl start redis 2>/dev/null || redis-server --daemonize yes
fi

# 检查MySQL连接
echo "检查MySQL服务..."
systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld
if [ $? -ne 0 ]; then
    echo "MySQL服务未启动，请手动启动MySQL服务"
    echo "Ubuntu/Debian: sudo systemctl start mysql"
    echo "CentOS/RHEL: sudo systemctl start mysqld"
    exit 1
fi

# 启动服务
echo "启动后端API服务..."
if command -v pm2 >/dev/null 2>&1; then
    # 使用PM2管理进程
    pm2 start src/server.js --name "smart-compare-api" --watch
    pm2 logs smart-compare-api --lines 20
else
    # 直接启动
    npm run dev
fi