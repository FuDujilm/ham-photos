# 业余无线电风采展示系统 (HAM Radio Photos Gallery)

一个专为业余无线电爱好者设计的照片展示平台，支持电台设备、天线、活动现场、QSL 卡片等照片的管理和展示。

## 特性

- 📷 **瀑布流画廊**：响应式网格布局，支持灯箱查看
- 🏷️ **分类和标签**：按设备类型、频段、活动等分类
- 🔍 **强大的搜索**：支持呼号、频段、全文搜索
- 📡 **业余无线电元数据**：呼号、频段、设备、天线、QTH 等
- ☁️ **S3/R2 图片存储**：在后台配置对象存储与公开访问地址
- 🔐 **管理后台**：便捷的照片上传和编辑界面
- 🐳 **Docker 部署**：一键启动，易于维护

## 技术栈

### 后端
- Rust 1.88+
- Axum 0.7（Web 框架）
- SQLx 0.7（数据库）
- PostgreSQL 16

### 前端
- Vite 5 + React 18 + TypeScript
- TanStack Query（数据管理）
- Shadcn UI + Tailwind CSS
- React Masonry CSS（瀑布流）

### 存储
- S3 兼容对象存储（图片存储）
- PostgreSQL（元数据）

## 快速开始

### 环境要求
- Docker 和 Docker Compose
- S3 兼容对象存储账号（可在初始化后配置）

### 部署步骤

1. **克隆仓库**
```bash
git clone <repository-url>
cd ham-photos
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **初始化管理员**
- 初始化页面：http://localhost/init

如需重置管理员账户并重新进入初始化流程：
```bash
docker compose run --rm backend reset-init
docker compose restart backend
```

5. **访问应用**
- 前端：http://localhost
- 后端 API：http://localhost:3000
- 管理后台：http://localhost/admin

## 开发指南

### 后端开发
```bash
cd backend
cargo run
```

### 前端开发
```bash
cd frontend
pnpm install
pnpm dev
```

详细文档请查看 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## API 文档

参见 [docs/API.md](docs/API.md)

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 73！

祝你通联愉快！🎙️📡
