use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde_json::json;
use sqlx::types::Json as SqlxJson;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::{Photo, PhotoQuery, UpdatePhotoRequest},
    AppState,
};

pub async fn list_photos(
    State(state): State<AppState>,
    Query(query): Query<PhotoQuery>,
) -> Result<Json<serde_json::Value>> {
    let limit = query.limit();
    let offset = query.offset();

    let tags_json = query.tags_array().map(|tags| SqlxJson(tags));

    let photos = sqlx::query_as::<_, Photo>(
        r#"
        SELECT * FROM photos
        WHERE
            ($1::TEXT IS NULL OR category = $1)
            AND ($2::TEXT IS NULL OR callsign = $2)
            AND ($3::TEXT IS NULL OR frequency_band = $3)
            AND ($4::JSONB IS NULL OR tags @> $4)
            AND (
                $5::TEXT IS NULL OR
                to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(callsign, ''))
                @@ plainto_tsquery('simple', $5)
            )
        ORDER BY
            CASE WHEN $7 = 'oldest' THEN uploaded_at END ASC,
            uploaded_at DESC
        LIMIT $6 OFFSET $8
        "#,
    )
    .bind(&query.category)
    .bind(&query.callsign)
    .bind(&query.frequency_band)
    .bind(tags_json.as_ref())
    .bind(&query.search)
    .bind(limit)
    .bind(&query.sort)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    // 获取总数
    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM photos
        WHERE
            ($1::TEXT IS NULL OR category = $1)
            AND ($2::TEXT IS NULL OR callsign = $2)
            AND ($3::TEXT IS NULL OR frequency_band = $3)
            AND ($4::JSONB IS NULL OR tags @> $4)
            AND (
                $5::TEXT IS NULL OR
                to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(callsign, ''))
                @@ plainto_tsquery('simple', $5)
            )
        "#,
    )
    .bind(&query.category)
    .bind(&query.callsign)
    .bind(&query.frequency_band)
    .bind(tags_json.as_ref())
    .bind(&query.search)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({
        "photos": photos,
        "total": total,
        "page": query.page.unwrap_or(1),
        "limit": limit,
    })))
}

pub async fn get_photo(State(state): State<AppState>, Path(id): Path<Uuid>) -> Result<Json<Photo>> {
    let photo = sqlx::query_as::<_, Photo>("SELECT * FROM photos WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(photo))
}

pub async fn update_photo(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePhotoRequest>,
) -> Result<Json<Photo>> {
    sqlx::query_as::<_, Photo>("SELECT * FROM photos WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    let tags_json = req.tags.map(SqlxJson);

    let photo = sqlx::query_as::<_, Photo>(
        r#"
        UPDATE photos
        SET
            title = COALESCE($2, title),
            description = $3,
            category = $4,
            callsign = $5,
            frequency_band = $6,
            frequency_mhz = $7,
            mode = $8,
            equipment = $9,
            antenna_type = $10,
            power_watts = $11,
            qth_latitude = $12,
            qth_longitude = $13,
            qth_name = $14,
            photo_taken_at = $15,
            tags = $16
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.callsign)
    .bind(&req.frequency_band)
    .bind(&req.frequency_mhz)
    .bind(&req.mode)
    .bind(&req.equipment)
    .bind(&req.antenna_type)
    .bind(&req.power_watts)
    .bind(&req.qth_latitude)
    .bind(&req.qth_longitude)
    .bind(&req.qth_name)
    .bind(&req.photo_taken_at)
    .bind(tags_json)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(photo))
}

pub async fn delete_photo(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    // 获取照片信息
    let photo = sqlx::query_as::<_, Photo>("SELECT * FROM photos WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    let image_api_settings = crate::handlers::fetch_image_api_settings(&state.pool).await?;

    // 从 Cloudflare 删除图片
    if let Err(e) = crate::services::delete_image(
        &photo.cloudflare_image_id,
        &image_api_settings.endpoint,
        &image_api_settings.bucket,
        &image_api_settings.access_key_id,
        &image_api_settings.secret_access_key,
        &image_api_settings.region,
    )
    .await
    {
        tracing::warn!("Failed to delete image from Cloudflare: {}", e);
        // 继续删除数据库记录
    }

    // 从数据库删除
    sqlx::query("DELETE FROM photos WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "message": "Photo deleted successfully" })))
}

pub async fn list_tags(State(state): State<AppState>) -> Result<Json<serde_json::Value>> {
    let tags: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT DISTINCT jsonb_array_elements_text(tags) as tag
        FROM photos
        WHERE tags IS NOT NULL
        ORDER BY tag
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(json!({ "tags": tags })))
}

pub async fn list_categories(State(state): State<AppState>) -> Result<Json<serde_json::Value>> {
    let categories: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT category FROM photos WHERE category IS NOT NULL ORDER BY category",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(json!({ "categories": categories })))
}
