import React, { useEffect, useState } from 'react';
import { TopNav } from './components/TopNav';
import { LeftPanel } from './components/LeftPanel';
import { MapView } from './components/MapView';
import { RightPanel } from './components/RightPanel';
import { BottomStatus } from './components/BottomStatus';
import { DemoStepper } from './components/DemoStepper';
import { AttributionModal } from './components/AttributionModal';
import { ImportModal } from './components/ImportModal';

import {
  ChatResponse,
  BaseLayers,
  QueryPlan,
  ImportResult,
  ImportStatus
} from './types';
import {
  fetchHealth,
  fetchBaseLayers,
  executeChatQuery,
  fetchImportStatus
} from './api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  plan?: QueryPlan;
  matchCount?: number;
}

export function App() {
  const [language, setLanguage] = useState('en');
  const [baseLayers, setBaseLayers] = useState<BaseLayers | null>(null);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [healthData, setHealthData] = useState<any | null>(null);

  // Manually selected Area of Interest (AOI): [minLon, minLat, maxLon, maxLat] and custom marked polygon
  const [manualAoi, setManualAoi] = useState<[number, number, number, number] | null>(null);
  const [manualPolygon, setManualPolygon] = useState<[number, number][] | null>(null);

  // Modals & Overlays
  const [isDemoStepperOpen, setIsDemoStepperOpen] = useState(false);
  const [isAttributionOpen, setIsAttributionOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    // 1. Fetch Health
    fetchHealth()
      .then((data) => setHealthData(data))
      .catch((err) => console.error('Health fetch error:', err));

    // 2. Fetch Import Status
    fetchImportStatus()
      .then((status) => setImportStatus(status))
      .catch((err) => console.error('Import status error:', err));

    // 3. Fetch Base Layers (Roads, Footprints, Exclusion Zones)
    fetchBaseLayers()
      .then((layers) => {
        setBaseLayers(layers);
        // 4. Run default showcase query so the map opens immediately with rich results!
        handleRunQuery('Find buildings within 100 metres of major roads', null);
      })
      .catch((err) => {
        console.error('Base layers load error:', err);
        setErrorToast('Could not load base geographic layers. Is backend running?');
      });
  }, []);

  const handleRunQuery = async (
    query: string,
    previousPlan?: QueryPlan | null,
    weights?: Record<string, number>,
    aoiOverride?: [number, number, number, number] | null,
    polygonOverride?: [number, number][] | null
  ) => {
    setIsLoading(true);
    setErrorToast(null);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: query,
      timestamp: timeStr,
    };
    setMessages((prev) => [...prev, userMsg]);

    const effectiveAoi = aoiOverride !== undefined ? aoiOverride : manualAoi;
    const effectivePolygon = polygonOverride !== undefined ? polygonOverride : manualPolygon;

    try {
      const response = await executeChatQuery(query, previousPlan, language, weights, effectiveAoi, effectivePolygon);
      setChatResponse(response);

      // Append assistant response
      const assistantMsg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'assistant',
        text: `Identified ${response.statistics.total_matches} candidates using ${response.query_plan.planner_source} plan${effectiveAoi ? ' within manual area' : ''}.`,
        timestamp: timeStr,
        plan: response.query_plan,
        matchCount: response.statistics.total_matches,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If we got matches, auto-select first one or keep previous
      if (response.ranking && response.ranking.length > 0) {
        setSelectedFeatureId(response.ranking[0].feature_id);
      } else {
        setSelectedFeatureId(null);
      }
    } catch (err: any) {
      console.error('Query execution error:', err);
      setErrorToast(err.message || 'Error executing query on geospatial engine');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePlanAndRerun = (modifiedPlan: QueryPlan) => {
    const queryRepr = modifiedPlan.original_query || 'Filtered query';
    handleRunQuery(queryRepr, modifiedPlan);
  };

  const handleUpdateWeightsAndRerun = (weights: Record<string, number>) => {
    if (!chatResponse) return;
    handleRunQuery(
      chatResponse.original_query,
      chatResponse.query_plan,
      weights
    );
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  const handleImportSuccess = (result: ImportResult) => {
    fetchBaseLayers().then(setBaseLayers).catch(console.error);
    fetchImportStatus().then(setImportStatus).catch(console.error);
    setManualAoi(null);
    setManualPolygon(null);
    handleRunQuery('Find buildings', null);
  };

  const handleResetSuccess = () => {
    fetchBaseLayers().then(setBaseLayers).catch(console.error);
    fetchImportStatus().then(setImportStatus).catch(console.error);
    setManualAoi(null);
    setManualPolygon(null);
    handleRunQuery('Find buildings within 100 metres of major roads', null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B1020] text-[#F4F7FB] overflow-hidden">
      {/* 1. Top Navigation Bar */}
      <TopNav
        language={language}
        onLanguageChange={setLanguage}
        onOpenAttribution={() => setIsAttributionOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        importStatus={importStatus}
        onToggleDemoStepper={() => setIsDemoStepperOpen(!isDemoStepperOpen)}
        isDemoStepperOpen={isDemoStepperOpen}
        overallAccuracy={chatResponse?.statistics?.overall_accuracy_pct}
        providerStatus={chatResponse?.provider_status}
      />

      {/* Error Toast if any */}
      {errorToast && (
        <div className="bg-[#E0559A]/20 border-b border-[#E0559A] text-[#F4F7FB] px-4 py-1.5 text-xs flex items-center justify-between z-30">
          <span>⚠️ {errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace: 3-column layout (Left Panel, Center Map, Right Panel) */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* 2. Left Panel: Natural-Language GeoSearch */}
        <LeftPanel
          messages={messages}
          onSendMessage={(q, plan) => handleRunQuery(q, plan)}
          onClearMessages={handleClearMessages}
          currentPlan={chatResponse?.query_plan || null}
          onUpdatePlanAndRerun={handleUpdatePlanAndRerun}
          isLoading={isLoading}
          language={language}
          manualAoi={manualAoi}
          manualPolygon={manualPolygon}
          onClearAoi={() => {
            setManualAoi(null);
            setManualPolygon(null);
          }}
        />

        {/* 3. Central Map: The Main Feature with Polygon Bifurcation, Manual Area Selection & Accuracy */}
        <MapView
          baseLayers={baseLayers}
          resultGeoJson={chatResponse?.geojson || null}
          bufferGeoJson={chatResponse?.buffer_geojson || null}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={setSelectedFeatureId}
          categoryBifurcation={chatResponse?.statistics?.category_bifurcation}
          overallAccuracy={chatResponse?.statistics?.overall_accuracy_pct}
          manualAoi={manualAoi}
          manualPolygon={manualPolygon}
          onSelectAoi={(bbox, polyCoords) => {
            setManualAoi(bbox);
            setManualPolygon(polyCoords || null);
          }}
          onClearAoi={() => {
            setManualAoi(null);
            setManualPolygon(null);
          }}
          onQueryAoi={(aoi, polyCoords) =>
            handleRunQuery('Find buildings in selected area', null, undefined, aoi, polyCoords)
          }
        />

        {/* 4. Right Panel: Analysis Workspace (Results, Ranking, Evidence, Export) */}
        <RightPanel
          chatResponse={chatResponse}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={setSelectedFeatureId}
          onUpdateWeightsAndRerun={handleUpdateWeightsAndRerun}
        />
      </div>

      {/* 5. Collapsible Bottom Status Area */}
      <BottomStatus executionReport={chatResponse?.execution_report || null} />

      {/* Guided Demo Stepper Modal */}
      <DemoStepper
        isOpen={isDemoStepperOpen}
        onClose={() => setIsDemoStepperOpen(false)}
        onRunScenario={(query) => handleRunQuery(query, null)}
      />

      {/* Attribution & Provenance Modal */}
      <AttributionModal
        isOpen={isAttributionOpen}
        onClose={() => setIsAttributionOpen(false)}
      />

      {/* Import Datasets Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        importStatus={importStatus}
        onImportSuccess={handleImportSuccess}
        onResetSuccess={handleResetSuccess}
      />
    </div>
  );
}

export default App;
