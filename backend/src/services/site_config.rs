use std::{fs, path::Path};

use serde::Deserialize;

use crate::error::{AppError, Result};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteConfigFile {
    site_title: String,
    site_subtitle: String,
    site_intro: String,
    header_icon: String,
    favicon_url: String,
    icp_record: String,
    police_record: String,
}

pub async fn sync_site_config(pool: &sqlx::PgPool, path: &str) -> Result<()> {
    let path = Path::new(path);

    if !path.exists() {
        tracing::warn!("Site config file not found: {}", path.display());
        return Ok(());
    }

    let contents = fs::read_to_string(path).map_err(|err| {
        AppError::InternalServerError(format!(
            "Failed to read site config {}: {}",
            path.display(),
            err
        ))
    })?;

    let config: SiteConfigFile = serde_json::from_str(&contents).map_err(|err| {
        AppError::InternalServerError(format!(
            "Failed to parse site config {}: {}",
            path.display(),
            err
        ))
    })?;

    sqlx::query(
        r#"
        UPDATE site_settings
        SET
            site_title = $1,
            site_subtitle = $2,
            site_intro = $3,
            header_icon = $4,
            site_favicon_url = $5,
            footer_icp = $6,
            footer_police_record = $7
        WHERE id = TRUE
        "#,
    )
    .bind(config.site_title.trim())
    .bind(config.site_subtitle.trim())
    .bind(config.site_intro.trim())
    .bind(config.header_icon.trim())
    .bind(config.favicon_url.trim())
    .bind(trim_optional(config.icp_record))
    .bind(trim_optional(config.police_record))
    .execute(pool)
    .await?;

    tracing::info!("Synced site config from {}", path.display());
    Ok(())
}

fn trim_optional(value: String) -> Option<String> {
    let value = value.trim().to_string();

    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}
