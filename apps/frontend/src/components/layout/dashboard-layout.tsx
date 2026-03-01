'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { KeyboardShortcuts } from '../ui/keyboard-shortcuts';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar - Desktop */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 ml-64 flex flex-col">
                <Header />
                <div className="p-8 pb-16 overflow-y-auto h-[calc(100vh-64px)]">
                    {children}
                </div>
            </main>

            {/* Keyboard Shortcuts */}
            <KeyboardShortcuts />

            {/* Dynamic Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[100px] rounded-full" />
            </div>
        </div>
    );
}
