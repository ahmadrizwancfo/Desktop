import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    data?: any;
    chart?: any;
    action?: any;
    timestamp: Date;
}

interface CfoChatStore {
    messages: ChatMessage[];
    isPending: boolean;
    suggestions: string[];
    proactiveSignals: any[];
    sendMessage: (query: string) => Promise<void>;
    fetchSuggestions: () => Promise<void>;
    fetchProactiveSignals: () => Promise<void>;
    convertToAction: (msgId: string, insight: string) => Promise<void>;
    clear: () => void;
}

export const useCfoChatStore = create<CfoChatStore>((set, get) => ({
    messages: [
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello Founder. I am your Conversational CFO. You can ask me about your runway, expenses, or simulate new hiring scenarios. How can I help today?',
            timestamp: new Date()
        }
    ],
    isPending: false,
    suggestions: [],
    proactiveSignals: [],
    sendMessage: async (query: string) => {
        const userMsg: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            role: 'user',
            content: query,
            timestamp: new Date()
        };

        set((state) => ({ messages: [...state.messages, userMsg], isPending: true }));

        try {
            const res = await apiClient.post('/cfo-chat/query', { query });
            const data = res.data;

            const assistantMsg: ChatMessage = {
                id: Math.random().toString(36).substring(7),
                role: 'assistant',
                content: data.insight,
                data: data.data,
                chart: data.chart,
                action: data.action,
                timestamp: new Date()
            };

            set((state) => ({ messages: [...state.messages, assistantMsg], isPending: false }));
        } catch (error) {
            set({ isPending: false });
        }
    },
    fetchSuggestions: async () => {
        const res = await apiClient.post('/cfo-chat/suggestions');
        set({ suggestions: res.data });
    },
    fetchProactiveSignals: async () => {
        const res = await apiClient.post('/cfo-chat/proactive-signals');
        set({ proactiveSignals: res.data });
    },
    convertToAction: async (msgId: string, insight: string) => {
        await apiClient.post('/cfo-chat/convert-to-action', { insight });
        // Optionally mark the message as converted
    },
    clear: () => set({ messages: [] })
}));
