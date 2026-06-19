# 部署指南

## 前置要求

- Docker 和 Docker Compose
- S3 兼容图片存储（如 Cloudflare R2，可在后台配置）
- 域名（可选，用于生产环境）

## 快速部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd ham-photos
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入数据库密码：

```bash
DB_PASSWORD=your_secure_password
```

### 3. 启动服务

```bash
docker-compose up -d
```

查看日志：
```bash
docker-compose logs -f
```

### 4. 初始化管理员与图片存储

首次部署后访问初始化页面创建管理员账户：

- 初始化页面：http://localhost/init

登录后台后，在站点设置里配置图片存储的 S3/R2 API 信息。管理员账户和 JWT 密钥会保存在数据库中，不需要通过环境变量预置。

### 5. 访问应用

- 前端：http://localhost
- 后端 API：http://localhost:3000
- 管理后台：http://localhost/admin

## 生产环境部署

### 1. 使用反向代理（Nginx/Caddy）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 配置 HTTPS（使用 Let's Encrypt）

```bash
certbot --nginx -d your-domain.com
```

### 3. 数据备份

备份数据库：
```bash
docker-compose exec postgres pg_dump -U ham_user ham_photos > backup_$(date +%Y%m%d).sql
```

恢复数据库：
```bash
docker-compose exec -T postgres psql -U ham_user ham_photos < backup_20240616.sql
```

### 4. 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 故障排查

### 后端无法连接数据库

```bash
# 检查数据库状态
docker-compose ps postgres

# 查看数据库日志
docker-compose logs postgres
```

### 图片上传失败

1. 检查 API Token 权限
2. 验证 Account ID 是否正确
3. 确认文件大小不超过 10MB

### 前端无法访问后端

```bash
# 检查后端是否正常运行
curl http://localhost:3000/api/health

# 查看后端日志
docker-compose logs backend
```

## 性能优化

### 1. 启用 PostgreSQL 连接池

在 `docker-compose.yml` 中调整：
```yaml
backend:
  environment:
    DATABASE_MAX_CONNECTIONS: 20
```

### 2. 配置 CDN

如果使用 Cloudflare R2 或其他 S3 兼容存储，可通过公开桶、自定义域名或 CDN 提供图片访问地址。

### 3. 启用浏览器缓存

前端 Nginx 配置已包含缓存策略，静态资源缓存 1 年。

## 监控

### 查看资源使用

```bash
docker stats
```

### 查看应用日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## 卸载

```bash
# 停止并删除容器
docker-compose down

# 删除数据卷（⚠️ 会删除所有数据）
docker-compose down -v
```
