'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { HeroSection } from '@/components/landing/hero-section';
import { SocialProof } from '@/components/landing/social-proof';
import { FeatureShowcase } from '@/components/landing/feature-showcase';
import { ProblemSolution } from '@/components/landing/problem-solution';
import { Testimonials } from '@/components/landing/testimonials';
import { PricingTable } from '@/components/landing/pricing-table';
import { FAQAccordion } from '@/components/landing/faq-accordion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-primary/30 selection:text-primary font-sans">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-6 sm:px-10 max-w-7xl mx-auto bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter">FounderCFO</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/login" className="px-5 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-white">Sign In</Link>
          <Link href="/register" className="px-5 py-2 rounded-full bg-primary font-bold text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Get Started</Link>
        </div>
      </nav>

      <main className="relative">
        <HeroSection />
        <SocialProof />
        <FeatureShowcase />
        <ProblemSolution />
        <Testimonials />
        <PricingTable />
        <FAQAccordion />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 sm:px-10 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary w-5 h-5" />
            <span className="font-bold text-lg">FounderCFO</span>
          </div>
          <div className="text-slate-500 text-sm">
            © 2026 FounderCFO Inc. Made with ❤️ for Indian Founders.
          </div>
          <div className="flex gap-6 text-slate-400 text-sm">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
