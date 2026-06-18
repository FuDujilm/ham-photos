import type { Photo } from '../../types/photo';
import PhotoCard from './PhotoCard';
import { usePublicSettings } from '../../hooks/useSettings';

interface PhotoGridProps {
  photos: Photo[];
}

export default function PhotoGrid({ photos }: PhotoGridProps) {
  const { data: settings } = usePublicSettings();
  const imageBaseUrl = settings?.s3_public_base_url;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          imageBaseUrl={imageBaseUrl}
        />
      ))}
    </div>
  );
}
