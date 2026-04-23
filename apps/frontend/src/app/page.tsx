'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { HeroSection } from '@/components/landing/hero-section';
import { DashboardPreview } from '@/components/landing/dashboard-preview';
import { HowItWorks } from '@/components/landing/how-it-works';
import { BackgroundSystem } from '@/components/landing/background-system';
import { FeatureShowcase } from '@/components/landing/feature-showcase';
import { ProblemSolution } from '@/components/landing/problem-solution';
import { PricingTable } from '@/components/landing/pricing-table';
import { FAQAccordion } from '@/components/landing/faq-accordion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-primary/30 selection:text-primary font-sans">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-6 sm:px-10 max-w-7xl mx-auto bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/login" className="px-5 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-white">Sign In</Link>
          <Link href="/register" className="px-5 py-2 rounded-full bg-primary font-bold text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Get Started</Link>
        </div>
      </nav>

      <BackgroundSystem>
        <main className="relative flex flex-col items-center">
          <div className="w-full">
            <HeroSection />
          </div>
          
          <div className="w-full py-16 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <DashboardPreview />
          </div>

          <div className="w-full py-16 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <HowItWorks />
          </div>

          <div className="w-full py-16 relative bg-[#060b1e]/30">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <ProblemSolution />
          </div>

          <div className="w-full py-16 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent" />
            <FeatureShowcase />
          </div>

          <div className="w-full py-16 relative bg-[#0f172a]/50">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <PricingTable />
          </div>

          <div className="w-full py-16 mb-20">
            <FAQAccordion />
          </div>
        </main>
      </BackgroundSystem>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 sm:px-10 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>
          <div className="text-slate-500 text-sm">
            © 2026 FounderCFO Inc. Made with ❤️ for Indian Founders.
          </div>
          <div className="flex gap-6 text-slate-400 text-sm">
            <span className="opacity-50 cursor-not-allowed" title="Coming soon">Privacy</span>
            <span className="opacity-50 cursor-not-allowed" title="Coming soon">Terms</span>
            <span className="opacity-50 cursor-not-allowed" title="Coming soon">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
