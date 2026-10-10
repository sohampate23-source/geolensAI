import React, { useState } from 'react';
import {
  PlayCircle,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Compass,
  FileCode,
  MapPin,
  Award,
  Download,
  Sparkles
} from 'lucide-react';

interface DemoStepperProps {
  isOpen: boolean;
  onClose: () => void;
  onRunScenario: (query: string) => void;
}

export const DemoStepper: React.FC<DemoStepperProps> = ({
  isOpen,
  onClose,
  onRunScenario,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  const scenarios = [
    {
      title: 'Proximity Query',
      query: 'Find buildings within 100 metres of major roads',
      description: 'Tests metric buffer distance in projected UTM Zone 23S around Rio roadways.',
    },
    {
      title: 'Area Threshold Query',
      query: 'Locate buildings that are at least 500 square metres',
      description: 'Filters polygons by calculated planar area (m²) and ranks by size.',
    },
    {
      title: 'Complex Exclusion Query',
      query: 'Show buildings near roads but exclude those inside the industrial zone',
      description: 'Applies dwithin relation and negates candidates intersecting restricted zoning polygons.',
    },
  ];

  const steps = [
    {
      number: 1,
      title: 'Ask Geographic Question',
      icon: Compass,
      desc: 'Users type queries in natural language or Indic languages. The system parses spatial concepts without hallucinating geometry.',
    },
    {
      number: 2,
      title: 'Review Structured Plan',
      icon: FileCode,
      desc: 'The query is translated into a deterministic Pydantic schema with target entities, spatial relations, and thresholds.',
    },
    {
      number: 3,
      title: 'Inspect Map Results',
      icon: MapPin,
      desc: 'GeoPandas & Shapely execute spatial joins, buffers, and exclusions in UTM Zone 23S. Results render in WGS84 on Leaflet.',
    },
    {
      number: 4,
      title: 'Evidence & Ranking',
      icon: Award,
      desc: 'Local weighted scorer ranks candidates for human review. Satellite footprint evidence stamps link polygons to tiles.',
    },
    {
      number: 5,
      title: 'Export GeoJSON & CSV',
      icon: Download,
      desc: 'Export the actual executed geometries and metrics for downstream GIS workflows in QGIS or ArcGIS.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121A33] border border-[#223055] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#223055] flex items-center justify-between bg-[#10172E]">
          <div className="flex items-center gap-2 text-[#2DD4BF]">
            <PlayCircle className="w-5 h-5" />
            <h3 className="font-bold text-sm text-[#F4F7FB]">Guided Product Demonstration</h3>
            <span className="text-[10px] bg-[#2DD4BF]/20 text-[#2DD4BF] px-2 py-0.5 rounded font-mono uppercase">
              5-Step Flow
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#9BA8C7] hover:text-[#F4F7FB] p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between">
            {steps.map((s) => {
              const Icon = s.icon;
              const isPassed = currentStep > s.number;
              const isCurrent = currentStep === s.number;
              return (
                <div key={s.number} className="flex flex-col items-center">
                  <div
                    onClick={() => setCurrentStep(s.number)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition ${
                      isCurrent
                        ? 'bg-[#2DD4BF] text-[#0B1020] ring-4 ring-[#2DD4BF]/20'
                        : isPassed
                        ? 'bg-[#192342] text-[#2DD4BF] border border-[#2DD4BF]'
                        : 'bg-[#192342] text-[#9BA8C7] border border-[#223055]'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : s.number}
                  </div>
                  <span className="text-[10px] text-[#9BA8C7] mt-1 hidden sm:block">Step {s.number}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-4">
          {(() => {
            const activeStepInfo = steps[currentStep - 1];
            const StepIcon = activeStepInfo.icon;
            return (
              <div className="bg-[#192342]/70 border border-[#223055] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F7FB]">
                  <StepIcon className="w-4 h-4 text-[#2DD4BF]" />
                  <span>Step {activeStepInfo.number}: {activeStepInfo.title}</span>
                </div>
                <p className="text-xs text-[#9BA8C7] leading-relaxed">
                  {activeStepInfo.desc}
                </p>
              </div>
            );
          })()}

          {/* Quick Pre-Built Scenarios */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#F4F7FB] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Launch a Preset Demo Scenario</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {scenarios.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onRunScenario(sc.query);
                    onClose();
                  }}
                  className="bg-[#192342] hover:bg-[#223055] border border-[#223055] hover:border-[#2DD4BF]/50 rounded-lg p-2.5 text-left transition space-y-1 text-xs group"
                >
                  <div className="font-semibold text-[#F4F7FB] group-hover:text-[#2DD4BF] transition flex items-center justify-between">
                    <span>{sc.title}</span>
                    <ArrowRight className="w-3 h-3 text-[#9BA8C7] group-hover:translate-x-0.5 transition" />
                  </div>
                  <div className="text-[10.5px] text-[#9BA8C7] line-clamp-2">
                    "{sc.query}"
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-[#223055] bg-[#10172E] flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-3 py-1.5 rounded text-xs text-[#9BA8C7] hover:text-[#F4F7FB] border border-[#223055] disabled:opacity-40 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="text-xs text-[#9BA8C7]">
            Step {currentStep} of {steps.length}
          </div>

          {currentStep < steps.length ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(steps.length, prev + 1))}
              className="px-3 py-1.5 rounded text-xs bg-[#2DD4BF] text-[#0B1020] font-semibold flex items-center gap-1 hover:bg-[#2DD4BF]/90"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs bg-[#2DD4BF] text-[#0B1020] font-semibold hover:bg-[#2DD4BF]/90"
            >
              Start Exploring
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
