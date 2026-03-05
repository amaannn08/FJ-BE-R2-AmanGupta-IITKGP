import { apiPost } from './client';

export const analyzeTransactions = () => {
  return apiPost('/analysis');
};
