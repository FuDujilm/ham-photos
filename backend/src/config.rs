use anyhow::Result;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub site_config_path: String,
    pub upload_max_bytes: usize,
    pub upload_max_mb: usize,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenv::dotenv().ok();

        let upload_max_mb = std::env::var("UPLOAD_MAX_MB")
            .ok()
            .and_then(|value| value.parse::<usize>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(50);

        Ok(Config {
            database_url: std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            site_config_path: std::env::var("SITE_CONFIG_PATH")
                .unwrap_or_else(|_| "../config/site.json".to_string()),
            upload_max_bytes: upload_max_mb * 1024 * 1024,
            upload_max_mb,
        })
    }
}
