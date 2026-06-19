import { useEffect } from 'react';
import { usePublicSettings } from './useSettings';

const DEFAULT_FAVICON_URL = '/vite.svg';

export function useSiteFavicon() {
  const { data: settings } = usePublicSettings();

  useEffect(() => {
    const href = settings?.site_favicon_url?.trim() || DEFAULT_FAVICON_URL;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = href;
  }, [settings?.site_favicon_url]);
}
