use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::{
    error::{AppError, Result},
    services::{auth::create_jwt, auth::verify_password},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub username: String,
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>> {
    let username = req.username.trim();

    let admin = sqlx::query_as::<_, AdminUserCredentials>(
        r#"
        SELECT username, password_hash
        FROM admin_users
        WHERE username = $1
        "#,
    )
    .bind(username)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let is_valid = verify_password(&req.password, &admin.password_hash)?;
    if !is_valid {
        return Err(AppError::Unauthorized);
    }

    let jwt_secret = crate::handlers::get_or_create_jwt_secret(&state.pool).await?;
    let token = create_jwt(&admin.username, &jwt_secret)?;

    Ok(Json(LoginResponse {
        token,
        username: admin.username,
    }))
}

#[derive(Debug, sqlx::FromRow)]
struct AdminUserCredentials {
    username: String,
    password_hash: String,
}
