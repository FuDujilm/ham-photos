export interface Photo {
  id: string;
  cloudflare_image_id: string;
  title: string;
  description?: string;
  category?: string;
  callsign?: string;
  frequency_band?: string;
  frequency_mhz?: number;
  mode?: string;
  equipment?: string;
  antenna_type?: string;
  power_watts?: number;
  qth_latitude?: number;
  qth_longitude?: number;
  qth_name?: string;
  photo_taken_at?: string;
  uploaded_at: string;
  updated_at: string;
  tags: string[];
}

export interface PhotoQuery {
  page?: number;
  limit?: number;
  category?: string;
  callsign?: string;
  frequency_band?: string;
  tags?: string;
  search?: string;
  sort?: 'latest' | 'oldest';
}

export interface PhotoListResponse {
  photos: Photo[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePhotoMetadata {
  title: string;
  description?: string;
  category?: string;
  callsign?: string;
  frequency_band?: string;
  frequency_mhz?: number;
  mode?: string;
  equipment?: string;
  antenna_type?: string;
  power_watts?: number;
  qth_latitude?: number;
  qth_longitude?: number;
  qth_name?: string;
  photo_taken_at?: string;
  tags?: string[];
}

export interface UpdatePhotoRequest {
  title?: string;
  description?: string;
  category?: string;
  callsign?: string;
  frequency_band?: string;
  frequency_mhz?: number;
  mode?: string;
  equipment?: string;
  antenna_type?: string;
  power_watts?: number;
  qth_latitude?: number;
  qth_longitude?: number;
  qth_name?: string;
  photo_taken_at?: string;
  tags?: string[];
}
