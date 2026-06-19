use axum::{extract::State, Json};
use sqlx::types::Json as SqlxJson;

use crate::{
    error::{AppError, Result},
    models::{
        FooterLinkGroup, ImageApiSettings, PublicSiteSettings, SiteSettings, TestImageApiRequest,
        TestImageApiResponse, UpdateSiteSettingsRequest,
    },
    AppState,
};

pub async fn get_public_settings(
    State(state): State<AppState>,
) -> Result<Json<PublicSiteSettings>> {
    let settings = sqlx::query_as::<_, PublicSiteSettings>(
        r#"
        SELECT
            site_title, site_subtitle, site_intro, header_icon, footer_icp, footer_police_record,
            footer_links, s3_public_base_url, updated_at
        FROM site_settings
        WHERE id = TRUE
        "#,
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(settings))
}

pub async fn get_admin_settings(State(state): State<AppState>) -> Result<Json<SiteSettings>> {
    Ok(Json(fetch_site_settings(&state.pool).await?))
}

pub async fn update_admin_settings(
    State(state): State<AppState>,
    Json(req): Json<UpdateSiteSettingsRequest>,
) -> Result<Json<SiteSettings>> {
    validate_settings(&req)?;

    let footer_links = SqlxJson(req.footer_links);
    let settings = sqlx::query_as::<_, SiteSettings>(
        r#"
        UPDATE site_settings
        SET
            site_title = $1,
            site_subtitle = $2,
            site_intro = $3,
            header_icon = $4,
            footer_icp = $5,
            footer_police_record = $6,
            footer_links = $7,
            s3_endpoint = $8,
            s3_region = $9,
            s3_bucket = $10,
            s3_access_key_id = $11,
            s3_secret_access_key = $12,
            s3_public_base_url = $13
        WHERE id = TRUE
        RETURNING
            site_title, site_subtitle, site_intro, header_icon, footer_icp, footer_police_record,
            footer_links, s3_endpoint, s3_region, s3_bucket, s3_access_key_id,
            s3_secret_access_key, s3_public_base_url, updated_at
        "#,
    )
    .bind(req.site_title.trim())
    .bind(req.site_subtitle.trim())
    .bind(req.site_intro.trim())
    .bind(req.header_icon.trim())
    .bind(trim_optional(req.footer_icp))
    .bind(trim_optional(req.footer_police_record))
    .bind(footer_links)
    .bind(trim_optional(req.s3_endpoint))
    .bind(trim_optional(req.s3_region))
    .bind(trim_optional(req.s3_bucket))
    .bind(trim_optional(req.s3_access_key_id))
    .bind(trim_optional(req.s3_secret_access_key))
    .bind(trim_optional(req.s3_public_base_url))
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(settings))
}

pub async fn test_image_api_settings(
    State(state): State<AppState>,
    Json(req): Json<TestImageApiRequest>,
) -> Result<Json<TestImageApiResponse>> {
    let saved = fetch_site_settings(&state.pool).await?;

    let credentials = crate::services::R2Credentials {
        endpoint: trim_optional(req.s3_endpoint)
            .or(saved.s3_endpoint)
            .unwrap_or_else(|| "https://api.cloudflare.com/client/v4".to_string()),
        bucket: trim_optional(req.s3_bucket)
            .or(saved.s3_bucket)
            .unwrap_or_default(),
        access_key_id: trim_optional(req.s3_access_key_id)
            .or(saved.s3_access_key_id)
            .unwrap_or_default(),
        secret_access_key: trim_optional(req.s3_secret_access_key)
            .or(saved.s3_secret_access_key)
            .unwrap_or_default(),
        region: saved.s3_region.unwrap_or_else(|| "auto".to_string()),
    };

    if credentials.bucket.trim().is_empty()
        || credentials.access_key_id.trim().is_empty()
        || credentials.secret_access_key.trim().is_empty()
    {
        return Err(AppError::BadRequest(
            "Bucket、Access Key 和 Secret Key 不能为空".to_string(),
        ));
    }

    match crate::services::test_connection(&credentials).await {
        Ok((status, message)) => Ok(Json(TestImageApiResponse {
            success: true,
            status: Some(status),
            message,
        })),
        Err(message) => Ok(Json(TestImageApiResponse {
            success: false,
            status: None,
            message,
        })),
    }
}

pub async fn fetch_site_settings(pool: &sqlx::PgPool) -> Result<SiteSettings> {
    sqlx::query_as::<_, SiteSettings>(
        r#"
        SELECT
            site_title, site_subtitle, site_intro, header_icon, footer_icp, footer_police_record,
            footer_links, s3_endpoint, s3_region, s3_bucket, s3_access_key_id,
            s3_secret_access_key, s3_public_base_url, updated_at
        FROM site_settings
        WHERE id = TRUE
        "#,
    )
    .fetch_one(pool)
    .await
    .map_err(AppError::from)
}

pub async fn fetch_image_api_settings(pool: &sqlx::PgPool) -> Result<ImageApiSettings> {
    let settings = fetch_site_settings(pool).await?;

    let image_api_settings = ImageApiSettings {
        endpoint: settings
            .s3_endpoint
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "https://api.cloudflare.com/client/v4".to_string()),
        bucket: settings
            .s3_bucket
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_default(),
        access_key_id: settings
            .s3_access_key_id
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_default(),
        secret_access_key: settings
            .s3_secret_access_key
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_default(),
        region: settings
            .s3_region
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "auto".to_string()),
    };

    if image_api_settings.bucket.trim().is_empty()
        || image_api_settings.access_key_id.trim().is_empty()
        || image_api_settings.secret_access_key.trim().is_empty()
    {
        return Err(AppError::BadRequest(
            "请先在管理后台配置图片存储的 Bucket、Access Key 和 Secret Key".to_string(),
        ));
    }

    Ok(image_api_settings)
}

fn validate_settings(req: &UpdateSiteSettingsRequest) -> Result<()> {
    if req.site_title.trim().is_empty() {
        return Err(AppError::BadRequest("网站标题不能为空".to_string()));
    }

    if req.header_icon.trim().is_empty() {
        return Err(AppError::BadRequest("页眉图标不能为空".to_string()));
    }

    if req.footer_links.len() > 3 {
        return Err(AppError::BadRequest("页脚链接最多配置三栏".to_string()));
    }

    for group in &req.footer_links {
        validate_footer_group(group)?;
    }

    Ok(())
}

fn validate_footer_group(group: &FooterLinkGroup) -> Result<()> {
    if group.title.trim().is_empty() {
        return Err(AppError::BadRequest("页脚链接分组标题不能为空".to_string()));
    }

    if group.links.len() > 8 {
        return Err(AppError::BadRequest(
            "每个页脚分组最多配置 8 个链接".to_string(),
        ));
    }

    for link in &group.links {
        if link.label.trim().is_empty() || link.url.trim().is_empty() {
            return Err(AppError::BadRequest(
                "页脚链接名称和地址不能为空".to_string(),
            ));
        }
    }

    Ok(())
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}
