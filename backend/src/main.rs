mod config;
mod error;
mod handlers;
mod middleware;
mod models;
mod services;

use axum::{
    extract::DefaultBodyLimit,
    middleware as axum_middleware,
    routing::{get, post, put},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::PgPool,
    pub config: Config,
}

async fn health_check() -> &'static str {
    "OK"
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化日志
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ham_photos_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 加载配置
    let config = Config::from_env()?;

    // 连接数据库
    tracing::info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await?;

    // 运行数据库迁移
    tracing::info!("Running migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;

    if matches!(std::env::args().nth(1).as_deref(), Some("reset-init")) {
        let deleted = handlers::reset_initialization(&pool)
            .await
            .map_err(|err| anyhow::anyhow!("failed to reset initialization: {:?}", err))?;

        tracing::info!(
            "Initialization reset complete. Deleted {} admin account(s). Visit /init to create a new administrator.",
            deleted
        );
        return Ok(());
    }

    services::sync_site_config(&pool, &config.site_config_path)
        .await
        .map_err(|err| anyhow::anyhow!("failed to sync site config: {:?}", err))?;

    handlers::get_or_create_jwt_secret(&pool)
        .await
        .map_err(|err| anyhow::anyhow!("failed to initialize JWT secret: {:?}", err))?;

    let state = AppState { pool, config };

    // 配置 CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // 构建路由
    let app = Router::new()
        .route("/api/health", get(health_check))
        // 公开端点
        .route("/api/photos", get(handlers::list_photos))
        .route("/api/photos/:id", get(handlers::get_photo))
        .route("/api/tags", get(handlers::list_tags))
        .route("/api/categories", get(handlers::list_categories))
        .route("/api/settings", get(handlers::get_public_settings))
        .route("/api/images/*key", get(handlers::proxy_image))
        .route("/api/init/status", get(handlers::get_init_status))
        .route("/api/init", post(handlers::initialize_admin))
        // 管理端点
        .route("/api/admin/login", post(handlers::login))
        .route(
            "/api/admin/settings",
            get(handlers::get_admin_settings)
                .put(handlers::update_admin_settings)
                .route_layer(axum_middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth_middleware,
                )),
        )
        .route(
            "/api/admin/settings/test-image-api",
            post(handlers::test_image_api_settings).route_layer(
                axum_middleware::from_fn_with_state(state.clone(), middleware::auth_middleware),
            ),
        )
        // 需要认证的端点
        .route(
            "/api/photos",
            post(handlers::upload_photo)
                .layer(DefaultBodyLimit::max(state.config.upload_max_bytes))
                .route_layer(axum_middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth_middleware,
                )),
        )
        .route(
            "/api/photos/:id",
            put(handlers::update_photo)
                .delete(handlers::delete_photo)
                .route_layer(axum_middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth_middleware,
                )),
        )
        .layer(cors)
        .with_state(state);

    // 启动服务器
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::info!("Server listening on {}", listener.local_addr()?);

    axum::serve(listener, app).await?;

    Ok(())
}
