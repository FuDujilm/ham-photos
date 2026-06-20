import rawSiteConfig from '@site-config';

export type SiteConfig = typeof rawSiteConfig;

export const siteConfig: SiteConfig = rawSiteConfig;

export function getConfiguredRecord(value?: string | null, fallback = '') {
  const record = value?.trim() || fallback.trim();

  if (!record || record.includes('待配置')) {
    return '';
  }

  return record;
}

export function getPoliceBeianUrl(record: string) {
  const recordCode = record.match(/\d{12,}/)?.[0];
  return recordCode
    ? `${siteConfig.policeBeianBaseUrl}${recordCode}`
    : siteConfig.policeBeianHomeUrl;
}
