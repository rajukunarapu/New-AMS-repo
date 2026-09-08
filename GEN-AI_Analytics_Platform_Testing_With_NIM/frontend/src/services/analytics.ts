import api from './api';

export interface AnalyticsResponse {
  query: string;
  generated_sql: string;
  results: Array<Record<string, any>>;
  summary_insights: string;
  recommended_chart: string;
}

export const queryAnalytics = async (query: string): Promise<AnalyticsResponse> => {
  const res = await api.post<AnalyticsResponse>('/analytics', { query });
  return res.data;
};
