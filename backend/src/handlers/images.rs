use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, HeaderValue, Response, StatusCode},
};

use crate::{error::Result, AppState};

pub async fn proxy_image(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<Response<Body>> {
    let image_api_settings = crate::handlers::fetch_image_api_settings(
        &state.pool,
        &state.config.cloudflare_account_id,
        &state.config.cloudflare_api_token,
        &state.config.cloudflare_account_hash,
    )
    .await?;

    let bytes = crate::services::get_image(
        &key,
        &image_api_settings.endpoint,
        &image_api_settings.bucket,
        &image_api_settings.access_key_id,
        &image_api_settings.secret_access_key,
        &image_api_settings.region,
    )
    .await
    .map_err(crate::error::AppError::CloudflareError)?;

    let mut response = Response::new(Body::from(bytes));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("image/webp"),
    );
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=31536000, immutable"),
    );

    Ok(response)
}
