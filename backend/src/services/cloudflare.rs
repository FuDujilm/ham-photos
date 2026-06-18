use chrono::Utc;
use hmac::{Hmac, Mac};
use reqwest::Method;
use sha2::{Digest, Sha256};
use url::Url;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone)]
pub struct R2Credentials {
    pub endpoint: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
}

pub async fn upload_image(
    file_bytes: Vec<u8>,
    filename: String,
    endpoint: &str,
    bucket: &str,
    access_key_id: &str,
    secret_access_key: &str,
    region: &str,
) -> Result<String, String> {
    let key = object_key(&filename);
    let url = object_url(endpoint, bucket, &key)?;
    let payload_hash = sha256_hex(&file_bytes);

    let response = signed_request(
        Method::PUT,
        &url,
        access_key_id,
        secret_access_key,
        region,
        &payload_hash,
        &[("content-type", "image/webp")],
    )?
    .body(file_bytes)
    .send()
    .await
    .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("R2 upload failed ({}): {}", status, body));
    }

    Ok(key)
}

pub async fn delete_image(
    image_id: &str,
    endpoint: &str,
    bucket: &str,
    access_key_id: &str,
    secret_access_key: &str,
    region: &str,
) -> Result<(), String> {
    let url = object_url(endpoint, bucket, image_id)?;
    let payload_hash = sha256_hex(&[]);

    let response = signed_request(
        Method::DELETE,
        &url,
        access_key_id,
        secret_access_key,
        region,
        &payload_hash,
        &[],
    )?
    .send()
    .await
    .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() && status.as_u16() != 404 {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("R2 delete failed ({}): {}", status, body));
    }

    Ok(())
}

pub async fn get_image(
    image_id: &str,
    endpoint: &str,
    bucket: &str,
    access_key_id: &str,
    secret_access_key: &str,
    region: &str,
) -> Result<Vec<u8>, String> {
    let url = object_url(endpoint, bucket, image_id)?;
    let payload_hash = sha256_hex(&[]);

    let response = signed_request(
        Method::GET,
        &url,
        access_key_id,
        secret_access_key,
        region,
        &payload_hash,
        &[],
    )?
    .send()
    .await
    .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("R2 read failed ({}): {}", status, body));
    }

    response
        .bytes()
        .await
        .map(|bytes| bytes.to_vec())
        .map_err(|e| format!("Failed to read R2 response: {}", e))
}

pub async fn test_connection(credentials: &R2Credentials) -> Result<(u16, String), String> {
    let mut url = bucket_url(&credentials.endpoint, &credentials.bucket)?;
    url.set_query(Some("list-type=2&max-keys=1"));
    let payload_hash = sha256_hex(&[]);

    let response = signed_request(
        Method::GET,
        &url,
        &credentials.access_key_id,
        &credentials.secret_access_key,
        &credentials.region,
        &payload_hash,
        &[],
    )?
    .send()
    .await
    .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();

    if status.is_success() {
        Ok((status.as_u16(), "连接成功，R2 S3 API 可访问。".to_string()))
    } else {
        Err(format!("R2 API returned {}: {}", status, body))
    }
}

fn signed_request(
    method: Method,
    url: &Url,
    access_key_id: &str,
    secret_access_key: &str,
    region: &str,
    payload_hash: &str,
    extra_headers: &[(&str, &str)],
) -> Result<reqwest::RequestBuilder, String> {
    let now = Utc::now();
    let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
    let date_stamp = now.format("%Y%m%d").to_string();
    let host = url
        .host_str()
        .ok_or_else(|| "Endpoint host is invalid".to_string())?;

    let canonical_uri = if url.path().is_empty() {
        "/"
    } else {
        url.path()
    };
    let canonical_query = url.query().unwrap_or("");
    let mut canonical_header_lines = vec![
        format!("host:{}", host),
        format!("x-amz-content-sha256:{}", payload_hash),
        format!("x-amz-date:{}", amz_date),
    ];
    for (name, value) in extra_headers {
        canonical_header_lines.push(format!("{}:{}", name.to_lowercase(), value.trim()));
    }
    canonical_header_lines.sort();

    let canonical_headers = format!("{}\n", canonical_header_lines.join("\n"));
    let mut signed_header_names = vec![
        "host".to_string(),
        "x-amz-content-sha256".to_string(),
        "x-amz-date".to_string(),
    ];
    for (name, _) in extra_headers {
        signed_header_names.push(name.to_lowercase());
    }
    signed_header_names.sort();
    let signed_headers = signed_header_names.join(";");

    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        method.as_str(),
        canonical_uri,
        canonical_query,
        canonical_headers,
        signed_headers,
        payload_hash
    );

    let credential_scope = format!("{}/{}/s3/aws4_request", date_stamp, region);
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{}\n{}\n{}",
        amz_date,
        credential_scope,
        sha256_hex(canonical_request.as_bytes())
    );
    let signing_key = signing_key(secret_access_key, &date_stamp, region)?;
    let signature = hmac_hex(&signing_key, string_to_sign.as_bytes())?;
    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
        access_key_id, credential_scope, signed_headers, signature
    );

    let mut request = reqwest::Client::new()
        .request(method, url.clone())
        .header("host", host)
        .header("x-amz-date", amz_date)
        .header("x-amz-content-sha256", payload_hash)
        .header("authorization", authorization);

    for (name, value) in extra_headers {
        request = request.header(*name, *value);
    }

    Ok(request)
}

fn bucket_url(endpoint: &str, bucket: &str) -> Result<Url, String> {
    let base = Url::parse(endpoint.trim_end_matches('/'))
        .map_err(|e| format!("Invalid endpoint URL: {}", e))?;
    let mut url = base.clone();

    let base_path = base.path().trim_end_matches('/');
    url.set_path(&format!("{}/{}", base_path, encode_path_segment(bucket)));
    url.set_query(None);

    Ok(url)
}

fn object_url(endpoint: &str, bucket: &str, key: &str) -> Result<Url, String> {
    let mut url = bucket_url(endpoint, bucket)?;
    let path = url.path().trim_end_matches('/').to_string();
    url.set_path(&format!("{}/{}", path, encode_key(key)));
    Ok(url)
}

fn object_key(_filename: &str) -> String {
    format!(
        "photos/{}-{}.webp",
        Utc::now().format("%Y%m%d%H%M%S"),
        Uuid::new_v4()
    )
}

fn encode_key(key: &str) -> String {
    key.split('/').map(encode_path_segment).collect::<Vec<_>>().join("/")
}

fn encode_path_segment(segment: &str) -> String {
    url::form_urlencoded::byte_serialize(segment.as_bytes()).collect()
}

fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

fn signing_key(secret: &str, date: &str, region: &str) -> Result<Vec<u8>, String> {
    let date_key = hmac(format!("AWS4{}", secret).as_bytes(), date.as_bytes())?;
    let date_region_key = hmac(&date_key, region.as_bytes())?;
    let date_region_service_key = hmac(&date_region_key, b"s3")?;
    hmac(&date_region_service_key, b"aws4_request")
}

fn hmac(key: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
    let mut mac = HmacSha256::new_from_slice(key).map_err(|e| e.to_string())?;
    mac.update(data);
    Ok(mac.finalize().into_bytes().to_vec())
}

fn hmac_hex(key: &[u8], data: &[u8]) -> Result<String, String> {
    Ok(hex::encode(hmac(key, data)?))
}
