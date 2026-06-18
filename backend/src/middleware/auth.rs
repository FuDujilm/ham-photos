use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};

use crate::{services::auth::verify_jwt, AppState};

pub async fn auth_middleware(
    state: axum::extract::State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let token = match auth_header {
        Some(auth) if auth.starts_with("Bearer ") => &auth[7..],
        _ => return Err(StatusCode::UNAUTHORIZED),
    };

    match verify_jwt(token, &state.config.jwt_secret) {
        Ok(claims) => {
            req.extensions_mut().insert(claims);
            Ok(next.run(req).await)
        }
        Err(_) => Err(StatusCode::UNAUTHORIZED),
    }
}
