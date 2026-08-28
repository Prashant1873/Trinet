"""
TRINET (TM) Apify Integration
Runs Google Maps & Web Scraper actors for scalable batch discovery and enrichment.
"""

import os
import json
from dotenv import load_dotenv
from lib.database import execute_write

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')

def run_apify_maps_scraper(search_terms, max_items=20):
    """
    Run Apify Google Maps Scraper actor.
    """
    if not APIFY_API_TOKEN or APIFY_API_TOKEN.startswith('your_'):
        return {"error": "Apify token not configured", "results": []}

    try:
        from apify_client import ApifyClient
        client = ApifyClient(APIFY_API_TOKEN)
        
        run_input = {
            "searchStringsArray": search_terms if isinstance(search_terms, list) else [search_terms],
            "maxCrawledPlacesPerSearch": max_items,
            "language": "en",
            "countryCode": "in"
        }
        
        run = client.actor("compass/crawler-google-places").call(run_input=run_input)
        
        dataset_items = client.dataset(run["defaultDatasetId"]).list_items().items
        
        formatted = []
        for item in dataset_items:
            formatted.append({
                "google_place_id": item.get('placeId') or item.get('id'),
                "company_name": item.get('title') or item.get('name'),
                "address": item.get('address') or item.get('street'),
                "city": item.get('city'),
                "state": item.get('state'),
                "pincode": item.get('postalCode'),
                "latitude": item.get('location', {}).get('lat') if isinstance(item.get('location'), dict) else item.get('lat'),
                "longitude": item.get('location', {}).get('lng') if isinstance(item.get('location'), dict) else item.get('lng'),
                "phone": item.get('phone'),
                "website": item.get('website'),
                "google_rating": item.get('totalScore'),
                "review_count": item.get('reviewsCount'),
                "google_maps_url": item.get('url')
            })
            
        execute_write(
            "INSERT INTO api_usage_logs (id, service, endpoint, success, cached, estimated_cost) VALUES (?, ?, ?, ?, ?, ?)",
            (run["id"][:8], 'APIFY', 'crawler-google-places', 1, 0, len(formatted) * 0.004)
        )
        
        return {"results": formatted, "run_id": run["id"]}
        
    except Exception as e:
        return {"error": str(e), "results": []}
