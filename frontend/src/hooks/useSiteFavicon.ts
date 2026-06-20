import { useEffect } from 'react';
import { siteConfig } from '../config/site';
import { usePublicSettings } from './useSettings';

export function useSiteFavicon() {
  const { data: settings } = usePublicSettings();

  useEffect(() => {
    const href = settings?.site_favicon_url?.trim() || siteConfig.faviconUrl;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = href;
  }, [settings?.site_favicon_url]);
}
