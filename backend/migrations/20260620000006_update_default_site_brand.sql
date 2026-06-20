ALTER TABLE site_settings
ALTER COLUMN site_title SET DEFAULT '火腿次元';

ALTER TABLE site_settings
ALTER COLUMN site_subtitle SET DEFAULT '记录业余无线电爱好者的精彩瞬间';

ALTER TABLE site_settings
ALTER COLUMN site_intro SET DEFAULT '';

ALTER TABLE site_settings
ALTER COLUMN site_favicon_url SET DEFAULT '/favicon.svg';

UPDATE site_settings
SET site_title = '火腿次元'
WHERE site_title IN ('HAM Radio Gallery', '业余无线电风采');

UPDATE site_settings
SET site_subtitle = '记录业余无线电爱好者的精彩瞬间'
WHERE site_subtitle = '展示业余无线电爱好者的精彩瞬间';

UPDATE site_settings
SET site_favicon_url = '/favicon.svg'
WHERE site_favicon_url = '';

UPDATE site_settings
SET footer_icp = NULL
WHERE footer_icp = 'ICP备案号待配置';

UPDATE site_settings
SET footer_police_record = NULL
WHERE footer_police_record = '公安备案号待配置';
