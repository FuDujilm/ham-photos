import { useState } from 'react';
import { useCategories } from '../../hooks/usePhotos';
import { Search, Filter } from 'lucide-react';
import type { PhotoQuery } from '../../types/photo';

interface FilterBarProps {
  onFilterChange: (filters: Partial<PhotoQuery>) => void;
  currentFilters: PhotoQuery;
}

export default function FilterBar({ onFilterChange, currentFilters }: FilterBarProps) {
  const [search, setSearch] = useState('');
  const { data: categories } = useCategories();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search });
  };

  const handleCategoryChange = (category: string) => {
    onFilterChange({ category: category === currentFilters.category ? undefined : category });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={20} className="text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">筛选</h2>
      </div>

      {/* 搜索 */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题、描述、呼号..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
      </form>

      {/* 分类 */}
      {categories && categories.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分类</div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  currentFilters.category === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 清除筛选 */}
      {(currentFilters.category || currentFilters.search) && (
        <button
          onClick={() => {
            setSearch('');
            onFilterChange({ category: undefined, search: undefined });
          }}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          清除筛选
        </button>
      )}
    </div>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    equipment: '电台设备',
    antenna: '天线系统',
    event: '活动现场',
    qsl_card: 'QSL卡片',
    certificate: '证书奖项',
    homebrew: '自制项目',
    other: '其他',
  };
  return labels[category] || category;
}
