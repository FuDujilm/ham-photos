use axum::{
    extract::{Multipart, State},
    Json,
};
use image::{ImageFormat, ImageReader};
use sqlx::types::Json as SqlxJson;
use std::io::Cursor;

use crate::{
    error::{AppError, Result},
    models::{CreatePhotoRequest, Photo},
    services::upload_image,
    AppState,
};

pub async fn upload_photo(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<Photo>> {
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;
    let mut metadata: Option<CreatePhotoRequest> = None;

    // 解析 multipart 数据
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::BadRequest(format!(
            "无法解析上传表单，请确认图片不超过 {}MB 且请求格式正确: {}",
            state.config.upload_max_mb, e
        ))
    })? {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "file" => {
                filename = field.file_name().map(|s| s.to_string());
                file_bytes = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|e| {
                            AppError::BadRequest(format!(
                                "读取图片失败，请确认图片不超过 {}MB 且文件未损坏: {}",
                                state.config.upload_max_mb, e
                            ))
                        })?
                        .to_vec(),
                );
            }
            "metadata" => {
                let data = field
                    .text()
                    .await
                    .map_err(|e| AppError::BadRequest(format!("Failed to read metadata: {}", e)))?;
                metadata =
                    Some(serde_json::from_str(&data).map_err(|e| {
                        AppError::BadRequest(format!("Invalid metadata JSON: {}", e))
                    })?);
            }
            _ => {}
        }
    }

    let file_bytes =
        file_bytes.ok_or_else(|| AppError::BadRequest("No file provided".to_string()))?;
    let filename =
        filename.ok_or_else(|| AppError::BadRequest("No filename provided".to_string()))?;
    let metadata =
        metadata.ok_or_else(|| AppError::BadRequest("No metadata provided".to_string()))?;

    // 验证文件大小
    if file_bytes.len() > state.config.upload_max_bytes {
        return Err(AppError::BadRequest(format!(
            "File size exceeds {}MB",
            state.config.upload_max_mb
        )));
    }

    let (file_bytes, filename) = convert_to_webp(file_bytes, &filename)?;

    let image_api_settings = crate::handlers::fetch_image_api_settings(&state.pool).await?;

    // 上传到 Cloudflare Images
    let cloudflare_image_id = upload_image(
        file_bytes,
        filename,
        &image_api_settings.endpoint,
        &image_api_settings.bucket,
        &image_api_settings.access_key_id,
        &image_api_settings.secret_access_key,
        &image_api_settings.region,
    )
    .await
    .map_err(AppError::CloudflareError)?;

    // 保存到数据库
    let tags_json = SqlxJson(metadata.tags.unwrap_or_default());

    let photo = sqlx::query_as::<_, Photo>(
        r#"
        INSERT INTO photos (
            cloudflare_image_id, title, description, category,
            callsign, frequency_band, frequency_mhz, mode,
            equipment, antenna_type, power_watts,
            qth_latitude, qth_longitude, qth_name,
            photo_taken_at, tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        "#,
    )
    .bind(&cloudflare_image_id)
    .bind(&metadata.title)
    .bind(&metadata.description)
    .bind(&metadata.category)
    .bind(&metadata.callsign)
    .bind(&metadata.frequency_band)
    .bind(&metadata.frequency_mhz)
    .bind(&metadata.mode)
    .bind(&metadata.equipment)
    .bind(&metadata.antenna_type)
    .bind(&metadata.power_watts)
    .bind(&metadata.qth_latitude)
    .bind(&metadata.qth_longitude)
    .bind(&metadata.qth_name)
    .bind(&metadata.photo_taken_at)
    .bind(tags_json)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to insert photo: {:?}", e);
        // 如果数据库插入失败，尝试删除已上传的图片
        let state_clone = state.clone();
        let image_id_clone = cloudflare_image_id.clone();
        tokio::spawn(async move {
            let image_api_settings =
                crate::handlers::fetch_image_api_settings(&state_clone.pool).await;

            let Ok(image_api_settings) = image_api_settings else {
                return;
            };

            let _ = crate::services::delete_image(
                &image_id_clone,
                &image_api_settings.endpoint,
                &image_api_settings.bucket,
                &image_api_settings.access_key_id,
                &image_api_settings.secret_access_key,
                &image_api_settings.region,
            )
            .await;
        });
        AppError::from(e)
    })?;

    Ok(Json(photo))
}

fn convert_to_webp(file_bytes: Vec<u8>, filename: &str) -> Result<(Vec<u8>, String)> {
    let image = ImageReader::new(Cursor::new(file_bytes))
        .with_guessed_format()
        .map_err(|e| AppError::BadRequest(format!("无法识别图片格式: {}", e)))?
        .decode()
        .map_err(|e| AppError::BadRequest(format!("图片解码失败: {}", e)))?;

    let mut output = Cursor::new(Vec::new());
    image
        .write_to(&mut output, ImageFormat::WebP)
        .map_err(|e| AppError::BadRequest(format!("WebP 转换失败: {}", e)))?;

    Ok((output.into_inner(), webp_filename(filename)))
}

fn webp_filename(filename: &str) -> String {
    let stem = filename
        .rsplit_once('.')
        .map(|(stem, _)| stem)
        .filter(|stem| !stem.is_empty())
        .unwrap_or("upload");

    format!("{}.webp", stem)
}
