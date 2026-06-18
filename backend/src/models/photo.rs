use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as SqlxJson;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Photo {
    pub id: Uuid,
    pub cloudflare_image_id: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub callsign: Option<String>,
    pub frequency_band: Option<String>,
    pub frequency_mhz: Option<rust_decimal::Decimal>,
    pub mode: Option<String>,
    pub equipment: Option<String>,
    pub antenna_type: Option<String>,
    pub power_watts: Option<i32>,
    pub qth_latitude: Option<rust_decimal::Decimal>,
    pub qth_longitude: Option<rust_decimal::Decimal>,
    pub qth_name: Option<String>,
    pub photo_taken_at: Option<DateTime<Utc>>,
    pub uploaded_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tags: SqlxJson<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePhotoRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub callsign: Option<String>,
    pub frequency_band: Option<String>,
    pub frequency_mhz: Option<f64>,
    pub mode: Option<String>,
    pub equipment: Option<String>,
    pub antenna_type: Option<String>,
    pub power_watts: Option<i32>,
    pub qth_latitude: Option<f64>,
    pub qth_longitude: Option<f64>,
    pub qth_name: Option<String>,
    pub photo_taken_at: Option<DateTime<Utc>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePhotoRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub callsign: Option<String>,
    pub frequency_band: Option<String>,
    pub frequency_mhz: Option<f64>,
    pub mode: Option<String>,
    pub equipment: Option<String>,
    pub antenna_type: Option<String>,
    pub power_watts: Option<i32>,
    pub qth_latitude: Option<f64>,
    pub qth_longitude: Option<f64>,
    pub qth_name: Option<String>,
    pub photo_taken_at: Option<DateTime<Utc>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct PhotoQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub category: Option<String>,
    pub callsign: Option<String>,
    pub frequency_band: Option<String>,
    pub tags: Option<String>, // 逗号分隔
    pub search: Option<String>,
    pub sort: Option<String>, // latest, oldest
}

impl PhotoQuery {
    pub fn offset(&self) -> i64 {
        let page = self.page.unwrap_or(1).max(1);
        let limit = self.limit().min(100);
        (page - 1) * limit
    }

    pub fn limit(&self) -> i64 {
        self.limit.unwrap_or(20).clamp(1, 100)
    }

    pub fn tags_array(&self) -> Option<Vec<String>> {
        self.tags.as_ref().map(|t| {
            t.split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        })
    }
}
