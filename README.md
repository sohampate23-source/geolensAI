# GeoLens AI 🛰️
### AI-Powered Satellite Imagery Search & Geospatial Intelligence Platform

GeoLens AI converts natural-language geographic questions into executable geospatial workflows. It couples LLM query planning with a deterministic GIS engine running in projected Coordinate Reference Systems (CRS) and an imagery grounding vision pipeline.

---

## 🗺️ Product Vision & Architecture

> **Core Principle:** The LLM plans the query. The GIS engine performs the actual geographic calculations. The vision model identifies image-based objects. Never let the LLM invent detections, distances, areas, or evidence.

```
                           Natural Language Query
                       (English, Hindi, Marathi)
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │    Multilingual Translation   │
                   │    (Sarvam AI / Dictionary)   │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │      LLM Query Planner        │
                   │   (OpenRouter / Rule Engine)  │
                   └───────────────┬───────────────┘
                                   │ Validated Pydantic Plan
                                   ▼
                   ┌───────────────────────────────┐
                   │      Deterministic GIS        │
                   │  GeoPandas, Shapely, PyProj   │
                   │   UTM Zone 23S (EPSG:32723)   │
                   └───────┬───────────────┬───────┘
                           │               │
                           ▼               ▼
          ┌─────────────────────────┐  ┌─────────────────────────┐
          │  Multi-Criteria Scorer  │  │   Vision Grounding      │
          │  (Area, Proximity, Conf)│  │   (SpaceNet / SkyCLIP)  │
          └────────────┬────────────┘  └───────────┬─────────────┘
                       │                           │
                       └─────────────┬─────────────┘
                                     │
                                     ▼
                      Interactive 5-Zone Dark UI
                   (Leaflet Map, Results, Evidence, Export)
```

---

## ✨ Features

- **Natural-Language GeoSearch**: Query satellite footprints using natural language (`"Find buildings within 100 metres of major roads"`, `"Locate buildings that are at least 500 square metres"`, `"Show buildings near roads but exclude those inside the industrial zone"`).
- **Multilingual Support**: Supports English, Hindi (हिंदी), and Marathi (मराठी) with automatic geographic terminology preservation.
- **Strict Metric Correctness**: All distance and area filters are computed in **UTM Zone 23S (EPSG:32723)** on Rio de Janeiro coordinates (`[-22.912, -43.230]`). Output geometries are projected to standard WGS84 (EPSG:4326).
- **Interactive Leaflet Central Map**: Custom dark styling with layer toggles (OSM Roads, Building Footprints, Spatial Buffers, Query Result Highlights, Restriction Zones, Selected Feature Highlighting).
- **Multi-Criteria Candidate Ranking**: Local deterministic scorer with criteria score breakdowns (Surface Area, Road Proximity, Verification Weight) and dynamic priority sliders. Truthfully displays: `Ranked candidates — for human review.`
- **Sensor Evidence Grounding**: Satellite footprint sensor preview crops with WorldView-2 0.5m pan-sharpened metadata and spatial rule match tags.
- **One-Click Exports**: Export live executed results to **GeoJSON**, **CSV** tabular attributes, **JSON query plans**, and full execution audit summaries.
- **Guided 5-Step Demo Stepper**: Interactive walkthrough with preset scenarios for live presentations.
- **Zero API Key Requirement**: Runs completely out of the box in `DEMO_MODE` with reliable local fallbacks and honest provider status badges.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Leaflet, Lucide Icons, Recharts
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, GeoPandas, Shapely, PyProj, Uvicorn
- **AI Integrations**: OpenRouter (structured JSON output), Sarvam AI (Indic translation), SkyCLIP (vision grounding interface), Jev AI (optional ranking adapter)

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# (Optional) Configure environment variables
cp .env.example .env

