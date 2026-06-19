# 开发指南

## 开发环境设置

### 后端开发

#### 前置要求
- Rust 1.88+
- PostgreSQL 16
- SQLx CLI

#### 安装 SQLx CLI
```bash
cargo install sqlx-cli --no-default-features --features postgres
```

#### 启动开发环境

1. **启动 PostgreSQL**
```bash
docker run -d \
  --name ham-photos-postgres \
  -e POSTGRES_DB=ham_photos \
  -e POSTGRES_USER=ham_user \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  postgres:16-alpine
```

2. **配置环境变量**
```bash
cd backend
cp ../.env.example .env
# 编辑 .env 文件
```

3. **运行数据库迁移**
```bash
sqlx migrate run
```

4. **启动后端服务**
```bash
cargo run
# 或使用 watch 模式（需要 cargo-watch）
cargo install cargo-watch
cargo watch -x run
```

后端将在 `http://localhost:3000` 运行。

#### 代码检查和测试
```bash
# 检查代码
cargo check

# 运行测试
cargo test

# 代码格式化
cargo fmt

# Linting
cargo clippy
```

### 前端开发

#### 前置要求
- Node.js 20+
- pnpm

#### 安装依赖

```bash
cd frontend
pnpm install
```

#### 启动开发服务器

```bash
pnpm dev
```

前端将在 `http://localhost:5173` 运行。

#### 构建生产版本

```bash
pnpm build
```

#### 预览生产构建

```bash
pnpm preview
```

#### 代码检查
```bash
# TypeScript 类型检查
pnpm tsc --noEmit

# Lint
pnpm lint
```

## 项目结构说明

### 后端结构

```
backend/src/
├── main.rs              # 应用入口，路由配置
├── config.rs            # 配置管理
├── error.rs             # 错误处理
├── models/              # 数据模型
│   └── photo.rs
├── handlers/            # HTTP 请求处理器
│   ├── photos.rs        # 照片 CRUD
│   ├── upload.rs        # 文件上传
│   └── admin.rs         # 管理员认证
├── services/            # 业务逻辑
│   ├── cloudflare.rs    # Cloudflare Images 集成
│   └── auth.rs          # JWT 认证
└── middleware/          # 中间件
    └── auth.rs          # 认证中间件
```

### 前端结构

```
frontend/src/
├── main.tsx             # 应用入口
├── App.tsx              # 根组件和路由
├── api/                 # API 客户端
│   ├── client.ts        # Axios 实例
│   └── photos.ts        # 照片 API
├── types/               # TypeScript 类型定义
│   ├── photo.ts
│   └── api.ts
├── hooks/               # 自定义 Hooks
│   └── usePhotos.ts     # TanStack Query hooks
├── stores/              # Zustand 状态管理
│   └── authStore.ts
├── utils/               # 工具函数
│   └── cloudflare.ts    # Cloudflare Images URL 生成
├── components/          # React 组件
│   ├── Gallery/         # 画廊相关
│   ├── Admin/           # 管理后台
│   └── shared/          # 共享组件
└── pages/               # 页面组件
    ├── Gallery.tsx
    ├── PhotoDetail.tsx
    ├── Admin.tsx
    └── Login.tsx
```

## 数据库管理

### 创建新迁移

```bash
cd backend
sqlx migrate add <migration_name>
```

### 运行迁移

```bash
sqlx migrate run
```

### 回滚迁移

```bash
sqlx migrate revert
```

## Cloudflare Images 测试

### 测试上传

```bash
curl -X POST \
  https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/images/v1 \
  -H "Authorization: Bearer <API_TOKEN>" \
  -F file=@test.jpg
```

### 测试访问

```
https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/thumbnail
```

## 常见开发任务

### 添加新的 API 端点

1. 在 `backend/src/handlers/` 创建处理器函数
2. 在 `backend/src/main.rs` 添加路由
3. 在 `frontend/src/api/photos.ts` 添加 API 调用
4. 在 `frontend/src/hooks/usePhotos.ts` 创建 hook

### 添加新的照片元数据字段

1. 修改数据库迁移文件
2. 更新 `backend/src/models/photo.rs`
3. 更新 `frontend/src/types/photo.ts`
4. 更新上传表单和详情页面

### 修改图片 Variants

在 Cloudflare Dashboard 修改后，更新 `frontend/src/utils/cloudflare.ts` 中的类型定义。

## 调试技巧

### 后端调试

```bash
# 启用详细日志
RUST_LOG=debug cargo run

# 使用 rust-gdb 调试
rust-gdb target/debug/ham-photos-backend
```

### 前端调试

- 使用 React DevTools 浏览器扩展
- 使用 TanStack Query DevTools（已集成）
- Chrome DevTools Network 标签查看 API 请求

### 数据库调试

```bash
# 连接到数据库
docker exec -it ham-photos-postgres psql -U ham_user -d ham_photos

# 查询照片表
SELECT * FROM photos LIMIT 10;

# 查看索引
\di

# 查看表结构
\d photos
```

## 性能优化建议

### 后端

1. 使用 `cargo build --release` 构建优化版本
2. 调整 PostgreSQL 连接池大小
3. 启用 HTTP/2

### 前端

1. 启用代码分割
2. 使用图片懒加载
3. 启用 Service Worker（PWA）
4. 使用 React.lazy 和 Suspense

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

**Rust**:
- 遵循 Rust 官方风格指南
- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码质量

**TypeScript/React**:
- 使用函数组件和 Hooks
- 使用 TypeScript 严格模式
- 遵循 Airbnb React 风格指南

## 常见问题

### Q: 后端编译失败

A: 确保 Rust 版本是 1.78+，并运行 `cargo clean` 后重试。

### Q: 前端依赖安装失败

A: 删除 `node_modules` 和 `pnpm-lock.yaml`，重新运行 `pnpm install`。

### Q: Cloudflare 上传失败

A: 检查 API Token 权限，确保有 "Cloudflare Images" 的读写权限。

### Q: 数据库连接失败

A: 检查 DATABASE_URL 是否正确，确保 PostgreSQL 正在运行。
