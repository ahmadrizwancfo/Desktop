'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    showDots?: boolean;
}

export function Sparkline({ data, color = '#6366f1', height = 24, showDots = false }: SparklineProps) {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const width = 80;
    const padding = 2;
    const innerHeight = height - padding * 2;
    const innerWidth = width - padding * 2;
    const stepX = innerWidth / (data.length - 1);

    const points = data.map((value, index) => {
        const x = padding + index * stepX;
        const y = height - padding - ((value - min) / range) * innerHeight;
        return { x, y, value };
    });

    const pathD = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;

        // Smooth curve
        const prev = points[index - 1];
        const cp1x = prev.x + stepX / 3;
        const cp1y = prev.y;
        const cp2x = point.x - stepX / 3;
        const cp2y = point.y;

        return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    }, '');

    // Area fill path
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    const isPositive = data[data.length - 1] >= data[0];
    const lineColor = color || (isPositive ? '#10b981' : '#ef4444');
    const fillColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Area fill */}
            <motion.path
                d={areaD}
                fill={`url(#gradient-${color})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Line */}
            <motion.path
                d={pathD}
                fill="none"
                stroke={lineColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* End dot */}
            {showDots && (
                <motion.circle
                    cx={points[points.length - 1].x}
                    cy={points[points.length - 1].y}
                    r={3}
                    fill={lineColor}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.2 }}
                />
            )}
        </svg>
    );
}
