import api from './api';

export interface ChatResponse {
  reply: string;
  sources: Array<{ ID?: string; TEXT_CHUNK?: string; SCORE?: number }>;
  session_id: string;
  graph_image?: string;
  chart_type?: string;
  insights?: string;
  intent?: string;
}

export const sendChatMessage = async (message: string, sessionId: string = 'default'): Promise<ChatResponse> => {
  const res = await api.post<ChatResponse>('/chat', { message, session_id: sessionId });
  if (res.data && res.data.graph_image && !res.data.graph_image.startsWith('data:')) {
    res.data.graph_image = `data:image/png;base64,${res.data.graph_image}`;
  }
  return res.data;
};
