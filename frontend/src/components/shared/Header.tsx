import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Antenna, Camera, Images, Radio, SatelliteDish, User } from 'lucide-react';
import { usePublicSettings } from '../../hooks/useSettings';
import { siteConfig } from '../../config/site';

const iconMap = {
  radio: Radio,
  antenna: Antenna,
  camera: Camera,
  images: Images,
  satellite: SatelliteDish,
};

export default function Header() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: settings } = usePublicSettings();
  const Icon = iconMap[(settings?.header_icon as keyof typeof iconMap) || 'radio'] ?? Radio;

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-gray-100">
            <Icon className="text-blue-600" size={28} />
            <span>{settings?.site_title ?? siteConfig.siteTitle}</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
              首页
            </Link>
            {isAuthenticated && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <User size={18} />
                管理后台
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
