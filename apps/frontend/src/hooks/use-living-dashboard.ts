import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCfoStateStore } from '@/store/cfo-state-store';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

/**
 * Living Dashboard Hook: Establishes a real-time Server-Sent Events (SSE) connection.
 * Includes automatic reconnection (<2s limit), token auth via query parameter, and connection status tracking.
 */
export function useLivingDashboard(organizationId?: string) {
    const queryClient = useQueryClient();
    const applyLiveStateSnapshot = useCfoStateStore((s) => s.applyLiveStateSnapshot);
    const setSseStatus = useCfoStateStore((s) => s.setSseStatus);
    const setSseLastUpdated = useCfoStateStore((s) => s.setSseLastUpdated);

    useEffect(() => {
        if (!organizationId) return;

        const token = useAuthStore.getState().token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const sseUrl = `${apiUrl}/api/sse/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

        let eventSource: EventSource | null = null;
        let isUnmounted = false;
        let reconnectTimer: NodeJS.Timeout | null = null;

        const connectSSE = () => {
            if (isUnmounted) return;

            setSseStatus('reconnecting');
            eventSource = new EventSource(sseUrl, { withCredentials: true });

            eventSource.onopen = () => {
                if (!isUnmounted) {
                    setSseStatus('connected');
                    setSseLastUpdated(new Date());
                }
            };

            eventSource.onmessage = (event) => {
                try {
                    setSseLastUpdated(new Date());
                    const { type, payload } = JSON.parse(event.data);

                    // Handle 5-second heartbeats quietly
                    if (type === 'HEARTBEAT') {
                        setSseStatus('connected');
                        return;
                    }

                    switch (type) {
                        case 'LIVE_STATE_UPDATE':
                            // V17 Single Authoritative Unified Live State Snapshot (< 50ms)
                            applyLiveStateSnapshot(payload);
                            if (payload.processingMessage) {
                                toast.info(payload.processingMessage, { duration: 3000 });
                            }
                            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
                            break;

                        default:
                            break;
                    }
                } catch (err) {
                    console.error('SSE Message Parsing Error:', err);
                }
            };

            // Auto-Reconnect Strategy (<2s Reconnect Limit: 1500ms)
            eventSource.onerror = () => {
                if (!isUnmounted) {
                    setSseStatus('reconnecting');
                }
                if (eventSource) {
                    eventSource.close();
                }
                if (!isUnmounted) {
                    reconnectTimer = setTimeout(() => {
                        connectSSE();
                    }, 1500);
                }
            };
        };

        connectSSE();

        return () => {
            isUnmounted = true;
            setSseStatus('disconnected');
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (eventSource) eventSource.close();
        };
    }, [organizationId, queryClient, applyLiveStateSnapshot, setSseStatus, setSseLastUpdated]);
}
