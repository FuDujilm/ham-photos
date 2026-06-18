-- 创建照片表
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cloudflare_image_id VARCHAR(255) NOT NULL UNIQUE,

    -- 基本信息
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),

    -- 业余无线电元数据
    callsign VARCHAR(20),
    frequency_band VARCHAR(50),
    frequency_mhz DECIMAL(10, 4),
    mode VARCHAR(20),
    equipment TEXT,
    antenna_type VARCHAR(100),
    power_watts INTEGER,

    -- 地理位置
    qth_latitude DECIMAL(9, 6),
    qth_longitude DECIMAL(9, 6),
    qth_name VARCHAR(255),

    -- 时间信息
    photo_taken_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 标签（JSON 数组）
    tags JSONB DEFAULT '[]'::jsonb
);

-- 索引
CREATE INDEX idx_photos_callsign ON photos(callsign);
CREATE INDEX idx_photos_frequency_band ON photos(frequency_band);
CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_tags ON photos USING gin(tags);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);

-- 全文搜索索引
CREATE INDEX idx_photos_search ON photos USING gin(
    to_tsvector('simple',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(callsign, '')
    )
);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
