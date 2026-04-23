'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
    targetDate: string;
    onEnd?: () => void;
    className?: string;
}

export function CountdownTimer({ targetDate, onEnd, className }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(targetDate).getTime() - new Date().getTime();
            
            if (difference <= 0) {
                setTimeLeft('Executing...');
                if (onEnd) onEnd();
                return;
            }

            const h = Math.floor(difference / (1000 * 60 * 60));
            const m = Math.floor((difference / 1000 / 60) % 60);
            const s = Math.floor((difference / 1000) % 60);

            let res = '';
            if (h > 0) res += `${h}h `;
            res += `${m}m ${s}s`;
            setTimeLeft(res);
        };

        const timer = setInterval(calculateTimeLeft, 1000);
        calculateTimeLeft();

        return () => clearInterval(timer);
    }, [targetDate, onEnd]);

    return (
        <div className={className}>
            <span className="flex items-center gap-1.5 font-black">
                <Clock className="w-3 h-3 animate-pulse" />
                {timeLeft}
            </span>
        </div>
    );
}
