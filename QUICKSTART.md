# 快速开始指南

## 5 分钟快速部署

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入数据库密码：

```bash
DB_PASSWORD=your_random_secure_password
```

### 2. 启动服务

```bash
docker-compose up -d
```

等待 1-2 分钟，服务启动完成。

### 3. 初始化管理员

- 🌐 前端首页：http://localhost
- 🧰 初始化页面：http://localhost/init
- 🔐 管理后台：http://localhost/admin
- 📡 后端 API：http://localhost:3000

首次访问 `http://localhost/init` 创建管理员账户。初始化完成后会自动进入后台。

### 4. 配置图片存储

进入管理后台的站点设置，填写图片存储的 S3/R2 API 配置：

- Endpoint
- Region
- Bucket
- Access Key
- Secret Key
- Public Base URL（可选）

### 5. 上传第一张照片

1. 访问 http://localhost/login
2. 使用管理员账号登录
3. 点击"上传照片"
4. 填写表单并上传图片
5. 返回首页查看效果

## 常见问题

### 后端无法连接数据库

```bash
# 查看容器状态
docker-compose ps

# 重启服务
docker-compose restart backend
```

### 前端无法访问后端

检查 `docker-compose.yml` 中的网络配置，确保所有服务在同一网络。

### 图片上传失败

1. 进入管理后台检查图片存储配置
2. 点击连接测试
3. 确认图片大小不超过上传限制

## 查看日志

```bash
# 所有服务
docker-compose logs -f

# 单个服务
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 停止服务

```bash
docker-compose down
```

## 下一步

- 📖 查看完整文档：[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- 🛠️ 开发指南：[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- 📡 API 文档：[docs/API.md](docs/API.md)

## 73！祝你通联愉快！📻
