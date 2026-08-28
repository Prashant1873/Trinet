"""
TRINET (TM) Google Places API (New) Client
Optimized with field masks, rate limiting, and cache-first query verification.
"""

import os
import requests
import json
import hashlib
from datetime import datetime
from dotenv import load_dotenv
from lib.database import query_one, execute_write

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.businessStatus,places.types"

def compute_query_hash(query, location=""):
    """Hash search query to check in cache."""
    combined = f"google_places:{query.strip().lower()}:{location.strip().lower()}"
    return hashlib.md5(combined.encode('utf-8')).hexdigest()

def search_google_places(text_query, location_bias=None, max_results=20):
    """
    Search Google Places API (New) with field mask and caching.
    """
    if not GOOGLE_API_KEY or GOOGLE_API_KEY.startswith('your_'):
        return {"error": "Google API key not configured", "results": []}

    q_hash = compute_query_hash(text_query)
    
    # Check cache first
    cached = query_one("SELECT response_data, searched_at FROM search_cache WHERE query_hash = ?", (q_hash,))
    if cached and cached.get('response_data'):
        try:
            data = json.loads(cached['response_data'])
            # Log cache hit
            execute_write(
                "INSERT INTO api_usage_logs (id, service, endpoint, success, cached) VALUES (?, ?, ?, ?, ?)",
                (q_hash[:8], 'GOOGLE_PLACES', 'searchText', 1, 1)
            )
            return {"source": "cache", "results": data}
        except Exception:
            pass

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK
    }

    body = {
        "textQuery": text_query,
        "pageSize": min(max_results, 20),
        "languageCode": "en"
    }

    if location_bias and "lat" in location_bias and "lng" in location_bias:
        body["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": location_bias["lat"],
                    "longitude": location_bias["lng"]
                },
                "radius": location_bias.get("radius", 50000.0) # 50km default
            }
        }

    try:
        resp = requests.post(PLACES_SEARCH_URL, headers=headers, json=body, timeout=15)
        if resp.status_code == 200:
            res_json = resp.json()
            places = res_json.get('places', [])
            
            # Format normalized places
            formatted_places = []
            for p in places:
                loc = p.get('location', {})
                name_obj = p.get('displayName', {})
                formatted_places.append({
                    "google_place_id": p.get('id'),
                    "company_name": name_obj.get('text', ''),
                    "address": p.get('formattedAddress', ''),
                    "latitude": loc.get('latitude'),
                    "longitude": loc.get('longitude'),
                    "website": p.get('websiteUri'),
                    "phone": p.get('nationalPhoneNumber'),
                    "google_rating": p.get('rating'),
                    "review_count": p.get('userRatingCount'),
                    "google_maps_url": p.get('googleMapsUri'),
                    "types": p.get('types', []),
                    "business_status": p.get('businessStatus')
                })

            # Save in cache (30-day TTL)
            execute_write(
                "INSERT OR REPLACE INTO search_cache (id, source, query, query_hash, response_data, result_count) VALUES (?, ?, ?, ?, ?, ?)",
                (q_hash[:12], 'GOOGLE_PLACES', text_query, q_hash, json.dumps(formatted_places), len(formatted_places))
            )
            
            # Log successful API call
            execute_write(
                "INSERT INTO api_usage_logs (id, service, endpoint, success, cached, estimated_cost) VALUES (?, ?, ?, ?, ?, ?)",
                (q_hash[:8], 'GOOGLE_PLACES', 'searchText', 1, 0, 0.035)
            )

            return {"source": "live_api", "results": formatted_places}
        else:
            err_msg = f"API returned {resp.status_code}: {resp.text}"
            execute_write(
                "INSERT INTO api_usage_logs (id, service, endpoint, success, cached, error_message) VALUES (?, ?, ?, ?, ?, ?)",
                (q_hash[:8], 'GOOGLE_PLACES', 'searchText', 0, 0, err_msg)
            )
            return {"error": err_msg, "results": []}
    except Exception as e:
        return {"error": str(e), "results": []}
