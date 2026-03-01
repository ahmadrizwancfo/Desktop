import { apiClient } from '@/lib/api-client';

// Mock Data for Demo Purposes
const MOCK_DASHBOARD_DATA = {
    hasData: true,
    totalRevenue: 1240500,
    monthlyBurn: 240000,
    cashRunway: "7.2 Months",
    profitMargin: "-8.5%",
    period: "Mar 2026",
    message: null
};

export const financialService = {
    getStats: async (organizationId: string) => {
        try {
            const res = await apiClient.get(`/financial-metrics/${organizationId}/dashboard`);
            return res.data;
        } catch (error) {
            console.warn("Backend unavailable:", error);
            // Return empty state to show upload prompt
            return {
                hasData: false,
                message: 'Unable to connect to server. Please check your connection.'
            };
        }
    },

    getLatest: async (organizationId: string) => {
        try {
            const res = await apiClient.get(`/financial-metrics/${organizationId}/latest`);
            return res.data;
        } catch (e) {
            return null;
        }
    },

    getHistory: async (organizationId: string) => {
        try {
            const res = await apiClient.get(`/financial-metrics/${organizationId}/history`);
            return res.data;
        } catch (e) {
            return [];
        }
    },
};
