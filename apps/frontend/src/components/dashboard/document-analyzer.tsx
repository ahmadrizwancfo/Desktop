'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileText,
    Image,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
    FileSpreadsheet,
    Receipt,
    Building2,
    DollarSign,
    Calendar,
    Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisResult {
    success: boolean;
    documentType: string;
    summary: string;
    extractedData: {
        totalAmount?: number;
        taxAmount?: number;
        gstNumbers?: string[];
        panNumbers?: string[];
        invoiceNumbers?: string[];
        accountNumbers?: string[];
        vendorName?: string;
        dates?: { value: string; context: string }[];
        amounts?: { value: number; currency: string; context: string }[];
        rawTransactions?: { date: string; description: string; amount: number; type: 'CREDIT' | 'DEBIT' }[];
    };
    aiInsights: string;
    confidence: number;
    suggestedActions: string[];
    processingTimeMs: number;
}

interface DocumentAnalyzerProps {
    onTransactionsExtracted?: (transactions: any[]) => void;
    onInvoiceExtracted?: (invoice: any) => void;
}

export function DocumentAnalyzer({ onTransactionsExtracted, onInvoiceExtracted }: DocumentAnalyzerProps) {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const analyzeMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post('/ocr/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data as AnalysisResult;
        },
        onSuccess: (data) => {
            setResult(data);
            setError(null);

            // Callback with extracted data
            if (data.extractedData.rawTransactions && data.extractedData.rawTransactions.length > 0) {
                onTransactionsExtracted?.(data.extractedData.rawTransactions);
            }
            if (data.documentType === 'INVOICE') {
                onInvoiceExtracted?.(data.extractedData);
            }
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to analyze document');
            setResult(null);
        },
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            analyzeMutation.mutate(acceptedFiles[0]);
        }
    }, [analyzeMutation]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif', '.bmp'],
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
        maxSize: 20 * 1024 * 1024, // 20MB to handle larger Excel files
    });


    const resetAnalysis = () => {
        setResult(null);
        setError(null);
    };

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    return (
        <div className="glass-card rounded-3xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl">
                        <FileSpreadsheet className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Document Analyzer</h3>
                        <p className="text-xs text-slate-500">AI + OCR powered extraction</p>
                    </div>
                </div>
                {result && (
                    <button
                        onClick={resetAnalysis}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {!result && !analyzeMutation.isPending && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {/* Dropzone */}
                        <div
                            {...getRootProps()}
                            className={cn(
                                "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                                isDragActive
                                    ? "border-primary bg-primary/10"
                                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                            )}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-4">
                                <div className={cn(
                                    "p-4 rounded-2xl transition-all",
                                    isDragActive ? "bg-primary/20" : "bg-white/5"
                                )}>
                                    <Upload className={cn(
                                        "w-8 h-8",
                                        isDragActive ? "text-primary" : "text-slate-500"
                                    )} />
                                </div>
                                <div>
                                    <p className="text-white font-medium">
                                        {isDragActive ? 'Drop your document here' : 'Drag & drop a document'}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        or click to browse • PDF, Images up to 10MB
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Supported Documents */}
                        <div className="flex flex-wrap gap-2 mt-4 justify-center">
                            {[
                                { icon: FileSpreadsheet, label: 'Balance Sheet' },
                                { icon: FileSpreadsheet, label: 'P&L' },
                                { icon: Receipt, label: 'Invoices' },
                                { icon: Building2, label: 'Bank Statements' },
                                { icon: FileText, label: 'GST Returns' },
                                { icon: Image, label: 'Scanned Docs' },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-xs text-slate-400">
                                    <Icon className="w-3 h-3" />
                                    {label}
                                </div>
                            ))}
                        </div>


                        {/* Error */}
                        {error && (
                            <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-400" />
                                <span className="text-sm text-rose-400">{error}</span>
                            </div>
                        )}
                    </motion.div>
                )}

                {analyzeMutation.isPending && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12"
                    >
                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                        <p className="text-white font-medium">Analyzing document...</p>
                        <p className="text-sm text-slate-500 mt-1">OCR + AI extraction in progress</p>
                    </motion.div>
                )}

                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        {/* Success Header */}
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-emerald-400">
                                    {result.documentType} detected
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {result.confidence}% confidence • {result.processingTimeMs}ms
                                </p>
                            </div>
                        </div>

                        {/* Extracted Values Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {result.extractedData.totalAmount && (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                                        <DollarSign className="w-3 h-3" /> Total Amount
                                    </div>
                                    <p className="text-lg font-bold text-white">
                                        {formatCurrency(result.extractedData.totalAmount)}
                                    </p>
                                </div>
                            )}
                            {result.extractedData.taxAmount && (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                                        <Receipt className="w-3 h-3" /> Tax/GST
                                    </div>
                                    <p className="text-lg font-bold text-amber-400">
                                        {formatCurrency(result.extractedData.taxAmount)}
                                    </p>
                                </div>
                            )}
                            {result.extractedData.vendorName && (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 col-span-2">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                                        <Building2 className="w-3 h-3" /> Vendor
                                    </div>
                                    <p className="text-sm font-medium text-white">
                                        {result.extractedData.vendorName}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Identifiers */}
                        <div className="flex flex-wrap gap-2">
                            {result.extractedData.gstNumbers?.map((gst, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-xs text-blue-400 border border-blue-500/20">
                                    <Hash className="w-3 h-3" /> GST: {gst}
                                </div>
                            ))}
                            {result.extractedData.panNumbers?.map((pan, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 text-xs text-purple-400 border border-purple-500/20">
                                    <Hash className="w-3 h-3" /> PAN: {pan}
                                </div>
                            ))}
                            {result.extractedData.invoiceNumbers?.map((inv, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-xs text-emerald-400 border border-emerald-500/20">
                                    <FileText className="w-3 h-3" /> Invoice: {inv}
                                </div>
                            ))}
                        </div>

                        {/* Transactions */}
                        {result.extractedData.rawTransactions && result.extractedData.rawTransactions.length > 0 && (
                            <div className="rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                    <span className="text-sm font-medium text-white">
                                        Extracted Transactions
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {result.extractedData.rawTransactions.length} found
                                    </span>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                    {result.extractedData.rawTransactions.slice(0, 10).map((tx, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-slate-500">{tx.date}</p>
                                                <p className="text-sm text-white truncate">{tx.description}</p>
                                            </div>
                                            <span className={cn(
                                                "text-sm font-medium",
                                                tx.type === 'CREDIT' ? "text-emerald-400" : "text-rose-400"
                                            )}>
                                                {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Insights */}
                        {result.aiInsights && (
                            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                                <p className="text-xs font-bold text-primary mb-2">AI INSIGHTS</p>
                                <p className="text-sm text-slate-300">{result.aiInsights}</p>
                            </div>
                        )}

                        {/* Suggested Actions */}
                        {result.suggestedActions && result.suggestedActions.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-500">SUGGESTED ACTIONS</p>
                                {result.suggestedActions.map((action, i) => (
                                    <button
                                        key={i}
                                        className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white transition-colors flex items-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
