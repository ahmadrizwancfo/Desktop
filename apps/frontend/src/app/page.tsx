'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { HeroSection } from '@/components/landing/hero-section';
import { ProblemSolution } from '@/components/landing/problem-solution';
import { FeatureShowcase } from '@/components/landing/feature-showcase';
import { HowItWorks } from '@/components/landing/how-it-works';
import { PricingTable } from '@/components/landing/pricing-table';
import { FAQAccordion } from '@/components/landing/faq-accordion';
import { BackgroundSystem } from '@/components/landing/background-system';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white selection:bg-white/20 selection:text-white font-sans antialiased">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-6 sm:px-10 max-w-6xl mx-auto bg-[#070b14]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-xs font-mono text-slate-400">
          <Link href="#laws" className="hover:text-white transition-colors">The 3 Laws</Link>
          <Link href="#decision-lab" className="hover:text-white transition-colors">Decision Lab</Link>
          <Link href="#trust" className="hover:text-white transition-colors">Trust & Security</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Insurance Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-xs font-mono text-slate-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="px-4 py-2 rounded-xl bg-white text-[#070b14] font-semibold text-xs hover:bg-slate-100 active:scale-95 transition-all shadow-md"
          >
            Verify Your Runway
          </Link>
        </div>
      </nav>

      <BackgroundSystem>
        <main className="relative flex flex-col items-center">
          {/* Stage 1: Recognition & Morning Brief Proof */}
          <div className="w-full">
            <HeroSection />
          </div>

          {/* Stage 2: The 3 Unforgiving Laws of Startup Cash */}
          <div id="laws" className="w-full">
            <ProblemSolution />
          </div>

          {/* Stage 3: The Decision Lab (Judgment in Action) */}
          <div className="w-full">
            <FeatureShowcase />
          </div>

          {/* Stage 4: Quiet Trust & Bank Statement Provenance */}
          <div className="w-full">
            <HowItWorks />
          </div>

          {/* Stage 5: Decision Insurance & Conviction FAQs */}
          <div className="w-full">
            <PricingTable />
          </div>

          <div className="w-full mb-16">
            <FAQAccordion />
          </div>
        </main>
      </BackgroundSystem>

      {/* Dignified Executive Footer */}
      <footer className="border-t border-white/5 py-12 px-6 sm:px-10 bg-[#070b14]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-xs font-mono text-slate-500">
              The Financial Operating Partner for Founders
            </span>
          </div>

          <div className="text-xs font-mono text-slate-500">
            Read-only verification • Zero password storage • AES-256 encrypted
          </div>

          <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Verify Runway</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
