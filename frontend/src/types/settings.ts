export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

export interface PublicSiteSettings {
  site_title: string;
  site_subtitle: string;
  site_intro: string;
  header_icon: string;
  footer_icp?: string | null;
  footer_police_record?: string | null;
  footer_links: FooterLinkGroup[];
  s3_public_base_url?: string | null;
  updated_at: string;
}

export interface SiteSettings extends PublicSiteSettings {
  s3_endpoint?: string | null;
  s3_region?: string | null;
  s3_bucket?: string | null;
  s3_access_key_id?: string | null;
  s3_secret_access_key?: string | null;
}

export interface TestImageApiResponse {
  success: boolean;
  status?: number | null;
  message: string;
}
