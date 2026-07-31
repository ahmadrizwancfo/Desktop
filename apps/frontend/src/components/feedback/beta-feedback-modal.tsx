'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function BetaFeedbackModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState<'THUMBS_UP' | 'THUMBS_DOWN'>('THUMBS_UP');
    const [feedbackText, setFeedbackText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!feedbackText.trim()) return;
        setSubmitting(true);

        try {
            await apiClient.post('/ai/feedback', {
                rating,
                feedbackText,
                promptText: 'Beta In-Product Feedback Modal',
                responseText: 'User submitted beta feedback during testing session.',
                metadata: { path: typeof window !== 'undefined' ? window.location.pathname : '' },
            });

            setSubmitted(true);
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
                setFeedbackText('');
            }, 2000);
        } catch (e) {
            console.error('Failed to submit beta feedback:', e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-40 print:hidden">
            {/* Floating Trigger */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-full shadow-2xl backdrop-blur-md transition"
                >
                    <span>💬</span> Private Beta Feedback
                </button>
            )}

            {/* Modal */}
            {isOpen && (
                <div className="w-80 md:w-96 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl backdrop-blur-xl transition">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">💬</span>
                            <div>
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Private Beta Feedback</h3>
                                <p className="text-[10px] text-slate-400">Help Us Polish FounderCFO V1</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-xs text-slate-400 hover:text-white">✕</button>
                    </div>

                    {submitted ? (
                        <div className="py-8 text-center text-emerald-400 space-y-1">
                            <span className="text-2xl block">🎉</span>
                            <p className="text-xs font-bold">Thank you for your feedback!</p>
                            <p className="text-[10px] text-slate-400">Our engineering team has received your submission.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="text-[10px] font-semibold text-slate-400 uppercase">How was your experience?</label>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <button
                                        onClick={() => setRating('THUMBS_UP')}
                                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 ${
                                            rating === 'THUMBS_UP' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
                                        }`}
                                    >
                                        👍 Helpful
                                    </button>
                                    <button
                                        onClick={() => setRating('THUMBS_DOWN')}
                                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 ${
                                            rating === 'THUMBS_DOWN' ? 'bg-rose-600/20 text-rose-400 border-rose-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
                                        }`}
                                    >
                                        👎 Confusing / Bug
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-semibold text-slate-400 uppercase">What confused you or felt missing?</label>
                                <textarea
                                    rows={3}
                                    placeholder="Share your thoughts or report an issue..."
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !feedbackText.trim()}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                            >
                                {submitting ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
