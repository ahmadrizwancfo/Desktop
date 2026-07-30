'use client';

import React, { useState, useEffect } from 'react';
import { FounderActionItem } from './action-card';

interface ActionModalProps {
    action: FounderActionItem | null;
    onClose: () => void;
    onSaveAndApprove: (id: string, updatedTitle: string, updatedPayload: any) => void;
}

export function ActionModal({ action, onClose, onSaveAndApprove }: ActionModalProps) {
    const [title, setTitle] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    useEffect(() => {
        if (action) {
            setTitle(action.title);
            setRecipientEmail(action.payload?.recipientEmail || action.payload?.vendorEmail || '');
            setSubject(action.payload?.subject || '');
            setBody(action.payload?.body || '');
        }
    }, [action]);

    if (!action) return null;

    const handleSave = () => {
        const updatedPayload = {
            ...action.payload,
            recipientEmail,
            subject,
            body,
        };
        onSaveAndApprove(action.id, title, updatedPayload);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white">Edit AI Prepared Work Draft</h3>
                    <button onClick={onClose} className="text-xs text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Action Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Recipient Email</label>
                        <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Body Content</label>
                        <textarea
                            rows={4}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                    <button onClick={onClose} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-lg">
                        Save & Approve Action
                    </button>
                </div>
            </div>
        </div>
    );
}
