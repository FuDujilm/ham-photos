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
    // 验证用户名
    if req.username != state.config.admin_username {
        return Err(AppError::Unauthorized);
    }

    // 验证密码
    let is_valid = verify_password(&req.password, &state.config.admin_password_hash)?;
    if !is_valid {
        return Err(AppError::Unauthorized);
    }

    // 生成 JWT
    let token = create_jwt(&req.username, &state.config.jwt_secret)?;

    Ok(Json(LoginResponse {
        token,
        username: req.username,
    }))
}
