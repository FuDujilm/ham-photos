const CF_DELIVERY_URL = 'https://imagedelivery.net';
const CF_ACCOUNT_HASH = import.meta.env.VITE_CF_ACCOUNT_HASH;

export type ImageVariant = 'thumbnail' | 'medium' | 'large' | 'public';

export function getImageUrl(
  imageId: string,
  variant: ImageVariant = 'medium',
  publicBaseUrl?: string | null
): string {
  const configuredBaseUrl = publicBaseUrl?.trim().replace(/\/$/, '');

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${imageId}`;
  }

  if (imageId.startsWith('photos/')) {
    return `/api/images/${imageId}`;
  }

  if (!CF_ACCOUNT_HASH) {
    console.error('VITE_CF_ACCOUNT_HASH is not configured');
    return '';
  }
  return `${CF_DELIVERY_URL}/${CF_ACCOUNT_HASH}/${imageId}/${variant}`;
}

export function getResponsiveImageUrls(imageId: string) {
  return {
    thumbnail: getImageUrl(imageId, 'thumbnail'),
    medium: getImageUrl(imageId, 'medium'),
    large: getImageUrl(imageId, 'large'),
  };
}
