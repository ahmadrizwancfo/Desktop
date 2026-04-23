'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
    value: number[];
    onValueChange: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
    disabled?: boolean;
}

export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, className, disabled }: SliderProps) {
    const pct = ((value[0] - min) / (max - min)) * 100;

    return (
        <div className={cn('relative w-full', className)}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[0]}
                disabled={disabled}
                onChange={(e) => onValueChange([parseFloat(e.target.value)])}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-800 accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-indigo-500
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-indigo-300
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-indigo-500/30
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-indigo-500
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-indigo-300
                    [&::-moz-range-thumb]:cursor-pointer"
                style={{
                    background: `linear-gradient(to right, rgb(99 102 241) 0%, rgb(99 102 241) ${pct}%, rgb(30 41 59) ${pct}%, rgb(30 41 59) 100%)`,
                }}
            />
        </div>
    );
}
