'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, FileText, CheckCircle2, Loader2, AlertCircle, Image, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
    onSuccess?: (data: any) => void;
    className?: string;
}

export function FileUpload({ onSuccess, className }: FileUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiClient.post('/statements/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setProgress(percentCompleted);
                },
            });

            setResult(response.data);

            // Trigger dashboard refresh
            if (onSuccess) {
                onSuccess(response.data);
            }

            setFile(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
            setProgress(0);
        }
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp'].includes(ext || '')) {
            return <Image className="w-5 h-5 text-violet-400" />;
        }
        if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
            return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
        }
        return <FileText className="w-5 h-5 text-primary" />;
    };

    return (
        <div className={cn("space-y-4", className)}>
            {!file && !result && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative cursor-pointer"
                >
                    <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/30 transition-all rounded-3xl" />
                    <div className="relative glass-card rounded-3xl p-8 border-dashed border-2 border-white/10 group-hover:border-primary/50 transition-all flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <h4 className="text-lg font-bold text-white">Upload Financial Data</h4>
                        <p className="text-sm text-slate-400 mt-2 max-w-[280px]">
                            Balance Sheet, P&L, Bank Statement, or any financial document
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4 justify-center">
                            <span className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-white/5 rounded-full">PDF</span>
                            <span className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-white/5 rounded-full">Excel</span>
                            <span className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-white/5 rounded-full">CSV</span>
                            <span className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-white/5 rounded-full">Scanned Images</span>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".csv,.xlsx,.xls,.pdf,.xml,.jpg,.jpeg,.png,.gif,.webp,.tiff,.tif,.bmp"
                        />
                    </div>
                </div>
            )}

            {file && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-3xl p-6 border-primary/30"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                {getFileIcon(file.name)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white truncate max-w-[150px]">{file.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB • Ready
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setFile(null)} className="p-1 hover:bg-white/5 rounded-full text-slate-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {isUploading ? (
                        <div className="space-y-2">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">
                                {progress < 100 ? `Uploading... ${progress}%` : 'Analyzing with AI...'}
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={handleUpload}
                            className="w-full py-3 bg-primary hover:bg-indigo-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                            Start Analysis
                        </button>
                    )}
                </motion.div>
            )}

            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                >
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-rose-500 font-medium">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setError('');
                            setResult({
                                success: true,
                                metrics: { documentType: 'Bank Statement' },
                                confidence: 'high',
                                extractedFields: ['Opening Balance', 'Closing Balance', 'Total Credits', 'Total Debits', 'Net Cash Flow'],
                                aiAnalysis: 'This is a demo analysis. Your bank statement shows healthy cash flow with ₹12.4L in total credits and ₹8.2L in debits. Net positive cash flow of ₹4.2L indicates strong operational performance.',
                                warnings: []
                            });
                        }}
                        className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                        Try Sample Data Instead
                    </button>
                </motion.div>
            )}

            {result && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-3xl p-6 border-emerald-500/30 bg-emerald-500/5"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">Analysis Complete</h4>
                            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest">
                                {result.metrics?.documentType || 'Document'} • {result.confidence || 'High'} Confidence
                            </p>
                        </div>
                    </div>

                    {result.extractedFields && result.extractedFields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {result.extractedFields.slice(0, 6).map((field: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 text-[9px] font-bold text-slate-400 bg-white/5 rounded-full">
                                    {field}
                                </span>
                            ))}
                            {result.extractedFields.length > 6 && (
                                <span className="px-2 py-0.5 text-[9px] font-bold text-primary bg-primary/10 rounded-full">
                                    +{result.extractedFields.length - 6} more
                                </span>
                            )}
                        </div>
                    )}

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4">
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                            "{result.aiAnalysis}"
                        </p>
                    </div>

                    {result.warnings && result.warnings.length > 0 && !result.warnings[0].includes("GEMINI_API_KEY") && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                            <p className="text-[10px] font-bold text-amber-500 mb-1">NOTES</p>
                            <p className="text-xs text-amber-400/80">{result.warnings.join('. ')}</p>
                        </div>
                    )}

                    <button
                        onClick={() => setResult(null)}
                        className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Upload Another File
                    </button>
                </motion.div>
            )}
        </div>
    );
}

