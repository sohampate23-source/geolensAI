from typing import List, Dict, Any

ATTRIBUTION_METADATA: List[Dict[str, Any]] = [
    {
        "name": "SpaceNet Buildings Dataset v1 (AOI_1_Rio)",
        "provider": "SpaceNet on AWS / SpaceNet LLC",
        "description": "Satellite imagery from DigitalGlobe WorldView-2 (0.5m pan-sharpened 8-band multispectral) and high-accuracy vector building footprint labels covering Rio de Janeiro, Brazil.",
        "license": "Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)",
        "source_url": "https://spacenet.ai/spacenet-buildings-dataset-v1/",
        "usage_role": "Primary Reference Footprints & Geographic Imagery Grounding",
        "provenance_statement": "Ground-truth annotations used as verified reference footprints. Not treated as model-generated predictions."
    },
    {
        "name": "OpenStreetMap Road Network",
        "provider": "OpenStreetMap Contributors",
        "description": "Global crowdsourced vector transportation network including primary, secondary, and arterial roadways in Rio de Janeiro.",
        "license": "Open Data Commons Open Database License (ODbL) 1.0",
        "source_url": "https://www.openstreetmap.org/copyright",
        "usage_role": "Spatial Reference Layer & Proximity Buffer Calculation",
        "provenance_statement": "Extracted road geometries and tags under ODbL terms."
    },
    {
        "name": "SkyScript / SkyCLIP Checkpoint Architecture",
        "provider": "Wang et al. / SkyScript Research Group",
        "description": "Pretrained vision-language foundation model tailored for remote sensing imagery semantic retrieval.",
        "license": "Research & Academic Use (Subject to GitHub repository terms)",
        "source_url": "https://github.com/wangzhecheng/SkyScript",
        "usage_role": "Semantic Tile Embedding & Imagery Grounding Interface",
        "provenance_statement": "Integrated via modular weights adapter. Active only when verified weights checkpoint is present."
    },
    {
        "name": "OpenRouter API",
        "provider": "OpenRouter, Inc.",
        "description": "API Gateway for large-language models with structured JSON output enforcement.",
        "license": "Commercial / API Terms of Service",
        "source_url": "https://openrouter.ai/",
        "usage_role": "Natural Language Query Planning & Intent Formalization",
        "provenance_statement": "Constrained by strict Pydantic schemas. GIS engine performs actual spatial calculation."
    },
    {
        "name": "Sarvam AI",
        "provider": "Sarvam AI",
        "description": "Indian-language translation models supporting Indic language queries (Hindi, Marathi, English).",
        "license": "API Terms of Service",
        "source_url": "https://sarvam.ai/",
        "usage_role": "Multilingual Query Translation to English Canonical Schema",
        "provenance_statement": "Translates linguistic prompt while strictly preserving numbers, units, and spatial prepositions."
    },
    {
        "name": "Jev AI (Optional Adapter)",
        "provider": "Jev AI",
        "description": "External ranking and decision-support scoring provider.",
        "license": "Subject to verified commercial API contract",
        "source_url": "Pending Verification",
        "usage_role": "External Candidate Ranking (Local Scorer Active as Default)",
        "provenance_statement": "Local deterministic multi-criteria scorer is used until official Jev endpoint contract is verified."
    }
]

def get_attribution_summary() -> Dict[str, Any]:
    return {
        "project": "GeoLens AI",
        "version": "1.0.0",
        "study_area": "Rio de Janeiro, Brazil (AOI_1_Rio)",
        "authoritative_crs": "EPSG:32723 (UTM Zone 23S) & EPSG:4326 (WGS84)",
        "licensing_statement": "All datasets and providers are attributed in compliance with their respective open licenses and terms of service.",
        "sources": ATTRIBUTION_METADATA
    }
