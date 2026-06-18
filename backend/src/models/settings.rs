use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as SqlxJson;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SiteSettings {
    pub site_title: String,
    pub site_subtitle: String,
    pub site_intro: String,
    pub header_icon: String,
    pub footer_icp: Option<String>,
    pub footer_police_record: Option<String>,
    pub footer_links: SqlxJson<Vec<FooterLinkGroup>>,
    pub s3_endpoint: Option<String>,
    pub s3_region: Option<String>,
    pub s3_bucket: Option<String>,
    pub s3_access_key_id: Option<String>,
    pub s3_secret_access_key: Option<String>,
    pub s3_public_base_url: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PublicSiteSettings {
    pub site_title: String,
    pub site_subtitle: String,
    pub site_intro: String,
    pub header_icon: String,
    pub footer_icp: Option<String>,
    pub footer_police_record: Option<String>,
    pub footer_links: SqlxJson<Vec<FooterLinkGroup>>,
    pub s3_public_base_url: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FooterLinkGroup {
    pub title: String,
    pub links: Vec<FooterLink>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FooterLink {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSiteSettingsRequest {
    pub site_title: String,
    pub site_subtitle: String,
    pub site_intro: String,
    pub header_icon: String,
    pub footer_icp: Option<String>,
    pub footer_police_record: Option<String>,
    pub footer_links: Vec<FooterLinkGroup>,
    pub s3_endpoint: Option<String>,
    pub s3_region: Option<String>,
    pub s3_bucket: Option<String>,
    pub s3_access_key_id: Option<String>,
    pub s3_secret_access_key: Option<String>,
    pub s3_public_base_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TestImageApiRequest {
    pub s3_endpoint: Option<String>,
    pub s3_bucket: Option<String>,
    pub s3_access_key_id: Option<String>,
    pub s3_secret_access_key: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TestImageApiResponse {
    pub success: bool,
    pub status: Option<u16>,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct ImageApiSettings {
    pub endpoint: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
}
