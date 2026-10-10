import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Send,
  Trash2,
  Code2,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  Compass,
  Mic,
  MicOff,
  AlertCircle,
  HelpCircle,
  MapPin
} from 'lucide-react';
import { QueryPlan, SpatialRelation, TargetType, ReferenceType } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  plan?: QueryPlan;
  matchCount?: number;
}

interface LeftPanelProps {
  messages: Message[];
  onSendMessage: (query: string, previousPlan?: QueryPlan | null) => void;
  onClearMessages: () => void;
  currentPlan: QueryPlan | null;
  onUpdatePlanAndRerun: (plan: QueryPlan) => void;
  isLoading: boolean;
  language: string;
  manualAoi?: [number, number, number, number] | null;
  manualPolygon?: [number, number][] | null;
  onClearAoi?: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  messages,
  onSendMessage,
  onClearMessages,
  currentPlan,
  onUpdatePlanAndRerun,
  isLoading,
  language,
  manualAoi,
  manualPolygon,
  onClearAoi,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [showJsonPlan, setShowJsonPlan] = useState(false);
  const [isEditingChips, setIsEditingChips] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Voice search not supported in this browser. Please use Chrome or Edge.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Match recognition language to selected language
      if (language === 'hi') {
        recognition.lang = 'hi-IN';
      } else if (language === 'mr') {
        recognition.lang = 'mr-IN';
      } else {
        recognition.lang = 'en-IN';
      }

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputQuery(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice error: ${event.error}`);
          setTimeout(() => setSpeechError(null), 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setSpeechError('Could not start microphone.');
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  // Editable chip state based on current plan
  const [editTarget, setEditTarget] = useState<TargetType>(currentPlan?.target || 'buildings');
  const [editRelation, setEditRelation] = useState<SpatialRelation>(currentPlan?.relation || 'within');
  const [editReference, setEditReference] = useState<ReferenceType>(currentPlan?.reference || 'major roads');
  const [editDistance, setEditDistance] = useState<number | ''>(currentPlan?.distance_m ?? 100);
  const [editMinArea, setEditMinArea] = useState<number | ''>(currentPlan?.min_area_m2 ?? '');
  const [editExclude, setEditExclude] = useState<string>(currentPlan?.exclude_zone || '');

  // Keep edit state updated when plan changes
  React.useEffect(() => {
    if (currentPlan) {
      setEditTarget(currentPlan.target);
      setEditRelation(currentPlan.relation);
      setEditReference(currentPlan.reference);
      setEditDistance(currentPlan.distance_m ?? '');
      setEditMinArea(currentPlan.min_area_m2 ?? '');
      setEditExclude(currentPlan.exclude_zone || '');
    }
  }, [currentPlan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    onSendMessage(inputQuery.trim(), currentPlan);
    setInputQuery('');
  };

  const handleChipClick = (queryText: string) => {
    if (isLoading) return;
    setInputQuery(queryText);
    onSendMessage(queryText, currentPlan);
  };

  const handleRerunModifiedPlan = () => {
    if (!currentPlan) return;
    const modified: QueryPlan = {
      ...currentPlan,
      target: editTarget,
      relation: editRelation,
      reference: editReference,
      distance_m: editDistance === '' ? null : Number(editDistance),
      min_area_m2: editMinArea === '' ? null : Number(editMinArea),
      exclude_zone: editExclude.trim() || null,
      planner_source: 'user_edited_chips',
    };
    onUpdatePlanAndRerun(modified);
    setIsEditingChips(false);
  };

  // Example prompts based on language
  const exampleChips = language === 'hi' ? [
    { label: 'सड़क से 100 मीटर के भीतर इमारतें', query: 'सड़क से 100 मीटर के भीतर इमारतें' },
    { label: 'कम से कम 500 वर्ग मीटर की इमारतें', query: 'कम से कम 500 वर्ग मीटर की इमारतें' },
    { label: 'बड़ी छत वाली इमारतें', query: 'बड़ी छत वाली इमारतें' },
    { label: 'सड़क से 50 मीटर से अधिक दूर इमारतें', query: 'सड़क से 50 मीटर से अधिक दूर इमारतें' },
  ] : language === 'mr' ? [
    { label: 'रस्त्यापासून 100 मीटरच्या अंतरावरील इमारती', query: 'रस्त्यापासून 100 मीटरच्या अंतरावरील इमारती' },
    { label: 'किमान 500 चौरस मीटरच्या इमारती', query: 'किमान 500 चौरस मीटरच्या इमारती' },
    { label: 'मोठ्या छताच्या इमारती', query: 'मोठ्या छताच्या इमारती' },
  ] : [
    { label: 'Buildings within 100m of roads', query: 'Find buildings within 100 metres of major roads' },
    { label: 'Large rooftops (>= 500 m²)', query: 'Locate buildings that are at least 500 square metres' },
    { label: 'Buildings far from roads (> 50m)', query: 'Show me all buildings that are more than 50 metres from a road' },
    { label: 'Exclude industrial zone', query: 'Show buildings near roads but exclude those inside the industrial zone' },
    { label: 'Large flat rooftops', query: 'Find buildings with large flat rooftops' },
    { label: 'Road network overview', query: 'Show primary and secondary roads' },
  ];

  return (
    <aside className="w-80 md:w-96 bg-[#121A33] border-r border-[#223055] flex flex-col h-full z-20 shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-[#223055] flex items-center justify-between bg-[#10172E]">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-[#2DD4BF]" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F7FB]">
              AI Spatial Assistant
            </h2>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearMessages}
            className="text-[11px] text-[#9BA8C7] hover:text-[#E0559A] flex items-center gap-1 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Manual Area / Polygon Active Banner */}
        {(manualAoi || manualPolygon) && (
          <div className="bg-[#2DD4BF]/15 border border-[#2DD4BF]/40 rounded-lg p-2.5 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 text-[#2DD4BF]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <div>
                <div className="font-bold text-[11px] text-[#F4F7FB]">
                  {manualPolygon ? `Manual Polygon Active (${manualPolygon.length} vertices)` : 'Manual Area Active'}
                </div>
                <div className="text-[10px] text-[#9BA8C7] font-mono">
                  {manualAoi
                    ? `[${manualAoi[0].toFixed(3)}, ${manualAoi[1].toFixed(3)}] to [${manualAoi[2].toFixed(3)}, ${manualAoi[3].toFixed(3)}]`
                    : 'Custom marked polygon'}
                </div>
              </div>
            </div>
            {onClearAoi && (
              <button
                onClick={onClearAoi}
                className="text-[10px] text-[#9BA8C7] hover:text-[#E0559A] bg-[#121A33] hover:bg-[#192342] px-2 py-0.5 rounded border border-[#223055] transition"
                title="Clear custom area selection"
              >
                Clear ✕
              </button>
            )}
          </div>
        )}

        {/* Welcome Brief if no messages */}
        {messages.length === 0 && (
          <div className="bg-[#192342]/70 border border-[#223055] rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#2DD4BF]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask &bull; Plan &bull; Review &bull; Result &bull; Validate</span>
            </div>
            <p className="text-[#9BA8C7] leading-relaxed text-[11.5px]">
              Describe your spatial question in natural language. GeoLens prepares an inspectable execution plan, checks planar validation criteria, and runs deterministic spatial operations.
            </p>
          </div>
        )}

        {/* Example Query Chips */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-[#9BA8C7] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-[#2DD4BF]" />
              <span>{manualAoi ? 'Suggested Queries for Selected Area' : 'Suggested Spatial Intent'}</span>
            </span>
            <span className="text-[9.5px] text-[#2DD4BF]">01 Ask</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {manualAoi && (
              <>
                <button
                  onClick={() => handleChipClick('Find all buildings in this selected area')}
                  disabled={isLoading}
                  className="text-[11px] bg-[#2DD4BF]/15 hover:bg-[#2DD4BF]/25 text-[#2DD4BF] border border-[#2DD4BF]/40 rounded-md px-2 py-1 text-left transition font-semibold"
                >
                  📍 All buildings in this area
                </button>
                <button
                  onClick={() => handleChipClick('Find buildings within 100 metres of major roads in this selected area')}
                  disabled={isLoading}
                  className="text-[11px] bg-[#2DD4BF]/15 hover:bg-[#2DD4BF]/25 text-[#2DD4BF] border border-[#2DD4BF]/40 rounded-md px-2 py-1 text-left transition font-semibold"
                >
                  📍 Buildings near roads in this area
                </button>
              </>
            )}
            {exampleChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(chip.query)}
                disabled={isLoading}
                className="text-[11px] bg-[#192342] hover:bg-[#223055] text-[#F4F7FB] border border-[#223055] hover:border-[#2DD4BF]/50 rounded-md px-2 py-1 text-left transition disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation History */}
        {messages.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-medium text-[#9BA8C7]">Session Workflow History</div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                  msg.sender === 'user'
                    ? 'bg-[#192342] border-[#2A3B66] text-[#F4F7FB]'
                    : 'bg-[#0E152A] border-[#223055] text-[#9BA8C7]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#9BA8C7]">
                  <span className="font-semibold uppercase tracking-wider text-[#2DD4BF]">
                    {msg.sender === 'user' ? 'Intent (User)' : 'Spatial Engine'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="text-xs text-[#F4F7FB] font-medium">{msg.text}</div>
                {msg.matchCount !== undefined && (
                  <div className="text-[11px] text-[#2DD4BF] flex items-center gap-1 font-mono">
                    ✓ {msg.matchCount} candidate polygons analyzed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Execution Plan & Review Card (Step 02 & 03) */}
        {currentPlan && (
          <div className="bg-[#0B1020] border border-[#223055] rounded-xl p-3 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#223055]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B5CF6]">
                <Filter className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>02 Plan &amp; 03 Review</span>
              </div>
              <button
                onClick={() => setIsEditingChips(!isEditingChips)}
                className="text-[11px] text-[#2DD4BF] hover:underline font-medium"
              >
                {isEditingChips ? 'Cancel' : 'Adjust Plan'}
              </button>
            </div>

            {/* Analysis Scope Preview */}
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              <div className="bg-[#121A33] p-1.5 rounded border border-[#223055]">
                <span className="text-[#9BA8C7] block text-[9.5px] uppercase font-semibold">Inputs</span>
                <span className="text-[#F4F7FB] font-medium truncate block">SpaceNet Footprints</span>
              </div>
              <div className="bg-[#121A33] p-1.5 rounded border border-[#223055]">
                <span className="text-[#9BA8C7] block text-[9.5px] uppercase font-semibold">Method</span>
                <span className="text-[#2DD4BF] font-medium truncate block">
                  {currentPlan.relation} {currentPlan.distance_m ? `${currentPlan.distance_m}m` : ''}
                </span>
              </div>
              <div className="bg-[#121A33] p-1.5 rounded border border-[#223055]">
                <span className="text-[#9BA8C7] block text-[9.5px] uppercase font-semibold">Validation</span>
                <span className="text-[#10B981] font-medium block">±0.5m GSD Planar</span>
              </div>
              <div className="bg-[#121A33] p-1.5 rounded border border-[#223055]">
                <span className="text-[#9BA8C7] block text-[9.5px] uppercase font-semibold">Output</span>
                <span className="text-[#8B5CF6] font-medium block">Bifurcated Vectors</span>
              </div>
            </div>

            {!isEditingChips ? (
              /* Display Chips */
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] bg-[#192342] text-[#F4F7FB] px-2 py-0.5 rounded border border-[#2A3B66]">
                  Target: <strong className="text-[#2DD4BF]">{currentPlan.target}</strong>
                </span>

                {currentPlan.relation !== 'none' && (
                  <span className="text-[11px] bg-[#192342] text-[#F4F7FB] px-2 py-0.5 rounded border border-[#2A3B66]">
                    Relation: <strong className="text-[#8B5CF6]">{currentPlan.relation}</strong>
                  </span>
                )}

                {currentPlan.reference !== 'none' && (
                  <span className="text-[11px] bg-[#192342] text-[#F4F7FB] px-2 py-0.5 rounded border border-[#2A3B66]">
                    Ref: <strong className="text-[#F4F7FB]">{currentPlan.reference}</strong>
                  </span>
                )}

                {currentPlan.distance_m !== null && (
                  <span className="text-[11px] bg-[#192342] text-[#F4F7FB] px-2 py-0.5 rounded border border-[#2A3B66]">
                    Distance: <strong className="text-[#2DD4BF]">{currentPlan.distance_m} m</strong>
                  </span>
                )}

                {currentPlan.min_area_m2 !== null && (
                  <span className="text-[11px] bg-[#192342] text-[#F4F7FB] px-2 py-0.5 rounded border border-[#2A3B66]">
                    Min Area: <strong className="text-[#2DD4BF]">{currentPlan.min_area_m2} m²</strong>
                  </span>
                )}

                {currentPlan.exclude_zone && (
                  <span className="text-[11px] bg-[#192342] text-[#E0559A] px-2 py-0.5 rounded border border-[#E0559A]/40">
                    Exclude: <strong>{currentPlan.exclude_zone}</strong>
                  </span>
                )}

                {currentPlan.rooftop_type && (
                  <span className="text-[11px] bg-[#192342] text-[#F4F7FB] px-2 py-0.5 rounded border border-[#2A3B66]">
                    Rooftop: <strong>{currentPlan.rooftop_type}</strong>
                  </span>
                )}
              </div>
            ) : (
              /* Inline Chip Editors */
              <div className="space-y-2 pt-1 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9BA8C7] block mb-0.5">Target</label>
                    <select
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value as TargetType)}
                      className="w-full bg-[#192342] border border-[#223055] rounded px-2 py-1 text-xs text-[#F4F7FB]"
                    >
                      <option value="buildings">buildings</option>
                      <option value="roads">roads</option>
                      <option value="rooftops">rooftops</option>
                      <option value="clusters">clusters</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9BA8C7] block mb-0.5">Relation</label>
                    <select
                      value={editRelation}
                      onChange={(e) => setEditRelation(e.target.value as SpatialRelation)}
                      className="w-full bg-[#192342] border border-[#223055] rounded px-2 py-1 text-xs text-[#F4F7FB]"
                    >
                      <option value="within">within</option>
                      <option value="beyond">beyond</option>
                      <option value="intersects">intersects</option>
                      <option value="none">none</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9BA8C7] block mb-0.5">Reference Layer</label>
                    <select
                      value={editReference}
                      onChange={(e) => setEditReference(e.target.value as ReferenceType)}
                      className="w-full bg-[#192342] border border-[#223055] rounded px-2 py-1 text-xs text-[#F4F7FB]"
                    >
                      <option value="major roads">major roads</option>
                      <option value="roads">roads</option>
                      <option value="industrial zone">industrial zone</option>
                      <option value="none">none</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9BA8C7] block mb-0.5">Distance (m)</label>
                    <input
                      type="number"
                      value={editDistance}
                      onChange={(e) => setEditDistance(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 100"
                      className="w-full bg-[#192342] border border-[#223055] rounded px-2 py-1 text-xs text-[#F4F7FB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9BA8C7] block mb-0.5">Min Area (m²)</label>
                    <input
                      type="number"
                      value={editMinArea}
                      onChange={(e) => setEditMinArea(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full bg-[#192342] border border-[#223055] rounded px-2 py-1 text-xs text-[#F4F7FB]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9BA8C7] block mb-0.5">Exclude Zone</label>
                    <input
                      type="text"
                      value={editExclude}
                      onChange={(e) => setEditExclude(e.target.value)}
                      placeholder="e.g. industrial"
                      className="w-full bg-[#192342] border border-[#223055] rounded px-2 py-1 text-xs text-[#F4F7FB]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRerunModifiedPlan}
                  disabled={isLoading}
                  className="w-full mt-2 bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 text-[#0B1020] font-semibold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition text-xs shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Approve &amp; Execute Analysis
                </button>
              </div>
            )}

            {/* Technical JSON Plan Collapsible */}
            <div className="pt-1 border-t border-[#223055]">
              <button
                onClick={() => setShowJsonPlan(!showJsonPlan)}
                className="w-full flex items-center justify-between text-[11px] text-[#9BA8C7] hover:text-[#F4F7FB]"
              >
                <span className="flex items-center gap-1">
                  <Code2 className="w-3 h-3 text-[#2DD4BF]" />
                  Technical JSON Plan
                </span>
                {showJsonPlan ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {showJsonPlan && (
                <pre className="mt-1.5 p-2 bg-[#090D1A] rounded text-[10.5px] font-mono text-[#2DD4BF] overflow-x-auto max-h-40 border border-[#223055]">
                  {JSON.stringify(currentPlan, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-[#223055] bg-[#10172E]">
        {/* Voice Listening Banner */}
        {isListening && (
          <div className="mb-2 bg-[#E0559A]/20 border border-[#E0559A] text-[#F4F7FB] px-2.5 py-1 rounded text-[11px] flex items-center justify-between animate-pulse">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E0559A] animate-ping" />
              <span>
                {language === 'hi'
                  ? 'सुन रहा हूँ... बोलिए (हिंदी)'
                  : language === 'mr'
                  ? 'ऐकत आहे... बोला (मराठी)'
                  : 'Listening... Speak your spatial query'}
              </span>
            </span>
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className="text-[10px] text-[#9BA8C7] hover:text-white underline"
            >
              Stop
            </button>
          </div>
        )}

        {/* Speech Error Notice */}
        {speechError && (
          <div className="mb-2 bg-[#E0559A]/20 border border-[#E0559A]/60 text-[#F4F7FB] px-2.5 py-1 rounded text-[10px] flex items-center justify-between">
            <span>{speechError}</span>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="text-[#9BA8C7] hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            placeholder={
              isListening
                ? (language === 'hi' ? 'बोलिए...' : language === 'mr' ? 'बोला...' : 'Listening to speech...')
                : language === 'hi'
                ? 'भौगोलिक प्रश्न पूछें (उदा. सड़क के पास इमारतें)...'
                : language === 'mr'
                ? 'भौगोलिक प्रश्न विचारा (उदा. रस्त्यांजवळील इमारती)...'
                : 'Search satellite imagery (e.g. buildings near roads)...'
            }
            className="w-full bg-[#192342] border border-[#2A3B66] rounded-lg pl-3 pr-20 py-2.5 text-xs text-[#F4F7FB] placeholder-[#9BA8C7]/60 focus:outline-none focus:border-[#2DD4BF] transition disabled:opacity-50"
          />

          {/* Microphone Speech-to-Text Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            disabled={isLoading}
            className={`absolute right-9 top-1.5 bottom-1.5 px-2 rounded-md flex items-center justify-center transition ${
              isListening
                ? 'bg-[#E0559A] text-white shadow-lg shadow-[#E0559A]/40 animate-pulse'
                : 'bg-[#121A33] hover:bg-[#223055] text-[#2DD4BF] border border-[#2A3B66]'
            }`}
            title={
              isListening
                ? 'Stop Voice Input'
                : language === 'hi'
                ? 'ध्वनि इनपुट (हिंदी)'
                : language === 'mr'
                ? 'आवाज इनपुट (मराठी)'
                : 'Voice Search (Speech to Text)'
            }
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-2 bg-[#2DD4BF] text-[#0B1020] rounded-md hover:bg-[#2DD4BF]/90 flex items-center justify-center disabled:opacity-40 transition"
            title="Submit Query"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#9BA8C7]">
          <span>LLM plans query &bull; GIS Engine executes</span>
          <span className="text-[#2DD4BF]">UTM Zone 23S</span>
        </div>
      </div>
    </aside>
  );
};
