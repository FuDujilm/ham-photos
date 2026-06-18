import { useState } from 'react';
import { usePhotos } from '../hooks/usePhotos';
import PhotoGrid from '../components/Gallery/PhotoGrid';
import FilterBar from '../components/Gallery/FilterBar';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { usePublicSettings } from '../hooks/useSettings';
import type { PhotoQuery } from '../types/photo';

export default function Gallery() {
  const [filters, setFilters] = useState<PhotoQuery>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = usePhotos(filters);
  const { data: settings } = usePublicSettings();

  const handleFilterChange = (newFilters: Partial<PhotoQuery>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {settings?.site_title ?? '业余无线电风采'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {settings?.site_subtitle ?? '展示业余无线电爱好者的精彩瞬间'}
          </p>
          {settings?.site_intro && (
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-gray-700 dark:text-gray-300">
              {settings.site_intro}
            </p>
          )}
        </div>

        <FilterBar onFilterChange={handleFilterChange} currentFilters={filters} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            加载失败，请稍后重试
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        ) : data?.photos && data.photos.length > 0 ? (
          <>
            <PhotoGrid photos={data.photos} />

            {/* 分页 */}
            {data.total > (filters.limit || 20) && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={(filters.page || 1) <= 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                  第 {filters.page || 1} 页 / 共 {Math.ceil(data.total / (filters.limit || 20))} 页
                </span>
                <button
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={(filters.page || 1) >= Math.ceil(data.total / (filters.limit || 20))}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">暂无照片</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
