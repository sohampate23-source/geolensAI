import React, { useEffect, useState } from 'react';
import { X, ExternalLink, ShieldCheck, Database, Layers, Cpu, Globe } from 'lucide-react';
import { fetchAttribution } from '../api';
import { AttributionSource } from '../types';

interface AttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttributionModal: React.FC<AttributionModalProps> = ({ isOpen, onClose }) => {
  const [sources, setSources] = useState<AttributionSource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchAttribution()
        .then((data) => setSources(data.sources))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121A33] border border-[#223055] rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#223055] flex items-center justify-between bg-[#10172E]">
          <div className="flex items-center gap-2 text-[#2DD4BF]">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold text-sm text-[#F4F7FB]">Data Provenance &amp; Licensing Attribution</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#9BA8C7] hover:text-[#F4F7FB] p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="bg-[#192342]/70 p-3 rounded-lg border border-[#223055] text-[#9BA8C7] space-y-1">
            <div className="font-semibold text-[#F4F7FB] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#2DD4BF]" />
              Study Area: Rio de Janeiro, Brazil (AOI_1_Rio)
            </div>
            <p className="leading-relaxed">
              GeoLens AI uses authoritative open datasets and foundation models. To uphold geospatial integrity, reference labels are strictly differentiated from AI predictions, and all calculations are projected into UTM Zone 23S (EPSG:32723).
            </p>
          </div>

          <div className="space-y-3">
            {sources.map((src, idx) => (
              <div
                key={idx}
                className="bg-[#192342] border border-[#223055] rounded-lg p-3.5 space-y-2 hover:border-[#2A3B66] transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[#F4F7FB]">{src.name}</h4>
                    <span className="text-[11px] text-[#2DD4BF] font-mono">{src.provider}</span>
                  </div>
                  {src.source_url && src.source_url !== 'Pending Verification' && (
                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#8B5CF6] hover:text-[#2DD4BF] flex items-center gap-1 transition"
                    >
                      Official Source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <p className="text-[11.5px] text-[#9BA8C7] leading-relaxed">
                  {src.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-[#223055]/70 text-[10.5px]">
                  <div>
                    <span className="text-[#9BA8C7]">Role: </span>
                    <strong className="text-[#F4F7FB]">{src.usage_role}</strong>
                  </div>
                  <div>
                    <span className="text-[#9BA8C7]">License: </span>
                    <strong className="text-[#2DD4BF]">{src.license}</strong>
                  </div>
                </div>

                <div className="bg-[#0B1020] p-2 rounded text-[10px] text-[#9BA8C7] font-mono">
                  Provenance Note: {src.provenance_statement}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#223055] bg-[#10172E] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs bg-[#2DD4BF] text-[#0B1020] font-semibold hover:bg-[#2DD4BF]/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
