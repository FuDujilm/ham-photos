import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotos, useDeletePhoto, useUpdatePhoto } from '../hooks/usePhotos';
import { useAdminSettings, useTestImageApi, useUpdateSettings } from '../hooks/useSettings';
import { useAuthStore } from '../stores/authStore';
import UploadForm from '../components/Admin/UploadForm';
import Header from '../components/shared/Header';
import { getImageUrl } from '../utils/cloudflare';
import type { Photo, UpdatePhotoRequest } from '../types/photo';
import type { FooterLinkGroup, SiteSettings } from '../types/settings';
import {
  Edit,
  Globe2,
  Image as ImageIcon,
  Link as LinkIcon,
  LogOut,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from 'lucide-react';

const defaultSettings: SiteSettings = {
  site_title: 'HAM Radio Gallery',
  site_subtitle: '展示业余无线电爱好者的精彩瞬间',
  site_intro: '',
  header_icon: 'radio',
  footer_icp: '',
  footer_police_record: '',
  footer_links: [
    { title: '业余无线电', links: [{ label: '中国无线电协会', url: 'https://www.crac.org.cn' }] },
    { title: '工具资源', links: [{ label: 'QRZ', url: 'https://www.qrz.com' }] },
    { title: '本站链接', links: [{ label: '照片墙', url: '/' }] },
  ],
  s3_endpoint: 'https://api.cloudflare.com/client/v4',
  s3_region: 'auto',
  s3_bucket: '',
  s3_access_key_id: '',
  s3_secret_access_key: '',
  s3_public_base_url: '',
  updated_at: new Date().toISOString(),
};

const tabs = [
  { id: 'photos', label: '照片管理', icon: ImageIcon },
  { id: 'site', label: '网站信息', icon: Globe2 },
  { id: 'footer', label: '页眉页脚', icon: LinkIcon },
  { id: 'storage', label: 'S3 API', icon: Settings },
] as const;

type AdminTab = (typeof tabs)[number]['id'];

type PhotoEditForm = {
  title: string;
  description: string;
  category: string;
  callsign: string;
  frequency_band: string;
  frequency_mhz: string;
  mode: string;
  equipment: string;
  antenna_type: string;
  power_watts: string;
  qth_latitude: string;
  qth_longitude: string;
  qth_name: string;
  photo_taken_at: string;
  tags: string;
};

export default function Admin() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState<AdminTab>('photos');
  const [showUpload, setShowUpload] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(defaultSettings);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const { data, refetch } = usePhotos({ limit: 50 });
  const { data: settings, isLoading: isSettingsLoading } = useAdminSettings();
  const updateSettings = useUpdateSettings();
  const testImageApi = useTestImageApi();
  const deletePhoto = useDeletePhoto();
  const updatePhoto = useUpdatePhoto();

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        ...defaultSettings,
        ...settings,
        footer_links: normalizeFooterLinks(settings.footer_links),
      });
    }
  }, [settings]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这张照片吗？')) {
      await deletePhoto.mutateAsync(id);
      refetch();
    }
  };

  const handleUpdatePhoto = async (id: string, payload: UpdatePhotoRequest) => {
    await updatePhoto.mutateAsync({ id, data: payload });
    setEditingPhoto(null);
    refetch();
  };

  const handleBatchUpdatePhotos = async (payload: Partial<PhotoEditForm>) => {
    const selectedPhotos = data?.photos.filter((photo) => selectedPhotoIds.includes(photo.id)) ?? [];

    for (const photo of selectedPhotos) {
      await updatePhoto.mutateAsync({
        id: photo.id,
        data: mergeBatchPhotoUpdate(photo, payload),
      });
    }

    setShowBatchEdit(false);
    setSelectedPhotoIds([]);
    refetch();
  };

  const updateField = (field: keyof SiteSettings, value: string) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateFooterGroup = (index: number, value: Partial<FooterLinkGroup>) => {
    setSettingsForm((prev) => ({
      ...prev,
      footer_links: prev.footer_links.map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...value } : group
      ),
    }));
  };

  const updateFooterLink = (
    groupIndex: number,
    linkIndex: number,
    field: 'label' | 'url',
    value: string
  ) => {
    setSettingsForm((prev) => ({
      ...prev,
      footer_links: prev.footer_links.map((group, currentGroupIndex) => {
        if (currentGroupIndex !== groupIndex) {
          return group;
        }

        return {
          ...group,
          links: group.links.map((link, currentLinkIndex) =>
            currentLinkIndex === linkIndex ? { ...link, [field]: value } : link
          ),
        };
      }),
    }));
  };

  const addFooterLink = (groupIndex: number) => {
    setSettingsForm((prev) => ({
      ...prev,
      footer_links: prev.footer_links.map((group, currentGroupIndex) =>
        currentGroupIndex === groupIndex
          ? { ...group, links: [...group.links, { label: '', url: '' }] }
          : group
      ),
    }));
  };

  const removeFooterLink = (groupIndex: number, linkIndex: number) => {
    setSettingsForm((prev) => ({
      ...prev,
      footer_links: prev.footer_links.map((group, currentGroupIndex) =>
        currentGroupIndex === groupIndex
          ? { ...group, links: group.links.filter((_, currentLinkIndex) => currentLinkIndex !== linkIndex) }
          : group
      ),
    }));
  };

  const saveSettings = async () => {
    await updateSettings.mutateAsync({
      ...settingsForm,
      footer_links: normalizeFooterLinks(settingsForm.footer_links),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">管理后台</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">照片、站点展示和图像接入配置</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 self-start rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                  isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'photos' && (
          <PhotosPanel
            data={data}
            showUpload={showUpload}
            onToggleUpload={() => setShowUpload((value) => !value)}
            onUploaded={() => {
              setShowUpload(false);
              refetch();
            }}
            onDelete={handleDelete}
            onEditPhoto={setEditingPhoto}
            selectedPhotoIds={selectedPhotoIds}
            onSelectedPhotoIdsChange={setSelectedPhotoIds}
            onBatchEdit={() => setShowBatchEdit(true)}
            imageBaseUrl={settingsForm.s3_public_base_url}
          />
        )}

        {editingPhoto && (
          <EditPhotoDialog
            photo={editingPhoto}
            isSaving={updatePhoto.isPending}
            onClose={() => setEditingPhoto(null)}
            onSave={handleUpdatePhoto}
          />
        )}

        {showBatchEdit && (
          <BatchEditPhotoDialog
            selectedCount={selectedPhotoIds.length}
            isSaving={updatePhoto.isPending}
            onClose={() => setShowBatchEdit(false)}
            onSave={handleBatchUpdatePhotos}
          />
        )}

        {activeTab === 'site' && (
          <SettingsShell
            title="网站信息"
            description="控制前台标题、副标题和页眉图标。"
            isLoading={isSettingsLoading}
            isSaving={updateSettings.isPending}
            onSave={saveSettings}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="网站标题"
                value={settingsForm.site_title}
                onChange={(value) => updateField('site_title', value)}
              />
              <SelectField
                label="页眉图标"
                value={settingsForm.header_icon}
                options={[
                  ['radio', '无线电'],
                  ['antenna', '天线'],
                  ['camera', '相机'],
                  ['images', '图库'],
                  ['satellite', '卫星'],
                ]}
                onChange={(value) => updateField('header_icon', value)}
              />
              <div className="md:col-span-2">
                <TextField
                  label="网站副标题"
                  value={settingsForm.site_subtitle}
                  onChange={(value) => updateField('site_subtitle', value)}
                />
              </div>
              <div className="md:col-span-2">
                <TextAreaField
                  label="介绍信息"
                  value={settingsForm.site_intro}
                  placeholder="用于首页展示的站点介绍，可填写电台、活动、图库内容或维护说明。"
                  onChange={(value) => updateField('site_intro', value)}
                />
              </div>
            </div>
          </SettingsShell>
        )}

        {activeTab === 'footer' && (
          <SettingsShell
            title="页脚与备案信息"
            description="页脚固定为三栏链接表，并在底部展示备案信息。"
            isLoading={isSettingsLoading}
            isSaving={updateSettings.isPending}
            onSave={saveSettings}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="ICP备案信息"
                value={settingsForm.footer_icp ?? ''}
                onChange={(value) => updateField('footer_icp', value)}
              />
              <TextField
                label="公安备案信息"
                value={settingsForm.footer_police_record ?? ''}
                onChange={(value) => updateField('footer_police_record', value)}
              />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {settingsForm.footer_links.map((group, groupIndex) => (
                <div key={groupIndex} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                  <TextField
                    label={`第 ${groupIndex + 1} 栏标题`}
                    value={group.title}
                    onChange={(value) => updateFooterGroup(groupIndex, { title: value })}
                  />
                  <div className="mt-4 space-y-3">
                    {group.links.map((link, linkIndex) => (
                      <div key={linkIndex} className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                        <TextField
                          label="链接名称"
                          value={link.label}
                          onChange={(value) => updateFooterLink(groupIndex, linkIndex, 'label', value)}
                        />
                        <div className="mt-3">
                          <TextField
                            label="链接地址"
                            value={link.url}
                            onChange={(value) => updateFooterLink(groupIndex, linkIndex, 'url', value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFooterLink(groupIndex, linkIndex)}
                          className="mt-3 inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={15} />
                          删除链接
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addFooterLink(groupIndex)}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Plus size={16} />
                    添加链接
                  </button>
                </div>
              ))}
            </div>
          </SettingsShell>
        )}

        {activeTab === 'storage' && (
          <SettingsShell
            title="Cloudflare 图像接入 API"
            description="用于上传和删除图片。字段兼容 S3 风格命名，实际仍接入 Cloudflare Images。"
            isLoading={isSettingsLoading}
            isSaving={updateSettings.isPending}
            onSave={saveSettings}
            secondaryAction={
              <button
                type="button"
                onClick={() => testImageApi.mutate(settingsForm)}
                disabled={testImageApi.isPending}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Settings size={18} />
                {testImageApi.isPending ? '测试中...' : '测试连接'}
              </button>
            }
          >
            {testImageApi.data && (
              <div
                className={`mb-5 rounded-md border px-4 py-3 text-sm ${
                  testImageApi.data.success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                }`}
              >
                {testImageApi.data.message}
                {testImageApi.data.status ? ` 状态码：${testImageApi.data.status}` : ''}
              </div>
            )}
            {testImageApi.isError && (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                连接测试请求失败，请检查后端日志。
              </div>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="API Endpoint"
                value={settingsForm.s3_endpoint ?? ''}
                placeholder="https://api.cloudflare.com/client/v4"
                onChange={(value) => updateField('s3_endpoint', value)}
              />
              <TextField
                label="Region"
                value={settingsForm.s3_region ?? ''}
                placeholder="auto"
                onChange={(value) => updateField('s3_region', value)}
              />
              <TextField
                label="Account Hash / Bucket"
                value={settingsForm.s3_bucket ?? ''}
                onChange={(value) => updateField('s3_bucket', value)}
              />
              <TextField
                label="Account ID / Access Key"
                value={settingsForm.s3_access_key_id ?? ''}
                onChange={(value) => updateField('s3_access_key_id', value)}
              />
              <TextField
                label="API Token / Secret Key"
                type="password"
                value={settingsForm.s3_secret_access_key ?? ''}
                onChange={(value) => updateField('s3_secret_access_key', value)}
              />
              <TextField
                label="图片公开访问域"
                value={settingsForm.s3_public_base_url ?? ''}
                placeholder="https://imagedelivery.net/<account-hash>"
                onChange={(value) => updateField('s3_public_base_url', value)}
              />
            </div>
          </SettingsShell>
        )}
      </main>
    </div>
  );
}

function PhotosPanel({
  data,
  showUpload,
  onToggleUpload,
  onUploaded,
  onDelete,
  onEditPhoto,
  selectedPhotoIds,
  onSelectedPhotoIdsChange,
  onBatchEdit,
  imageBaseUrl,
}: {
  data: ReturnType<typeof usePhotos>['data'];
  showUpload: boolean;
  onToggleUpload: () => void;
  onUploaded: () => void;
  onDelete: (id: string) => void;
  onEditPhoto: (photo: Photo) => void;
  selectedPhotoIds: string[];
  onSelectedPhotoIdsChange: (ids: string[]) => void;
  onBatchEdit: () => void;
  imageBaseUrl?: string | null;
}) {
  const photos = data?.photos ?? [];
  const allSelected = photos.length > 0 && photos.every((photo) => selectedPhotoIds.includes(photo.id));

  const togglePhotoSelection = (id: string) => {
    onSelectedPhotoIdsChange(
      selectedPhotoIds.includes(id)
        ? selectedPhotoIds.filter((selectedId) => selectedId !== id)
        : [...selectedPhotoIds, id]
    );
  };

  const toggleAllSelection = () => {
    onSelectedPhotoIdsChange(allSelected ? [] : photos.map((photo) => photo.id));
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <button
          onClick={onBatchEdit}
          disabled={selectedPhotoIds.length === 0}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Edit size={18} />
          批量修改{selectedPhotoIds.length > 0 ? ` (${selectedPhotoIds.length})` : ''}
        </button>
        <button
          onClick={onToggleUpload}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {showUpload ? '隐藏上传' : '上传照片'}
        </button>
      </div>

      {showUpload && (
        <div className="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          <h2 className="mb-4 text-xl font-semibold dark:text-gray-100">上传新照片</h2>
          <UploadForm onSuccess={onUploaded} />
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="w-12 px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllSelection}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label="选择全部照片"
                  />
                </th>
                {['预览', '标题', '呼号', '分类', '上传时间', '操作'].map((item) => (
                  <th
                    key={item}
                    className={`px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${
                      item === '操作' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {photos.map((photo) => (
                <tr key={photo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/70">
                  <td className="whitespace-nowrap px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedPhotoIds.includes(photo.id)}
                      onChange={() => togglePhotoSelection(photo.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`选择 ${photo.title}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <img
                      src={getImageUrl(photo.cloudflare_image_id, 'thumbnail', imageBaseUrl)}
                      alt={photo.title}
                      className="h-16 w-16 rounded object-cover"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{photo.title}</div>
                    {photo.description && (
                      <div className="max-w-xs truncate text-sm text-gray-500">{photo.description}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {photo.callsign || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {photo.category || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(photo.uploaded_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => onEditPhoto(photo)}
                      className="mr-3 text-blue-600 hover:text-blue-900"
                      title="编辑"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(photo.id)}
                      className="text-red-600 hover:text-red-900"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {photos.length === 0 && (
          <div className="py-12 text-center text-gray-500">暂无照片</div>
        )}
      </div>
    </>
  );
}

function EditPhotoDialog({
  photo,
  isSaving,
  onClose,
  onSave,
}: {
  photo: Photo;
  isSaving: boolean;
  onClose: () => void;
  onSave: (id: string, payload: UpdatePhotoRequest) => void;
}) {
  const [form, setForm] = useState<PhotoEditForm>(() => photoToEditForm(photo));

  const update = (field: keyof PhotoEditForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      return;
    }
    onSave(photo.id, editFormToUpdateRequest(form));
  };

  return (
    <DialogShell title="编辑照片信息" onClose={onClose}>
      <PhotoMetadataForm form={form} onChange={update} requireTitle />
      <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || !form.title.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {isSaving ? '保存中...' : '保存修改'}
        </button>
      </div>
    </DialogShell>
  );
}

function BatchEditPhotoDialog({
  selectedCount,
  isSaving,
  onClose,
  onSave,
}: {
  selectedCount: number;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: Partial<PhotoEditForm>) => void;
}) {
  const [form, setForm] = useState<PhotoEditForm>(() => emptyPhotoEditForm());

  const update = (field: keyof PhotoEditForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(compactBatchEditForm(form));
  };

  return (
    <DialogShell title={`批量修改 ${selectedCount} 张照片`} onClose={onClose}>
      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        只会覆盖已填写的字段，留空字段会保留每张照片原值。
      </div>
      <PhotoMetadataForm form={form} onChange={update} />
      <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || selectedCount === 0}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {isSaving ? '保存中...' : '应用到选中照片'}
        </button>
      </div>
    </DialogShell>
  );
}

function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <section className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-gray-800">
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function PhotoMetadataForm({
  form,
  onChange,
  requireTitle = false,
}: {
  form: PhotoEditForm;
  onChange: (field: keyof PhotoEditForm, value: string) => void;
  requireTitle?: boolean;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField
          label={requireTitle ? '标题 *' : '标题'}
          value={form.title}
          onChange={(value) => onChange('title', value)}
        />
      </div>
      <div className="md:col-span-2">
        <TextAreaField
          label="描述"
          value={form.description}
          onChange={(value) => onChange('description', value)}
        />
      </div>
      <SelectField
        label="分类"
        value={form.category}
        options={[
          ['', '不设置'],
          ['equipment', '电台设备'],
          ['antenna', '天线系统'],
          ['event', '活动现场'],
          ['qsl_card', 'QSL卡片'],
          ['certificate', '证书奖项'],
          ['homebrew', '自制项目'],
          ['other', '其他'],
        ]}
        onChange={(value) => onChange('category', value)}
      />
      <TextField label="呼号" value={form.callsign} onChange={(value) => onChange('callsign', value)} />
      <TextField label="频段" value={form.frequency_band} onChange={(value) => onChange('frequency_band', value)} />
      <TextField label="频率 (MHz)" type="number" value={form.frequency_mhz} onChange={(value) => onChange('frequency_mhz', value)} />
      <TextField label="模式" value={form.mode} onChange={(value) => onChange('mode', value)} />
      <TextField label="天线类型" value={form.antenna_type} onChange={(value) => onChange('antenna_type', value)} />
      <div className="md:col-span-2">
        <TextField label="设备信息" value={form.equipment} onChange={(value) => onChange('equipment', value)} />
      </div>
      <TextField label="功率 (W)" type="number" value={form.power_watts} onChange={(value) => onChange('power_watts', value)} />
      <TextField label="QTH 位置" value={form.qth_name} onChange={(value) => onChange('qth_name', value)} />
      <TextField label="纬度" type="number" value={form.qth_latitude} onChange={(value) => onChange('qth_latitude', value)} />
      <TextField label="经度" type="number" value={form.qth_longitude} onChange={(value) => onChange('qth_longitude', value)} />
      <TextField label="拍摄时间" type="datetime-local" value={form.photo_taken_at} onChange={(value) => onChange('photo_taken_at', value)} />
      <TextField label="标签（逗号分隔）" value={form.tags} onChange={(value) => onChange('tags', value)} />
    </div>
  );
}

function SettingsShell({
  title,
  description,
  isLoading,
  isSaving,
  onSave,
  secondaryAction,
  children,
}: {
  title: string;
  description: string;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => void;
  secondaryAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg bg-white p-6 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
      <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-5 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {secondaryAction}
          <button
            type="button"
            onClick={onSave}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {isSaving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-blue-950"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-blue-950"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-blue-950"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function normalizeFooterLinks(groups: FooterLinkGroup[]): FooterLinkGroup[] {
  const normalized = groups.slice(0, 3).map((group) => ({
    title: group.title,
    links: group.links.filter((link) => link.label.trim() && link.url.trim()),
  }));

  while (normalized.length < 3) {
    normalized.push({ title: `链接栏 ${normalized.length + 1}`, links: [] });
  }

  return normalized;
}

function emptyPhotoEditForm(): PhotoEditForm {
  return {
    title: '',
    description: '',
    category: '',
    callsign: '',
    frequency_band: '',
    frequency_mhz: '',
    mode: '',
    equipment: '',
    antenna_type: '',
    power_watts: '',
    qth_latitude: '',
    qth_longitude: '',
    qth_name: '',
    photo_taken_at: '',
    tags: '',
  };
}

function photoToEditForm(photo: Photo): PhotoEditForm {
  return {
    title: photo.title ?? '',
    description: photo.description ?? '',
    category: photo.category ?? '',
    callsign: photo.callsign ?? '',
    frequency_band: photo.frequency_band ?? '',
    frequency_mhz: photo.frequency_mhz == null ? '' : String(photo.frequency_mhz),
    mode: photo.mode ?? '',
    equipment: photo.equipment ?? '',
    antenna_type: photo.antenna_type ?? '',
    power_watts: photo.power_watts == null ? '' : String(photo.power_watts),
    qth_latitude: photo.qth_latitude == null ? '' : String(photo.qth_latitude),
    qth_longitude: photo.qth_longitude == null ? '' : String(photo.qth_longitude),
    qth_name: photo.qth_name ?? '',
    photo_taken_at: toDateTimeLocal(photo.photo_taken_at),
    tags: photo.tags?.join(', ') ?? '',
  };
}

function editFormToUpdateRequest(form: PhotoEditForm): UpdatePhotoRequest {
  return {
    title: form.title.trim(),
    description: emptyToUndefined(form.description),
    category: emptyToUndefined(form.category),
    callsign: emptyToUndefined(form.callsign),
    frequency_band: emptyToUndefined(form.frequency_band),
    frequency_mhz: stringToNumber(form.frequency_mhz),
    mode: emptyToUndefined(form.mode),
    equipment: emptyToUndefined(form.equipment),
    antenna_type: emptyToUndefined(form.antenna_type),
    power_watts: stringToInteger(form.power_watts),
    qth_latitude: stringToNumber(form.qth_latitude),
    qth_longitude: stringToNumber(form.qth_longitude),
    qth_name: emptyToUndefined(form.qth_name),
    photo_taken_at: dateTimeLocalToIso(form.photo_taken_at),
    tags: splitTags(form.tags),
  };
}

function compactBatchEditForm(form: PhotoEditForm): Partial<PhotoEditForm> {
  return Object.fromEntries(
    Object.entries(form).filter(([, value]) => value.trim() !== '')
  ) as Partial<PhotoEditForm>;
}

function mergeBatchPhotoUpdate(photo: Photo, patch: Partial<PhotoEditForm>): UpdatePhotoRequest {
  return editFormToUpdateRequest({
    ...photoToEditForm(photo),
    ...patch,
  });
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function stringToNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringToInteger(value: string): number | undefined {
  const parsed = stringToNumber(value);
  return parsed == null ? undefined : Math.trunc(parsed);
}

function toDateTimeLocal(value?: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

function dateTimeLocalToIso(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
