import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { usePhoto } from '../hooks/usePhotos';
import { getImageUrl } from '../utils/cloudflare';
import { ArrowLeft, MapPin, Radio, Zap, Antenna } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { usePublicSettings } from '../hooks/useSettings';

export default function PhotoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: photo, isLoading, error } = usePhoto(id!);
  const { data: settings } = usePublicSettings();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            照片不存在或加载失败
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = getImageUrl(photo.cloudflare_image_id, 'large', settings?.s3_public_base_url);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* 图片 */}
            <div className="aspect-w-16 aspect-h-12">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block h-full w-full cursor-zoom-in rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950"
                aria-label="放大查看图片"
              >
                <img
                  src={imageUrl}
                  alt={photo.title}
                  className="h-full w-full rounded-lg object-contain"
                />
              </button>
            </div>

            {/* 详情 */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{photo.title}</h1>

              {photo.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-6">{photo.description}</p>
              )}

              <div className="space-y-4">
                {photo.callsign && (
                  <div className="flex items-center gap-3">
                    <Radio className="text-blue-600" size={20} />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">呼号</div>
                      <div className="font-semibold">{photo.callsign}</div>
                    </div>
                  </div>
                )}

                {photo.frequency_band && (
                  <div className="flex items-center gap-3">
                    <Zap className="text-blue-600" size={20} />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">频段</div>
                      <div className="font-semibold">
                        {photo.frequency_band}
                        {photo.frequency_mhz && ` (${photo.frequency_mhz} MHz)`}
                      </div>
                    </div>
                  </div>
                )}

                {photo.antenna_type && (
                  <div className="flex items-center gap-3">
                    <Antenna className="text-blue-600" size={20} />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">天线类型</div>
                      <div className="font-semibold">{photo.antenna_type}</div>
                    </div>
                  </div>
                )}

                {photo.qth_name && (
                  <div className="flex items-center gap-3">
                    <MapPin className="text-blue-600" size={20} />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">位置</div>
                      <div className="font-semibold">{photo.qth_name}</div>
                    </div>
                  </div>
                )}

                {photo.equipment && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">设备</div>
                    <div className="text-gray-900 dark:text-gray-100">{photo.equipment}</div>
                  </div>
                )}

                {photo.mode && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">模式</div>
                    <div className="text-gray-900 dark:text-gray-100">{photo.mode}</div>
                  </div>
                )}

                {photo.power_watts && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">功率</div>
                    <div className="text-gray-900 dark:text-gray-100">{photo.power_watts} W</div>
                  </div>
                )}

                {photo.tags && photo.tags.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">标签</div>
                    <div className="flex flex-wrap gap-2">
                      {photo.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm dark:bg-blue-950 dark:text-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                上传时间：{new Date(photo.uploaded_at).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={[
          {
            src: imageUrl,
          },
        ]}
      />
    </div>
  );
}
