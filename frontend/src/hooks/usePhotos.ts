import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { photosApi } from '../api/photos';
import type { PhotoQuery, CreatePhotoMetadata, UpdatePhotoRequest } from '../types/photo';

export function usePhotos(params?: PhotoQuery) {
  return useQuery({
    queryKey: ['photos', params],
    queryFn: () => photosApi.list(params),
  });
}

export function usePhoto(id: string) {
  return useQuery({
    queryKey: ['photos', id],
    queryFn: () => photosApi.get(id),
    enabled: !!id,
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: CreatePhotoMetadata }) =>
      photosApi.upload(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useUpdatePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePhotoRequest }) =>
      photosApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['photos', variables.id] });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => photosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => photosApi.getTags(),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => photosApi.getCategories(),
  });
}
