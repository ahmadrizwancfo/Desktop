'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = Date.now().toString();
        const toast = { id, message, type, duration };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
    const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
    const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);
    const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
        warning: AlertTriangle,
    };

    const styles = {
        success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        error: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        info: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
        warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    };

    return (
        <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
                <AnimatePresence>
                    {toasts.map(toast => {
                        const Icon = icons[toast.type];
                        return (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl ${styles[toast.type]}`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="text-sm font-medium text-white">{toast.message}</span>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
