export type SpatialRelation = 'within' | 'intersects' | 'beyond' | 'contains' | 'none';
export type TargetType = 'buildings' | 'roads' | 'rooftops' | 'clusters';
export type ReferenceType = 'major roads' | 'roads' | 'drainage channels' | 'industrial zone' | 'none';

export interface QueryPlan {
  target: TargetType;
  relation: SpatialRelation;
  reference: ReferenceType;
  distance_m: number | null;
  min_area_m2: number | null;
  max_area_m2: number | null;
  exclude_zone: string | null;
  rooftop_type: string | null;
  clustering: boolean;
  original_query?: string | null;
  planner_source: string;
  model_name?: string | null;
  aoi_bbox?: [number, number, number, number] | null;
  aoi_polygon?: [number, number][] | null;
}

export interface ExecutionOperation {
  name: string;
  description: string;
  input_count: number;
  output_count: number;
  execution_time_ms: number;
}

export interface ExecutionReport {
  input_feature_count: number;
  output_feature_count: number;
  applied_operations: ExecutionOperation[];
  rejected_geometries_count: number;
  study_area: string;
  target_crs: string;
  execution_time_total_ms: number;
  data_sources: string[];
  overall_accuracy_pct?: number;
  geometric_precision_m?: number;
  validation_status?: string;
  errors: string[];
  warnings: string[];
}

export interface ScoreCriterionBreakdown {
  criterion: string;
  raw_value: string;
  weight: number;
  normalized_score: number;
  description: string;
}

export interface RankedCandidate {
  feature_id: string;
  rank: number;
  total_score: number;
  criteria_breakdown: ScoreCriterionBreakdown[];
  area_m2: number | null;
  distance_to_road_m: number | null;
  model_confidence: number | null;
  accuracy_pct?: number;
  geometric_precision_m?: number;
  validation_status?: string;
  category?: string;
  feature_type: string;
  ranking_provider: string;
  human_review_notice: string;
}

export interface FeatureEvidence {
  feature_id: string;
  tile_id: string;
  dataset: string;
  label: string;
  bounds: [number, number, number, number];
  spatial_rules_matched: string[];
  measured_area_m2: number | null;
  measured_distance_m: number | null;
  accuracy_pct?: number;
  geometric_precision_m?: number;
  validation_status?: string;
  category?: string;
  model_confidence: number | null;
  has_satellite_crop: boolean;
  crop_thumbnail_url?: string | null;
  source_attribution: string;
}

export interface ChatResponse {
  query_id: string;
  original_query: string;
  translated_query?: string | null;
  language: string;
  query_plan: QueryPlan;
  geojson: any;
  buffer_geojson?: any | null;
  statistics: {
    total_matches: number;
    mean_area_m2: number;
    max_area_m2: number;
    min_area_m2: number;
    mean_road_distance_m: number;
    overall_accuracy_pct?: number;
    geometric_precision_m?: number;
    type_distribution: Record<string, number>;
    category_bifurcation?: Record<string, { count: number; color: string; mean_area_m2: number; avg_accuracy_pct: number }>;
  };
  ranking: RankedCandidate[];
  evidence: FeatureEvidence[];
  execution_report: ExecutionReport;
  provider_status: {
    planner_source: string;
    planner_model: string;
    translation_active: boolean;
    translation_note?: string | null;
    ranking_provider: string;
    ranking_status: string;
    demo_mode: boolean;
    study_area: string;
  };
}

export interface BaseLayers {
  buildings: any;
  roads: any;
  zones: any;
}

export interface AttributionSource {
  name: string;
  provider: string;
  description: string;
  license: string;
  source_url: string;
  usage_role: string;
  provenance_statement: string;
}

export interface DatasetItem {
  id: string;
  name: string;
  study_area: string;
  status: string;
  is_real_data: boolean;
  feature_types: string[];
  source_crs: string;
  sensor?: string;
  attribution: string;
  license: string;
}

export interface ImportResult {
  status: string;
  format: string;
  filename: string;
  feature_count: number;
  layer_type: string;
  bounds: [number, number, number, number];
  geometry_types: string[];
  geojson: any;
  message: string;
}

export interface ImportStatus {
  has_custom_buildings: boolean;
  custom_buildings_source: string | null;
  has_custom_roads: boolean;
  custom_roads_source: string | null;
  buildings_count: number;
  roads_count: number;
}

