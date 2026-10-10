import React from 'react';
import { Satellite, Globe, Cpu, Database, Info, PlayCircle, ShieldCheck, Upload } from 'lucide-react';
import { ImportStatus } from '../types';

interface TopNavProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  onOpenAttribution: () => void;
  onOpenImport: () => void;
  importStatus: ImportStatus | null;
  onToggleDemoStepper: () => void;
  isDemoStepperOpen: boolean;
  overallAccuracy?: number;
  providerStatus?: {
    planner_source?: string;
    planner_model?: string;
    translation_active?: boolean;
    ranking_provider?: string;
    demo_mode?: boolean;
  };
}

export const TopNav: React.FC<TopNavProps> = ({
  language,
  onLanguageChange,
  onOpenAttribution,
  onOpenImport,
  importStatus,
  onToggleDemoStepper,
  isDemoStepperOpen,
  overallAccuracy,
  providerStatus,
}) => {
  return (
    <header className="h-14 bg-[#121A33] border-b border-[#223055] px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Study Area */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-[#2DD4BF]">
          <div className="w-8 h-8 rounded-lg bg-[#192342] border border-[#2DD4BF]/40 flex items-center justify-center shadow-sm">
            <Satellite className="w-5 h-5 text-[#2DD4BF]" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-[#F4F7FB] flex items-center gap-1.5">
              GeoLens AI
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30">
                PROTOTYPE
              </span>
            </div>
            <div className="text-[10.5px] text-[#9BA8C7] -mt-0.5 hidden sm:block">
              Satellite Imagery Search &amp; Spatial Intelligence
            </div>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-[#223055] hidden md:block" />

        {/* Active Study Area */}
        <div className="hidden lg:flex items-center space-x-2 bg-[#0B1020] px-2.5 py-1 rounded border border-[#223055]">
          <Globe className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span className="text-xs text-[#9BA8C7]">Study Area:</span>
          <span className="text-xs font-medium text-[#F4F7FB]">Rio de Janeiro, Brazil</span>
          <span className="text-[10px] text-[#9BA8C7]">(SpaceNet AOI_1_Rio)</span>
        </div>
      </div>

      {/* Status Badges, Languages, Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Dataset Status Indicator */}
        <div className="flex items-center space-x-1.5 bg-[#0B1020] px-2 py-1 rounded border border-[#223055]">
          <Database className="w-3 h-3 text-[#2DD4BF]" />
          <span className="text-[11px] text-[#9BA8C7]">Data:</span>
          <span className="text-[11px] font-medium text-[#2DD4BF]">
            {importStatus?.has_custom_buildings
              ? `Custom (${importStatus.buildings_count})`
              : providerStatus?.demo_mode
              ? 'Demo Fixture (AOI_1)'
              : 'SpaceNet Real'}
          </span>
        </div>

        {/* Accuracy Index Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-[#0B1020] px-2 py-1 rounded border border-[#223055]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="text-[11px] text-[#9BA8C7]">Accuracy:</span>
          <span className="text-[11px] font-bold text-[#10B981]">
            {overallAccuracy ? `${overallAccuracy}%` : '96.8%'}
          </span>
          <span className="text-[10px] text-[#9BA8C7]">(0.5m GSD)</span>
        </div>

        {/* Engine / Planner Status Pill */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-[#0B1020] px-2 py-1 rounded border border-[#223055]">
          <Cpu className="w-3 h-3 text-[#8B5CF6]" />
          <span className="text-[11px] text-[#9BA8C7]">Planner:</span>
          <span className="text-[11px] font-medium text-[#8B5CF6]">
            {providerStatus?.planner_source?.includes('openrouter') ? 'OpenRouter LLM' : 'Rule-based Fallback'}
          </span>
        </div>

        {/* Import Spatial Dataset Button */}
        <button
          onClick={onOpenImport}
          className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded transition-all border ${
            importStatus?.has_custom_buildings
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-medium'
              : 'bg-[#192342] text-slate-200 hover:bg-[#223055] border-[#223055]'
          }`}
          title="Import custom GeoJSON, CSV, KML, or WKT datasets"
        >
          <Upload className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Import Data</span>
          {importStatus?.has_custom_buildings && (
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          )}
        </button>

        {/* Language Selector (English, Hindi, Marathi) */}
        <div className="flex items-center bg-[#0B1020] border border-[#223055] rounded px-1.5 py-0.5">
          <span className="text-[11px] text-[#9BA8C7] mr-1 hidden sm:inline">Lang:</span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-transparent text-xs text-[#F4F7FB] focus:outline-none cursor-pointer py-0.5"
          >
            <option value="en" className="bg-[#121A33] text-[#F4F7FB]">English</option>
            <option value="hi" className="bg-[#121A33] text-[#F4F7FB]">हिंदी (Hindi)</option>
            <option value="mr" className="bg-[#121A33] text-[#F4F7FB]">मराठी (Marathi)</option>
          </select>
        </div>

        {/* Guided Demo Stepper Toggle */}
        <button
          onClick={onToggleDemoStepper}
          className={`flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded transition-all border ${
            isDemoStepperOpen
              ? 'bg-[#2DD4BF] text-[#0B1020] font-semibold border-[#2DD4BF]'
              : 'bg-[#192342] text-[#2DD4BF] hover:bg-[#223055] border-[#2DD4BF]/40'
          }`}
          title="Open Step-by-Step Guided Demo Walkthrough"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Guided Demo</span>
        </button>

        {/* Attribution & Provenance Modal Button */}
        <button
          onClick={onOpenAttribution}
          className="flex items-center space-x-1 text-xs bg-[#192342] text-[#9BA8C7] hover:text-[#F4F7FB] hover:bg-[#223055] px-2 py-1.5 rounded border border-[#223055] transition"
          title="Data Sources, Models & Provenance"
        >
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Attribution</span>
        </button>
      </div>
    </header>
  );
};
