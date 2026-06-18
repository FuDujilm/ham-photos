# API 文档

## 基础信息

- 基础 URL: `http://localhost:3000/api`
- 认证方式: JWT Bearer Token

## 认证端点

### 管理员登录

```http
POST /admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin"
}
```

## 公开端点

### 获取照片列表

```http
GET /photos?page=1&limit=20&category=equipment&callsign=BH1ABC&search=antenna
```

**查询参数**:
- `page` - 页码（默认 1）
- `limit` - 每页数量（默认 20，最大 100）
- `category` - 分类过滤
- `callsign` - 呼号过滤
- `frequency_band` - 频段过滤
- `tags` - 标签过滤（逗号分隔）
- `search` - 全文搜索
- `sort` - 排序方式（`latest` 或 `oldest`）

**响应**:
```json
{
  "photos": [...],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### 获取单张照片

```http
GET /photos/:id
```

### 获取所有标签

```http
GET /tags
```

**响应**:
```json
{
  "tags": ["HF", "短波", "竞赛", ...]
}
```

### 获取所有分类

```http
GET /categories
```

**响应**:
```json
{
  "categories": ["equipment", "antenna", "event", ...]
}
```

## 受保护端点（需要认证）

### 上传照片

```http
POST /photos
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image file>
metadata: {
  "title": "我的电台",
  "description": "...",
  "category": "equipment",
  "callsign": "BH1ABC",
  "frequency_band": "20m",
  "frequency_mhz": 14.300,
  "mode": "SSB",
  "equipment": "Yaesu FT-991A",
  "antenna_type": "Dipole",
  "power_watts": 100,
  "qth_name": "北京市",
  "tags": ["HF", "短波"]
}
```

### 更新照片

```http
PUT /photos/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "新标题",
  "description": "新描述",
  ...
}
```

### 删除照片

```http
DELETE /photos/:id
Authorization: Bearer <token>
```

## 错误响应

所有错误响应格式：
```json
{
  "error": "错误信息"
}
```

常见状态码：
- `400` - 请求参数错误
- `401` - 未认证或 Token 无效
- `404` - 资源不存在
- `500` - 服务器错误
