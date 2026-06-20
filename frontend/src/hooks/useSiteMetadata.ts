import { useEffect } from 'react';
import { siteConfig } from '../config/site';
import { usePublicSettings } from './useSettings';

function upsertMeta(selector: string, create: () => HTMLMetaElement, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);

  if (!meta) {
    meta = create();
    document.head.appendChild(meta);
  }

  meta.content = content;
}

export function useSiteMetadata() {
  const { data: settings } = usePublicSettings();

  useEffect(() => {
    const title = settings?.site_title?.trim() || siteConfig.siteTitle;
    const description = settings?.site_subtitle?.trim() || siteConfig.siteDescription;

    document.title = title;

    upsertMeta(
      'meta[name="description"]',
      () => {
        const meta = document.createElement('meta');
        meta.name = 'description';
        return meta;
      },
      description
    );

    upsertMeta(
      'meta[property="og:title"]',
      () => {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:title');
        return meta;
      },
      title
    );

    upsertMeta(
      'meta[property="og:description"]',
      () => {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:description');
        return meta;
      },
      description
    );
  }, [settings?.site_subtitle, settings?.site_title]);
}
