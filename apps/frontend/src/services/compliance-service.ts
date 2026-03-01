import { apiClient } from '../lib/api-client';

export const complianceService = {
    getStatus: async () => {
        const response = await apiClient.get('/compliance/status');
        return response.data;
    }
};
