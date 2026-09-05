import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Brain, Zap, Heart, Truck, CheckCircle2 } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#1A1F26] font-sans">
      {/* Header Navigation */}
      <header className="px-6 py-4 border-b border-[#E2E2DC] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FAF9F6] border border-[#E2E2DC] p-0.5 shadow-flat flex items-center justify-center">
              <img src="/logo.png" alt="BloodChain AI Crest" className="w-full h-full object-contain rounded-md" />
            </div>
            <span className="text-lg font-bold text-[#1A1F26]">
              BloodChain <span className="text-[#C85A3F]">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/command-center"
              className="px-4 py-2 rounded-lg bg-[#C85A3F] text-[#FFFFFF] font-semibold text-xs hover:bg-[#B24930] transition-colors shadow-flat flex items-center gap-2"
            >
              Open Command Center
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-6 border-b border-[#E2E2DC]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF6F0] border border-[#F1D6C5] text-xs font-semibold text-[#C85A3F] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#C85A3F]" />
            Intelligent Regional Blood Orchestration
          </span>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1A1F26] leading-tight">
            Eliminating Preventable Shortages & Expiration Wastage Across Healthcare Networks
          </h1>

          <p className="mt-4 text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed">
            BloodChain AI combines XGBoost time-series forecasting, Google OR-Tools multi-source optimization, and continuous cold-chain IoT tracking into a unified command platform.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/command-center"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#C85A3F] text-[#FFFFFF] font-bold text-sm hover:bg-[#B24930] transition-colors shadow-flat flex items-center justify-center gap-2"
            >
              Launch Regional Command Center
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/facilities"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#FFFFFF] border border-[#E2E2DC] text-[#1A1F26] font-semibold text-sm hover:bg-[#F4F4F0] transition-colors"
            >
              Explore Facility Network
            </Link>
          </div>
        </div>
      </section>

      {/* Key Architectural Pillars */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-[#1A1F26]">Core Architectural Engines</h2>
          <p className="text-xs text-[#64748B] mt-1">Ground-truth mathematical solvers & ML pipelines</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-6 shadow-flat">
            <div className="w-10 h-10 rounded-lg bg-[#E3EFEA] border border-[#5B8C7A]/20 flex items-center justify-center text-[#5B8C7A] mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1A1F26]">XGBoost Forecast Engine</h3>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Trains on multi-year demand sequences with day-of-week, seasonal, and surge lags to output daily demand predictions with 90% confidence bounds.
            </p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-6 shadow-flat">
            <div className="w-10 h-10 rounded-lg bg-[#FAF0D6] border border-[#D99B38]/20 flex items-center justify-center text-[#D99B38] mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1A1F26]">OR-Tools Allocator</h3>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Solves linear optimization models in under 15ms to select optimal blood source facilities while respecting ABO compatibility and safe-share buffers.
            </p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-6 shadow-flat">
            <div className="w-10 h-10 rounded-lg bg-[#FDF6F0] border border-[#C85A3F]/20 flex items-center justify-center text-[#C85A3F] mb-4">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1A1F26]">Cold Logistics Telemetry</h3>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Monitors IoT container temperature data in real time, detecting 2°C–8°C thermal excursions before blood products reach critical destination points.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
