import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  MapPin,
  Layers,
  ArrowRight
} from 'lucide-react';
import { importSpatialData, uploadSpatialFile, loadSampleDataset, resetImportedData } from '../api';
import { ImportResult, ImportStatus } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importStatus: ImportStatus | null;
  onImportSuccess: (result: ImportResult) => void;
  onResetSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  importStatus,
  onImportSuccess,
  onResetSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [layerType, setLayerType] = useState<'buildings' | 'roads'>('buildings');
  const [pasteFormat, setPasteFormat] = useState<'geojson' | 'csv' | 'wkt' | 'kml'>('geojson');
  const [pasteContent, setPasteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await uploadSpatialFile(selectedFile, layerType);
      setSuccessInfo(`Loaded ${res.feature_count} features from ${selectedFile.name}`);
      onImportSuccess(res);
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) {
      setErrorMessage('Please paste spatial data content');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await importSpatialData(pasteFormat, pasteContent, `pasted_${pasteFormat}.${pasteFormat}`, layerType);
      setSuccessInfo(`Loaded ${res.feature_count} features from pasted ${pasteFormat.toUpperCase()}`);
      onImportSuccess(res);
      setPasteContent('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSample = async (sampleId: string, title: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await loadSampleDataset(sampleId);
      setSuccessInfo(`Loaded preset: ${title} (${res.feature_count} features)`);
      onImportSuccess(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sample load failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await resetImportedData();
      setSuccessInfo('Restored standard SpaceNet AOI_1_Rio baseline fixtures');
      onResetSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Reset failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Import Spatial Datasets
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  GeoJSON / CSV / KML / WKT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Supply your own vector layers or spreadsheets to query custom building footprints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Active Layer:</span>
            {importStatus?.has_custom_buildings ? (
              <span className="font-mono text-teal-400 flex items-center gap-1.5 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-800/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Custom: {importStatus.custom_buildings_source} ({importStatus.buildings_count} features)
              </span>
            ) : (
              <span className="font-mono text-slate-300 flex items-center gap-1.5 bg-slate-800/50 px-2 py-0.5 rounded">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                SpaceNet AOI_1_Rio Fixtures ({importStatus?.buildings_count ?? 18} features)
              </span>
            )}
          </div>
          {importStatus?.has_custom_buildings && (
            <button
              onClick={handleReset}
              disabled={isSubmitting}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to baseline
            </button>
          )}
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mx-6 mt-3 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successInfo && (
          <div className="mx-6 mt-3 px-3 py-2 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center gap-2 text-xs text-teal-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            File Upload
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Paste Raw Content
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Preset Samples
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Target Layer Selector */}
          <div className="flex items-center justify-between text-xs pb-1">
            <span className="text-slate-300 font-medium">Target Layer to Populate:</span>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setLayerType('buildings')}
                className={`px-3 py-1 rounded text-xs transition-all ${
                  layerType === 'buildings'
                    ? 'bg-teal-500/20 text-teal-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Building Footprints
              </button>
              <button
                type="button"
                onClick={() => setLayerType('roads')}
                className={`px-3 py-1 rounded text-xs transition-all ${
                  layerType === 'roads'
                    ? 'bg-teal-500/20 text-teal-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Road Centerlines
              </button>
            </div>
          </div>

          {/* TAB 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-teal-400 bg-teal-500/10'
                    : 'border-slate-750 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".geojson,.json,.csv,.kml,.wkt,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-slate-800/80 text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop a spatial file'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: GeoJSON (.geojson, .json), CSV Spreadsheet (.csv), KML (.kml), WKT (.wkt)
                </p>
                {selectedFile && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {(selectedFile.size / 1024).toFixed(1)} KB ready
                  </div>
                )}
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5 text-slate-400">
                <p className="text-slate-300 font-medium">Format Guidelines:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong className="text-slate-200">CSV</strong>: Requires <code className="text-teal-300">latitude</code> & <code className="text-teal-300">longitude</code> columns OR a <code className="text-teal-300">geometry</code> (WKT) column. Optional: <code className="text-teal-300">area_m2</code>, <code className="text-teal-300">building_type</code>.</li>
                  <li><strong className="text-slate-200">GeoJSON</strong>: FeatureCollection with Polygon or Point geometries in WGS84 coordinates.</li>
                  <li><strong className="text-slate-200">KML</strong>: Standard Keyhole Markup vector files with coordinate boundaries.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={!selectedFile || isSubmitting}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2 shadow-lg shadow-teal-500/20"
                >
                  {isSubmitting ? 'Processing Dataset...' : 'Import & Load Dataset'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Paste Raw Data */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-medium">Input Format:</label>
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  {(['geojson', 'csv', 'wkt', 'kml'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setPasteFormat(fmt)}
                      className={`px-2.5 py-1 rounded text-xs uppercase tracking-wider transition-all ${
                        pasteFormat === fmt
                          ? 'bg-teal-500/20 text-teal-300 font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder={
                  pasteFormat === 'csv'
                    ? "id,name,latitude,longitude,building_type,area_m2\nbldg_001,Office Hub,-22.9120,-43.2300,commercial,650"
                    : pasteFormat === 'geojson'
                    ? '{\n  "type": "FeatureCollection",\n  "features": [...]\n}'
                    : "POLYGON((-43.231 -22.911, -43.230 -22.911, -43.230 -22.910, -43.231 -22.911))"
                }
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500 placeholder-slate-600 resize-none"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  disabled={!pasteContent.trim() || isSubmitting}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2 shadow-lg shadow-teal-500/20"
                >
                  {isSubmitting ? 'Parsing Content...' : 'Parse & Load Layer'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Preset Samples */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Load ready-to-test curated spatial datasets to benchmark query evaluation immediately:
              </p>

              <div className="grid grid-cols-1 gap-3">
                {/* Sample 1: Commercial CSV */}
                <div className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex items-center justify-between transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Commercial Business Zone (CSV Spreadsheet)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        8 office hubs & warehouses with latitude, longitude, area, floors, and flat rooftops
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('commercial_csv', 'Commercial Business Zone')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition-all"
                  >
                    Load CSV
                  </button>
                </div>

                {/* Sample 2: Urban Rooftops GeoJSON */}
                <div className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex items-center justify-between transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Solar Rooftop Geometries (GeoJSON)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        High-precision sub-meter polygonal rooftops classified for solar potential
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('rooftops_geojson', 'Solar Rooftops')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-all"
                  >
                    Load GeoJSON
                  </button>
                </div>

                {/* Sample 3: CSV Template */}
                <div className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex items-center justify-between transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Spreadsheet Template Example (CSV)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sample minimal structure demonstrating how to format your own custom CSV
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('template_csv', 'CSV Template')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition-all"
                  >
                    Load Template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
