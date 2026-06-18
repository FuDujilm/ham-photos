# 快速开始指南

## 5 分钟快速部署

### 1. 配置 Cloudflare Images

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Images**

1. 记录 **Account ID**（在页面右侧）
2. 创建 **API Token**（Images 读写权限）
3. 获取 **Account Hash**（从 Delivery URL 中提取）
   - 示例：`https://imagedelivery.net/YOUR_HASH_HERE/...`

4. 配置 Image Variants（可选，建议配置）：
   - `thumbnail`: 300×300, fit=cover
   - `medium`: 800×600, fit=scale-down
   - `large`: 1920×1080, fit=scale-down

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入：

```bash
# 数据库密码（随机生成）
DB_PASSWORD=your_random_secure_password

# Cloudflare 配置（第1步获取的）
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token  
CLOUDFLARE_ACCOUNT_HASH=your_hash

# JWT 密钥（随机32位字符）
JWT_SECRET=$(openssl rand -hex 32)

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$(docker run --rm -it node:20-alpine sh -c "npm install -g bcrypt-cli && bcrypt-cli YOUR_PASSWORD")
```

### 3. 启动服务

```bash
docker-compose up -d
```

等待 1-2 分钟，服务启动完成。

### 4. 访问应用

- 🌐 前端首页：http://localhost
- 🔐 管理后台：http://localhost/admin
- 📡 后端 API：http://localhost:3000

默认管理员账号：
- 用户名：`admin`
- 密码：你在第2步设置的密码

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

### Cloudflare 上传失败

1. 验证 API Token 权限
2. 检查 Account ID 是否正确
3. 确认图片大小 < 10MB

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
