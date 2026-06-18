CREATE TABLE site_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    site_title VARCHAR(120) NOT NULL DEFAULT 'HAM Radio Gallery',
    site_subtitle VARCHAR(255) NOT NULL DEFAULT '展示业余无线电爱好者的精彩瞬间',
    header_icon VARCHAR(50) NOT NULL DEFAULT 'radio',
    footer_icp VARCHAR(120),
    footer_police_record VARCHAR(120),
    footer_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    s3_endpoint TEXT,
    s3_region VARCHAR(120),
    s3_bucket VARCHAR(255),
    s3_access_key_id TEXT,
    s3_secret_access_key TEXT,
    s3_public_base_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT site_settings_singleton CHECK (id)
);

INSERT INTO site_settings (
    id,
    footer_icp,
    footer_police_record,
    footer_links
)
VALUES (
    TRUE,
    'ICP备案号待配置',
    '公安备案号待配置',
    '[
        {
            "title": "业余无线电",
            "links": [
                { "label": "中国无线电协会", "url": "https://www.crac.org.cn" },
                { "label": "IARU", "url": "https://www.iaru.org" }
            ]
        },
        {
            "title": "工具资源",
            "links": [
                { "label": "QRZ", "url": "https://www.qrz.com" },
                { "label": "DX Cluster", "url": "https://www.dxsummit.fi" }
            ]
        },
        {
            "title": "本站链接",
            "links": [
                { "label": "照片墙", "url": "/" },
                { "label": "管理后台", "url": "/admin" }
            ]
        }
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
