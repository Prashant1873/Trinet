"""
TRINET (TM) Spatial Computing & Clustering
Haversine distance, bounding box querying, and spatial clustering algorithms.
"""

import math
from collections import defaultdict

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on the earth in kilometers.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    
    R = 6371.0 # Earth radius in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def filter_by_bounds(items, sw_lat, sw_lng, ne_lat, ne_lng):
    """
    Filter items with latitude/longitude inside a bounding box.
    """
    results = []
    for item in items:
        lat = item.get('latitude')
        lng = item.get('longitude')
        if lat is not None and lng is not None:
            if sw_lat <= lat <= ne_lat and sw_lng <= lng <= ne_lng:
                results.append(item)
    return results

def cluster_points(facilities, zoom=5, cluster_radius_pixels=60):
    """
    Simple grid-based spatial clustering for zoom levels.
    At high zoom (>= 12), return individual points.
    At lower zoom, group points in grid cells and compute weighted centroids.
    """
    if zoom >= 12 or len(facilities) <= 20:
        return {
            "type": "points",
            "data": facilities
        }
    
    # Grid size in degrees based on zoom level (world width = 360 deg / 2^zoom)
    cell_size = 360.0 / (2 ** zoom * (512 / cluster_radius_pixels))
    
    grid = defaultdict(list)
    for fac in facilities:
        lat = fac.get('latitude')
        lng = fac.get('longitude')
        if lat is None or lng is None:
            continue
        gx = int(math.floor(lng / cell_size))
        gy = int(math.floor(lat / cell_size))
        grid[(gx, gy)].append(fac)
        
    clusters = []
    points = []
    
    for (gx, gy), fac_list in grid.items():
        if len(fac_list) == 1:
            points.append(fac_list[0])
        else:
            # Centroid
            avg_lat = sum(f['latitude'] for f in fac_list) / len(fac_list)
            avg_lng = sum(f['longitude'] for f in fac_list) / len(fac_list)
            
            # Primary industry in this cluster
            industry_counts = defaultdict(int)
            for f in fac_list:
                ind = f.get('industry') or 'General'
                industry_counts[ind] += 1
            top_industry = max(industry_counts.items(), key=lambda x: x[1])[0]
            
            clusters.append({
                "cluster_id": f"c_{gx}_{gy}_{len(fac_list)}",
                "latitude": round(avg_lat, 6),
                "longitude": round(avg_lng, 6),
                "count": len(fac_list),
                "top_industry": top_industry,
                "expansion_zoom": min(zoom + 2, 14)
            })
            
    return {
        "type": "mixed",
        "clusters": clusters,
        "points": points,
        "total_facilities": len(facilities)
    }
