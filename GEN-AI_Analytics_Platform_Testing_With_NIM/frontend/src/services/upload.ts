import api from './api';

export interface UploadResponse {
  status: string;
  filename: string;
  rows_processed: number;
  embeddings_generated: number;
  message: string;
}

export const uploadDatasetFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};
