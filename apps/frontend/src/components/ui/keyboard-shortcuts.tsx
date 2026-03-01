'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Command, X } from 'lucide-react';

interface Shortcut {
    key: string;
    description: string;
    action: () => void;
}

export function KeyboardShortcuts() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const shortcuts: Shortcut[] = [
        { key: 'g d', description: 'Go to Dashboard', action: () => router.push('/dashboard') },
        { key: 'g s', description: 'Go to Simulator', action: () => router.push('/simulator') },
        { key: 'g a', description: 'Go to AI CFO', action: () => router.push('/ai-cfo') },
        { key: 'g i', description: 'Go to Invoices', action: () => router.push('/invoices') },
        { key: 'g e', description: 'Go to Expenses', action: () => router.push('/expenses') },
        { key: 'g c', description: 'Go to Compliance', action: () => router.push('/compliance') },
        { key: '?', description: 'Show shortcuts', action: () => setIsOpen(true) },
        { key: 'Esc', description: 'Close dialogs', action: () => setIsOpen(false) },
    ];

    useEffect(() => {
        let buffer = '';
        let timeout: NodeJS.Timeout;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Show help with ?
            if (e.key === '?') {
                e.preventDefault();
                setIsOpen(true);
                return;
            }

            // Close with Escape
            if (e.key === 'Escape') {
                setIsOpen(false);
                return;
            }

            // Build key buffer for multi-key shortcuts
            clearTimeout(timeout);
            buffer += e.key.toLowerCase();

            timeout = setTimeout(() => {
                buffer = '';
            }, 500);

            // Check for matching shortcuts
            const shortcut = shortcuts.find(s => {
                const keys = s.key.toLowerCase().replace(/ /g, '');
                return buffer.endsWith(keys);
            });

            if (shortcut) {
                e.preventDefault();
                buffer = '';
                setIsOpen(false);
                shortcut.action();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router]);

    return (
        <>
            {/* Floating shortcut hint */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-3 rounded-2xl glass-card border border-white/10 hover:border-primary/30 transition-all group z-40"
                title="Keyboard shortcuts (?)"
            >
                <Command className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
            </button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                        >
                            <div className="glass-card rounded-3xl p-8 border border-white/10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                            <Command className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                                            <p className="text-xs text-slate-500">Navigate like a pro</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {shortcuts.map((shortcut, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                                        >
                                            <span className="text-sm text-white">{shortcut.description}</span>
                                            <kbd className="px-2 py-1 rounded bg-white/10 text-xs font-mono text-slate-400">
                                                {shortcut.key}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-6 text-[10px] text-slate-500 text-center">
                                    Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-primary">?</kbd> anytime to show this menu
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
