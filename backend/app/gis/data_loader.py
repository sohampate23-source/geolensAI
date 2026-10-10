import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import geopandas as gpd
from shapely.geometry import shape

from backend.app.config import settings

class DataLoader:
    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.fixtures_dir = self.data_dir / "fixtures"
        self._buildings_gdf: Optional[gpd.GeoDataFrame] = None
        self._roads_gdf: Optional[gpd.GeoDataFrame] = None
        self._zones_gdf: Optional[gpd.GeoDataFrame] = None
        self._custom_buildings_source: Optional[str] = None
        self._custom_roads_source: Optional[str] = None

    def set_custom_layer(self, layer_type: str, gdf: gpd.GeoDataFrame, source_name: str = "Imported Layer"):
        """Overrides a layer with a user-imported custom dataset."""
        if gdf.crs is None:
            gdf.set_crs(epsg=4326, inplace=True)
        if layer_type in ["buildings", "rooftops"]:
            self._buildings_gdf = gdf.copy()
            self._custom_buildings_source = source_name
        elif layer_type == "roads":
            self._roads_gdf = gdf.copy()
            self._custom_roads_source = source_name
        elif layer_type == "zones":
            self._zones_gdf = gdf.copy()

    def reset_to_defaults(self):
        """Clears custom uploaded layers and re-enables baseline fixtures."""
        self._buildings_gdf = None
        self._roads_gdf = None
        self._zones_gdf = None
        self._custom_buildings_source = None
        self._custom_roads_source = None

    def get_status(self) -> Dict[str, Any]:
        """Returns the status and counts of currently loaded baseline or custom layers."""
        return {
            "has_custom_buildings": self._custom_buildings_source is not None,
            "custom_buildings_source": self._custom_buildings_source,
            "has_custom_roads": self._custom_roads_source is not None,
            "custom_roads_source": self._custom_roads_source,
            "buildings_count": len(self.load_buildings()),
            "roads_count": len(self.load_roads()),
        }

    def get_datasets_metadata(self) -> List[Dict[str, Any]]:
        """Return available datasets and whether each is real data or demo fixture."""
        is_demo = settings.DEMO_MODE
        return [
            {
                "id": "spacenet_aoi_1_rio",
                "name": "SpaceNet Buildings v1 (AOI_1_Rio)",
                "study_area": "Rio de Janeiro, Brazil",
                "status": "Demo Fixture" if is_demo else "Real Dataset",
                "is_real_data": not is_demo,
                "feature_types": ["building_footprints"],
                "source_crs": "EPSG:32723 (UTM Zone 23S) / WGS84",
                "sensor": "WorldView-2 0.5m pan-sharpened",
                "attribution": "SpaceNet on AWS / SpaceNet LLC",
                "license": "Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)"
            },
            {
                "id": "osm_rio_roads",
                "name": "OpenStreetMap Roads (Rio de Janeiro)",
                "study_area": "Rio de Janeiro, Brazil",
                "status": "Vector Layer",
                "is_real_data": True,
                "feature_types": ["road_linestrings"],
                "source_crs": "EPSG:4326 (WGS84)",
                "attribution": "OpenStreetMap Contributors",
                "license": "Open Data Commons Open Database License (ODbL)"
            },
            {
                "id": "rio_zoning_restrictions",
                "name": "Rio Urban Zoning Restrictions",
                "study_area": "Rio de Janeiro, Brazil",
                "status": "Cadastre Overlay",
                "is_real_data": False,
                "feature_types": ["exclusion_zones"],
                "source_crs": "EPSG:4326 (WGS84)",
                "attribution": "City of Rio Planning Cadastre (Sample)",
                "license": "Public Domain / Sample Fixture"
            }
        ]

    def load_buildings(self) -> gpd.GeoDataFrame:
        """Load building footprints into a GeoDataFrame."""
        if self._buildings_gdf is not None:
            return self._buildings_gdf.copy()

        path = self.fixtures_dir / "spacenet_rio_buildings.geojson"
        if not path.exists():
            raise FileNotFoundError(f"Buildings fixture not found at {path}")

        gdf = gpd.read_file(path)
        if gdf.crs is None:
            gdf.set_crs(epsg=4326, inplace=True)
        self._buildings_gdf = gdf
        return gdf.copy()

    def load_roads(self) -> gpd.GeoDataFrame:
        """Load road features into a GeoDataFrame."""
        if self._roads_gdf is not None:
            return self._roads_gdf.copy()

        path = self.fixtures_dir / "spacenet_rio_roads.geojson"
        if not path.exists():
            raise FileNotFoundError(f"Roads fixture not found at {path}")

        gdf = gpd.read_file(path)
        if gdf.crs is None:
            gdf.set_crs(epsg=4326, inplace=True)
        self._roads_gdf = gdf
        return gdf.copy()

    def load_zones(self) -> gpd.GeoDataFrame:
        """Load exclusion zones into a GeoDataFrame."""
        if self._zones_gdf is not None:
            return self._zones_gdf.copy()

        path = self.fixtures_dir / "spacenet_rio_zones.geojson"
        if not path.exists():
            raise FileNotFoundError(f"Zones fixture not found at {path}")

        gdf = gpd.read_file(path)
        if gdf.crs is None:
            gdf.set_crs(epsg=4326, inplace=True)
        self._zones_gdf = gdf
        return gdf.copy()

    def load_evidence_metadata(self) -> List[Dict[str, Any]]:
        path = self.fixtures_dir / "sample_evidence_metadata.json"
        if not path.exists():
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

# Global data loader instance
data_loader = DataLoader()
