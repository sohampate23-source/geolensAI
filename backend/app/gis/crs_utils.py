from pyproj import Transformer
from shapely.ops import transform
from shapely.geometry.base import BaseGeometry
from shapely.geometry import shape, mapping
from typing import Tuple, Any, Dict

# Standard EPSG codes for Rio de Janeiro, Brazil
WGS84_CRS = "EPSG:4326"
RIO_UTM_CRS = "EPSG:32723" # UTM Zone 23S

# Pre-initialized Transformers
_transformer_to_utm = Transformer.from_crs(WGS84_CRS, RIO_UTM_CRS, always_xy=True)
_transformer_to_wgs84 = Transformer.from_crs(RIO_UTM_CRS, WGS84_CRS, always_xy=True)

def to_utm_geometry(geom: BaseGeometry) -> BaseGeometry:
    """Project a WGS84 geometry (lon, lat) to UTM Zone 23S (metres)."""
    return transform(_transformer_to_utm.transform, geom)

def to_wgs84_geometry(geom: BaseGeometry) -> BaseGeometry:
    """Project a UTM Zone 23S geometry (metres) to WGS84 (lon, lat)."""
    return transform(_transformer_to_wgs84.transform, geom)

def compute_planar_area_m2(geom: BaseGeometry) -> float:
    """
    Computes accurate planar area in square metres.
    Transforms geometry from WGS84 to UTM Zone 23S before calculating area.
    """
    if geom.is_empty:
        return 0.0
    utm_geom = to_utm_geometry(geom)
    return round(float(utm_geom.area), 2)

def compute_planar_distance_m(geom1: BaseGeometry, geom2: BaseGeometry) -> float:
    """
    Computes accurate planar distance in metres between two geometries.
    Transforms geometries from WGS84 to UTM Zone 23S before calculating distance.
    """
    if geom1.is_empty or geom2.is_empty:
        return float("inf")
    utm_geom1 = to_utm_geometry(geom1)
    utm_geom2 = to_utm_geometry(geom2)
    return round(float(utm_geom1.distance(utm_geom2)), 2)

def create_planar_buffer_wgs84(geom: BaseGeometry, distance_m: float) -> BaseGeometry:
    """
    Generates a buffer of distance_m metres around geom in projected UTM CRS,
    then transforms the resulting buffer polygon back to WGS84.
    """
    if geom.is_empty or distance_m <= 0:
        return geom
    utm_geom = to_utm_geometry(geom)
    utm_buffered = utm_geom.buffer(distance_m)
    return to_wgs84_geometry(utm_buffered)
