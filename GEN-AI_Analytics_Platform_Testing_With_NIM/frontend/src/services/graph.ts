import api from './api';

export interface GraphResponse {
  status: string;
  prompt: string;
  image_base64: string;
  chart_type?: string;
  insights?: string;
  message: string;
}

export const generateCustomGraph = async (prompt: string): Promise<GraphResponse> => {
  const res = await api.post<GraphResponse>('/graph/generate', { prompt });
  // Ensure the image is always a valid data URI
  if (res.data?.image_base64 && !res.data.image_base64.startsWith('data:')) {
    res.data.image_base64 = `data:image/png;base64,${res.data.image_base64}`;
  }
  return res.data;
};
