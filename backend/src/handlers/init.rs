use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::{
    error::{AppError, Result},
    services::auth::{create_jwt, hash_password},
    AppState,
};

const JWT_SECRET_KEY: &str = "jwt_secret";

#[derive(Debug, Serialize)]
pub struct InitStatusResponse {
    pub initialized: bool,
}

#[derive(Debug, Deserialize)]
pub struct InitRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct InitResponse {
    pub token: String,
    pub username: String,
}

pub async fn get_init_status(State(state): State<AppState>) -> Result<Json<InitStatusResponse>> {
    Ok(Json(InitStatusResponse {
        initialized: is_initialized(&state.pool).await?,
    }))
}

pub async fn initialize_admin(
    State(state): State<AppState>,
    Json(req): Json<InitRequest>,
) -> Result<Json<InitResponse>> {
    let username = validate_username(&req.username)?;
    validate_password(&req.password)?;

    let mut tx = state.pool.begin().await?;

    sqlx::query("SELECT pg_advisory_xact_lock(41001)")
        .execute(&mut *tx)
        .await?;

    let existing_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM admin_users")
        .fetch_one(&mut *tx)
        .await?;

    if existing_count > 0 {
        return Err(AppError::BadRequest("系统已经完成初始化".to_string()));
    }

    let password_hash = hash_password(&req.password)?;

    sqlx::query(
        r#"
        INSERT INTO admin_users (username, password_hash)
        VALUES ($1, $2)
        "#,
    )
    .bind(&username)
    .bind(&password_hash)
    .execute(&mut *tx)
    .await?;

    let jwt_secret = get_or_create_jwt_secret_in_tx(&mut tx).await?;

    tx.commit().await?;

    let token = create_jwt(&username, &jwt_secret)?;

    Ok(Json(InitResponse { token, username }))
}

pub async fn is_initialized(pool: &sqlx::PgPool) -> Result<bool> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM admin_users")
        .fetch_one(pool)
        .await?;

    Ok(count > 0)
}

pub async fn get_or_create_jwt_secret(pool: &sqlx::PgPool) -> Result<String> {
    let mut tx = pool.begin().await?;
    let secret = get_or_create_jwt_secret_in_tx(&mut tx).await?;
    tx.commit().await?;
    Ok(secret)
}

pub async fn reset_initialization(pool: &sqlx::PgPool) -> Result<u64> {
    let mut tx = pool.begin().await?;

    sqlx::query("SELECT pg_advisory_xact_lock(41001)")
        .execute(&mut *tx)
        .await?;

    let deleted = sqlx::query("DELETE FROM admin_users")
        .execute(&mut *tx)
        .await?
        .rows_affected();

    sqlx::query("DELETE FROM app_config WHERE key = $1")
        .bind(JWT_SECRET_KEY)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(deleted)
}

async fn get_or_create_jwt_secret_in_tx(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
) -> Result<String> {
    if let Some(secret) =
        sqlx::query_scalar::<_, String>("SELECT value FROM app_config WHERE key = $1")
            .bind(JWT_SECRET_KEY)
            .fetch_optional(&mut **tx)
            .await?
    {
        return Ok(secret);
    }

    let secret =
        uuid::Uuid::new_v4().simple().to_string() + &uuid::Uuid::new_v4().simple().to_string();

    sqlx::query(
        r#"
        INSERT INTO app_config (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = app_config.value
        "#,
    )
    .bind(JWT_SECRET_KEY)
    .bind(&secret)
    .execute(&mut **tx)
    .await?;

    let saved = sqlx::query_scalar::<_, String>("SELECT value FROM app_config WHERE key = $1")
        .bind(JWT_SECRET_KEY)
        .fetch_one(&mut **tx)
        .await?;

    Ok(saved)
}

fn validate_username(username: &str) -> Result<String> {
    let username = username.trim();

    if username.len() < 3 || username.len() > 64 {
        return Err(AppError::BadRequest(
            "用户名长度需要在 3 到 64 个字符之间".to_string(),
        ));
    }

    if !username
        .chars()
        .all(|item| item.is_ascii_alphanumeric() || item == '_' || item == '-')
    {
        return Err(AppError::BadRequest(
            "用户名只能包含字母、数字、下划线和短横线".to_string(),
        ));
    }

    Ok(username.to_string())
}

fn validate_password(password: &str) -> Result<()> {
    if password.len() < 8 {
        return Err(AppError::BadRequest("密码至少需要 8 个字符".to_string()));
    }

    Ok(())
}
