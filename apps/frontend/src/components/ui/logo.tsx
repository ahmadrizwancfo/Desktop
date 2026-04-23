import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
    /** Size variant */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Additional className */
    className?: string;
    /** Show only the icon mark (F) instead of full wordmark */
    iconOnly?: boolean;
}

const sizeMap = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
};

const iconSizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg',
};

/**
 * FounderCFO Logo
 * "Founder" in white, "CFO" in brand purple (#A78BFA)
 * Matches the official brand wordmark.
 */
export function Logo({ size = 'md', className, iconOnly = false }: LogoProps) {
    if (iconOnly) {
        return (
            <div className={cn(
                'bg-[#A78BFA] rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-[#A78BFA]/20',
                iconSizeMap[size],
                className
            )}>
                F
            </div>
        );
    }

    return (
        <span className={cn(
            'font-black tracking-tighter select-none',
            sizeMap[size],
            className
        )}>
            <span className="text-white">Founder</span>
            <span className="text-[#A78BFA]">CFO</span>
        </span>
    );
}

/**
 * Icon-only logo mark — a purple square with "F" in white
 */
export function LogoMark({ size = 'md', className }: Omit<LogoProps, 'iconOnly'>) {
    return (
        <div className={cn(
            'bg-[#A78BFA] rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-[#A78BFA]/20',
            iconSizeMap[size],
            className
        )}>
            F
        </div>
    );
}
