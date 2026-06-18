import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/photos';
import type { SiteSettings } from '../types/settings';

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => settingsApi.getPublic(),
    staleTime: 60_000,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ['settings', 'admin'],
    queryFn: () => settingsApi.getAdmin(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: SiteSettings) => settingsApi.update(settings),
    onSuccess: (settings) => {
      queryClient.setQueryData(['settings', 'admin'], settings);
      queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
    },
  });
}

export function useTestImageApi() {
  return useMutation({
    mutationFn: (settings: SiteSettings) => settingsApi.testImageApi(settings),
  });
}
