export type ImageVariant = 'thumbnail' | 'medium' | 'large' | 'public';

export function getImageUrl(
  imageId: string,
  _variant: ImageVariant = 'medium',
  publicBaseUrl?: string | null
): string {
  const configuredBaseUrl = publicBaseUrl?.trim().replace(/\/$/, '');

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${imageId}`;
  }

  if (imageId.startsWith('photos/')) {
    return `/api/images/${imageId}`;
  }

  return `/api/images/${imageId}`;
}

export function getResponsiveImageUrls(imageId: string) {
  return {
    thumbnail: getImageUrl(imageId, 'thumbnail'),
    medium: getImageUrl(imageId, 'medium'),
    large: getImageUrl(imageId, 'large'),
  };
}
