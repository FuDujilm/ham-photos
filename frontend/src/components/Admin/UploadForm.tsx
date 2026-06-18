import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useUploadPhoto } from '../../hooks/usePhotos';
import { Upload } from 'lucide-react';
import axios from 'axios';
import type { CreatePhotoMetadata } from '../../types/photo';

interface UploadFormProps {
  onSuccess?: () => void;
}

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';

export default function UploadForm({ onSuccess }: UploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePhotoMetadata>();
  const uploadPhoto = useUploadPhoto();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length > 0) {
      if (selectedFiles.some((selectedFile) => selectedFile.size > 20 * 1024 * 1024)) {
        setUploadError('图片不能超过 20MB。');
        e.target.value = '';
        return;
      }
      setUploadError(null);
      setUploadedCount(0);
      setFiles(selectedFiles);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFiles[0]);
    }
  };

  const onSubmit = async (data: CreatePhotoMetadata) => {
    if (files.length === 0) return;
    setUploadError(null);
    setUploadedCount(0);

    try {
      for (const [index, currentFile] of files.entries()) {
        const metadata = {
          ...data,
          title: data.title?.trim() || filenameToTitle(currentFile.name),
          tags: data.tags
            ? String(data.tags).split(',').map((t) => t.trim()).filter(Boolean)
            : undefined,
        };

        await uploadPhoto.mutateAsync({ file: currentFile, metadata });
        setUploadedCount(index + 1);
      }

      // 重置表单
      reset();
      setFiles([]);
      setPreview(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        setUploadError(String(message));
      } else if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError('上传失败，请检查后端日志。');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 文件上传 */}
      <div>
        <label className={labelClass}>
          照片 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors dark:border-gray-700 dark:hover:border-gray-600">
          <div className="space-y-1 text-center">
            {preview ? (
              <div className="space-y-2">
                <img src={preview} alt="Preview" className="mx-auto h-48 w-auto rounded" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  已选择 {files.length} 张图片，预览第一张
                </p>
              </div>
            ) : (
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <div className="flex text-sm text-gray-600 dark:text-gray-400">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 dark:bg-gray-900 dark:text-blue-300 dark:hover:text-blue-200">
                <span>{files.length > 0 ? '更换文件' : '选择文件'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="sr-only"
                  required
                />
              </label>
              <p className="pl-1">或拖拽到此处</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP 最大 20MB，上传时自动转 WebP</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 标题 */}
        <div className="md:col-span-2">
          <label className={labelClass}>
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('title')}
            type="text"
            placeholder="批量上传留空则使用文件名"
            className={inputClass}
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">标题为必填项</p>}
        </div>

        {/* 描述 */}
        <div className="md:col-span-2">
          <label className={labelClass}>描述</label>
          <textarea
            {...register('description')}
            rows={3}
            className={inputClass}
          />
        </div>

        {/* 分类 */}
        <div>
          <label className={labelClass}>分类</label>
          <select
            {...register('category')}
            className={inputClass}
          >
            <option value="">选择分类</option>
            <option value="equipment">电台设备</option>
            <option value="antenna">天线系统</option>
            <option value="event">活动现场</option>
            <option value="qsl_card">QSL卡片</option>
            <option value="certificate">证书奖项</option>
            <option value="homebrew">自制项目</option>
            <option value="other">其他</option>
          </select>
        </div>

        {/* 呼号 */}
        <div>
          <label className={labelClass}>呼号</label>
          <input
            {...register('callsign')}
            type="text"
            placeholder="如：BH1ABC"
            className={inputClass}
          />
        </div>

        {/* 频段 */}
        <div>
          <label className={labelClass}>频段</label>
          <input
            {...register('frequency_band')}
            type="text"
            placeholder="如：20m, 2m, 70cm"
            className={inputClass}
          />
        </div>

        {/* 频率 */}
        <div>
          <label className={labelClass}>频率 (MHz)</label>
          <input
            {...register('frequency_mhz', { valueAsNumber: true })}
            type="number"
            step="0.0001"
            placeholder="如：14.300"
            className={inputClass}
          />
        </div>

        {/* 模式 */}
        <div>
          <label className={labelClass}>模式</label>
          <input
            {...register('mode')}
            type="text"
            placeholder="如：SSB, CW, FT8, FM"
            className={inputClass}
          />
        </div>

        {/* 天线类型 */}
        <div>
          <label className={labelClass}>天线类型</label>
          <input
            {...register('antenna_type')}
            type="text"
            placeholder="如：Dipole, Yagi, Vertical"
            className={inputClass}
          />
        </div>

        {/* 设备 */}
        <div className="md:col-span-2">
          <label className={labelClass}>设备信息</label>
          <input
            {...register('equipment')}
            type="text"
            placeholder="如：Yaesu FT-991A"
            className={inputClass}
          />
        </div>

        {/* 功率 */}
        <div>
          <label className={labelClass}>功率 (W)</label>
          <input
            {...register('power_watts', { valueAsNumber: true })}
            type="number"
            placeholder="如：100"
            className={inputClass}
          />
        </div>

        {/* QTH 地点名称 */}
        <div>
          <label className={labelClass}>QTH 位置</label>
          <input
            {...register('qth_name')}
            type="text"
            placeholder="如：北京市海淀区"
            className={inputClass}
          />
        </div>

        {/* 标签 */}
        <div className="md:col-span-2">
          <label className={labelClass}>
            标签（逗号分隔）
          </label>
          <input
            {...register('tags')}
            type="text"
            placeholder="如：HF, 短波, 竞赛"
            className={inputClass}
          />
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            reset();
            setFiles([]);
            setPreview(null);
            setUploadedCount(0);
          }}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          重置
        </button>
        <button
          type="submit"
          disabled={uploadPhoto.isPending || files.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadPhoto.isPending
            ? `上传中 ${uploadedCount}/${files.length}`
            : files.length > 1
              ? `批量上传 ${files.length} 张`
              : '上传照片'}
        </button>
      </div>

      {uploadPhoto.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {uploadError || '上传失败，请重试'}
        </div>
      )}
    </form>
  );
}

function filenameToTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').trim() || '未命名照片';
}
