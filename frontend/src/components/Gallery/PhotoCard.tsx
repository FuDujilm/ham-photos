import { useNavigate } from 'react-router-dom';
import type { Photo } from '../../types/photo';
import { getImageUrl } from '../../utils/cloudflare';
import { Radio, MapPin } from 'lucide-react';

interface PhotoCardProps {
  photo: Photo;
  imageBaseUrl?: string | null;
  onClick?: () => void;
}

export default function PhotoCard({ photo, imageBaseUrl, onClick }: PhotoCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/photo/${photo.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800"
    >
      <div className="aspect-w-16 aspect-h-12 bg-gray-200 dark:bg-gray-800">
        <img
          src={getImageUrl(photo.cloudflare_image_id, 'thumbnail', imageBaseUrl)}
          alt={photo.title}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          {photo.title}
        </h3>

        {photo.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{photo.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
          {photo.callsign && (
            <div className="flex items-center gap-1">
              <Radio size={14} />
              <span>{photo.callsign}</span>
            </div>
          )}
          {photo.qth_name && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{photo.qth_name}</span>
            </div>
          )}
        </div>

        {photo.tags && photo.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {photo.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs dark:bg-blue-950 dark:text-blue-300"
              >
                {tag}
              </span>
            ))}
            {photo.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs dark:bg-gray-800 dark:text-gray-300">
                +{photo.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
