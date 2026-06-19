import apiClient from './client';
import type {
  Photo,
  PhotoQuery,
  PhotoListResponse,
  CreatePhotoMetadata,
  UpdatePhotoRequest,
} from '../types/photo';
import type { InitRequest, InitResponse, InitStatusResponse, LoginRequest, LoginResponse } from '../types/api';
import type { PublicSiteSettings, SiteSettings, TestImageApiResponse } from '../types/settings';

export const photosApi = {
  // 获取照片列表
  list: async (params?: PhotoQuery): Promise<PhotoListResponse> => {
    const response = await apiClient.get<PhotoListResponse>('/photos', { params });
    return response.data;
  },

  // 获取单张照片
  get: async (id: string): Promise<Photo> => {
    const response = await apiClient.get<Photo>(`/photos/${id}`);
    return response.data;
  },

  // 上传照片
  upload: async (file: File, metadata: CreatePhotoMetadata): Promise<Photo> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await apiClient.post<Photo>('/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 更新照片
  update: async (id: string, data: UpdatePhotoRequest): Promise<Photo> => {
    const response = await apiClient.put<Photo>(`/photos/${id}`, data);
    return response.data;
  },

  // 删除照片
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/photos/${id}`);
  },

  // 获取所有标签
  getTags: async (): Promise<string[]> => {
    const response = await apiClient.get<{ tags: string[] }>('/tags');
    return response.data.tags;
  },

  // 获取所有分类
  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get<{ categories: string[] }>('/categories');
    return response.data.categories;
  },
};

export const authApi = {
  // 登录
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/admin/login', credentials);
    return response.data;
  },

  getInitStatus: async (): Promise<InitStatusResponse> => {
    const response = await apiClient.get<InitStatusResponse>('/init/status');
    return response.data;
  },

  initialize: async (payload: InitRequest): Promise<InitResponse> => {
    const response = await apiClient.post<InitResponse>('/init', payload);
    return response.data;
  },
};

export const settingsApi = {
  getPublic: async (): Promise<PublicSiteSettings> => {
    const response = await apiClient.get<PublicSiteSettings>('/settings');
    return response.data;
  },

  getAdmin: async (): Promise<SiteSettings> => {
    const response = await apiClient.get<SiteSettings>('/admin/settings');
    return response.data;
  },

  update: async (settings: SiteSettings): Promise<SiteSettings> => {
    const response = await apiClient.put<SiteSettings>('/admin/settings', settings);
    return response.data;
  },

  testImageApi: async (settings: SiteSettings): Promise<TestImageApiResponse> => {
    const response = await apiClient.post<TestImageApiResponse>(
      '/admin/settings/test-image-api',
      {
        s3_endpoint: settings.s3_endpoint,
        s3_bucket: settings.s3_bucket,
        s3_access_key_id: settings.s3_access_key_id,
        s3_secret_access_key: settings.s3_secret_access_key,
      }
    );
    return response.data;
  },
};
