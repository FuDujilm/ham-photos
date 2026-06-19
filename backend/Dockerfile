# 构建阶段
FROM rust:1.88-slim as builder

WORKDIR /app

# 安装依赖
RUN sed -i "s#http://deb.debian.org/debian#http://mirrors.aliyun.com/debian#g; s#http://deb.debian.org/debian-security#http://mirrors.aliyun.com/debian-security#g" /etc/apt/sources.list.d/debian.sources
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并预编译依赖（利用 Docker 层缓存）
COPY .cargo ./.cargo
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# 复制源代码并编译
COPY . .
RUN touch src/main.rs && \
    cargo build --release

# 运行阶段
FROM debian:bookworm-slim

RUN sed -i "s#http://deb.debian.org/debian#http://mirrors.aliyun.com/debian#g; s#http://deb.debian.org/debian-security#http://mirrors.aliyun.com/debian-security#g" /etc/apt/sources.list.d/debian.sources
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/ham-photos-backend /usr/local/bin/ham-photos-backend

# 复制迁移文件
COPY --from=builder /app/migrations /app/migrations

EXPOSE 3000

CMD ["ham-photos-backend"]
