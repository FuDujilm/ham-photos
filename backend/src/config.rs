use anyhow::Result;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub cloudflare_account_id: String,
    pub cloudflare_api_token: String,
    pub cloudflare_account_hash: String,
    pub jwt_secret: String,
    pub admin_username: String,
    pub admin_password_hash: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenv::dotenv().ok();

        Ok(Config {
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            cloudflare_account_id: std::env::var("CLOUDFLARE_ACCOUNT_ID")
                .expect("CLOUDFLARE_ACCOUNT_ID must be set"),
            cloudflare_api_token: std::env::var("CLOUDFLARE_API_TOKEN")
                .expect("CLOUDFLARE_API_TOKEN must be set"),
            cloudflare_account_hash: std::env::var("CLOUDFLARE_ACCOUNT_HASH")
                .expect("CLOUDFLARE_ACCOUNT_HASH must be set"),
            jwt_secret: std::env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            admin_username: std::env::var("ADMIN_USERNAME")
                .unwrap_or_else(|_| "admin".to_string()),
            admin_password_hash: std::env::var("ADMIN_PASSWORD_HASH")
                .expect("ADMIN_PASSWORD_HASH must be set"),
        })
    }
}
