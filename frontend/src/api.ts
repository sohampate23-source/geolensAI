import { ChatResponse, BaseLayers, DatasetItem, AttributionSource, QueryPlan } from './types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDatasets(): Promise<{ study_area: string; datasets: DatasetItem[] }> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error('Failed to load datasets');
  return res.json();
}

export async function fetchAttribution(): Promise<{ project: string; sources: AttributionSource[] }> {
  const res = await fetch(`${API_BASE}/attribution`);
  if (!res.ok) throw new Error('Failed to load attribution metadata');
  return res.json();
}

export async function fetchBaseLayers(): Promise<BaseLayers> {
  const res = await fetch(`${API_BASE}/layers`);
  if (!res.ok) throw new Error('Failed to load base geographic layers');
  return res.json();
}

export async function executeChatQuery(
  query: string,
  previousPlan?: QueryPlan | null,
  language: string = 'en',
  weights?: Record<string, number>,
  aoi_bbox?: [number, number, number, number] | null,
  aoi_polygon?: [number, number][] | null
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      previous_plan: previousPlan,
      language,
      weights,
      aoi_bbox,
      aoi_polygon,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error (${res.status})`);
  }

  return res.json();
}

export async function exportData(
  queryId: string,
  format: 'geojson' | 'csv' | 'json_plan' | 'summary',
  features?: any,
  plan?: QueryPlan | null
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_id: queryId,
      format,
      features,
      plan,
    }),
  });

  if (!res.ok) throw new Error('Export generation failed');

  const contentDisposition = res.headers.get('Content-Disposition');
  let filename = `geolens_${format}_${queryId}`;
  if (contentDisposition && contentDisposition.includes('filename=')) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  } else {
    if (format === 'geojson') filename += '.geojson';
    else if (format === 'csv') filename += '.csv';
    else filename += '.json';
  }

  const blob = await res.blob();
  return { blob, filename };
}

export async function importSpatialData(
  format: string,
  content: string,
  filename?: string,
  layerType: string = 'buildings'
): Promise<any> {
  const res = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format,
      content,
      filename,
      layer_type: layerType,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Import failed (${res.status})`);
  }

  return res.json();
}

export async function uploadSpatialFile(file: File, layerType: string = 'buildings'): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('layer_type', layerType);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }

  return res.json();
}

export async function loadSampleDataset(sampleId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/import/sample`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sample_id: sampleId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to load sample (${res.status})`);
  }

  return res.json();
}

export async function resetImportedData(): Promise<any> {
  const res = await fetch(`${API_BASE}/import/reset`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to reset dataset layers');
  }

  return res.json();
}

export async function fetchImportStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/import/status`);
  if (!res.ok) throw new Error('Failed to fetch dataset status');
  return res.json();
}

