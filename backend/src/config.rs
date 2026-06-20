use anyhow::Result;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub site_config_path: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenv::dotenv().ok();

        Ok(Config {
            database_url: std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            site_config_path: std::env::var("SITE_CONFIG_PATH")
                .unwrap_or_else(|_| "../config/site.json".to_string()),
        })
    }
}