# Run backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will be live at `http://127.0.0.1:8000`. API documentation is accessible at `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup
```bash
# Navigate to frontend and install dependencies
cd frontend
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Test Suite

Run the full automated test suite covering CRS calculations, spatial operations, exclusion semantics, fallback planning, API endpoints, and exports:

```bash
python -m pytest backend/tests -v
```

### Verified Test Results
```text
backend/tests/test_api_endpoints.py::test_health_endpoint PASSED
backend/tests/test_api_endpoints.py::test_attribution_endpoint PASSED
backend/tests/test_api_endpoints.py::test_datasets_endpoint PASSED
backend/tests/test_api_endpoints.py::test_layers_endpoint PASSED
backend/tests/test_api_endpoints.py::test_chat_and_export_workflow PASSED
backend/tests/test_crs_and_gis.py::test_crs_projection_roundtrip PASSED
backend/tests/test_crs_and_gis.py::test_accurate_planar_area_calculation PASSED
backend/tests/test_crs_and_gis.py::test_planar_distance_calculation PASSED
backend/tests/test_crs_and_gis.py::test_gis_engine_dwithin_filter PASSED
backend/tests/test_crs_and_gis.py::test_gis_engine_beyond_filter PASSED
backend/tests/test_crs_and_gis.py::test_gis_engine_min_area_filter PASSED
backend/tests/test_crs_and_gis.py::test_gis_engine_exclusion_semantics PASSED
backend/tests/test_crs_and_gis.py::test_empty_results_handling PASSED
backend/tests/test_planners_and_ranking.py::test_fallback_planner_basic_proximity PASSED
backend/tests/test_planners_and_ranking.py::test_fallback_planner_min_area PASSED
backend/tests/test_planners_and_ranking.py::test_fallback_planner_beyond_relation PASSED
backend/tests/test_planners_and_ranking.py::test_fallback_planner_exclusion PASSED
backend/tests/test_planners_and_ranking.py::test_fallback_planner_followup_update PASSED
backend/tests/test_planners_and_ranking.py::test_local_scorer_ranking_and_breakdown PASSED
=========================== 19 passed in 0.83s ===========================
```

---

## 📁 Directory Structure

```
GeoLens Ai/
├── backend/
│   ├── app/
│   │   ├── config.py              # Environment settings & provider flags
│   │   ├── schemas.py             # Pydantic QueryPlan and API models
│   │   ├── main.py                # FastAPI routes & endpoints
│   │   ├── gis/
│   │   │   ├── crs_utils.py       # UTM Zone 23S projection & geodesic math
│   │   │   ├── engine.py          # Deterministic spatial GIS execution engine
│   │   │   ├── data_loader.py     # SpaceNet & OSM layer loader
│   │   │   └── generate_fixtures.py # Georeferenced Rio de Janeiro fixture generator
│   │   ├── planners/
│   │   │   ├── base.py            # Base planner interface
│   │   │   ├── openrouter.py      # OpenRouter structured JSON output adapter
│   │   │   └── fallback.py        # Regex & keyword deterministic planner
│   │   ├── providers/
│   │   │   ├── sarvam.py          # Sarvam AI translation adapter
│   │   │   ├── jev.py             # Jev AI candidate ranking adapter
│   │   │   └── skyclip.py         # SkyCLIP vision grounding adapter
│   │   ├── ranking/
│   │   │   └── scorer.py          # Local multi-criteria weighted scorer
│   │   └── attribution.py         # Data provenance and licensing metadata
│   ├── tests/                     # 19 automated tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopNav.tsx         # Navigation, dataset status, language selector
│   │   │   ├── LeftPanel.tsx      # Natural-language search, editable plan chips
│   │   │   ├── MapView.tsx        # Central Leaflet map with buffer & result layers
│   │   │   ├── RightPanel.tsx     # Results, Ranking, Evidence, and Export tabs
│   │   │   ├── BottomStatus.tsx   # Collapsible pipeline execution trace
│   │   │   ├── DemoStepper.tsx    # 5-step guided demonstration walkthrough
│   │   │   └── AttributionModal.tsx # Full provenance & licensing modal
│   │   ├── types.ts               # Shared TypeScript interfaces
│   │   ├── api.ts                 # Backend API client
│   │   ├── App.tsx                # Main application shell
│   │   └── index.css              # Dark geospatial design system CSS
│   ├── package.json
│   └── vite.config.ts
├── data/
│   ├── fixtures/                  # Georeferenced SpaceNet Rio footprints, OSM roads, zones
│   ├── raw/
│   ├── processed/
│   └── embeddings/
├── .gitignore
├── .env.example
└── README.md
```

---

## 📜 Attribution & Licenses

- **SpaceNet Buildings Dataset v1 (AOI_1_Rio)**: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
- **OpenStreetMap Roads**: Open Data Commons Open Database License (ODbL) 1.0.
- **SkyScript / SkyCLIP Checkpoint**: Research and academic terms (Wang et al.).
- **OpenRouter & Sarvam AI**: Respective commercial API terms of service.
