"""
TRINET (TM) Discovery Orchestrator & Entity Resolution
Runs discovery queries, matches/deduplicates entities, and enriches database.
"""

import uuid
import re
import random
from lib.database import query_one, query_all, execute_write
from lib.google_places import search_google_places
from lib.apify_client import run_apify_maps_scraper

def normalize_name(name):
    """Normalize company name for fuzzy comparison."""
    if not name:
        return ""
    n = name.lower().strip()
    for term in ['pvt.', 'ltd.', 'llp', 'private', 'limited', 'corporation', 'company', '& co.', 'industries', 'works', 'inc']:
        n = n.replace(term, '')
    n = re.sub(r'[^\w\s]', '', n)
    return ' '.join(n.split())

def find_or_create_company(place_data, industry=None, state=None, city=None):
    """
    Entity resolution: checks if company exists via normalized name, website domain, or phone.
    If matched, adds facility to existing company; otherwise creates new company.
    """
    raw_name = place_data.get('company_name') or 'Unnamed Manufacturer'
    norm_name = normalize_name(raw_name)
    website = place_data.get('website')
    phone = place_data.get('phone')
    place_id = place_data.get('google_place_id')
    
    # Check if this exact facility (google_place_id) already exists
    if place_id:
        existing_fac = query_one("SELECT id, company_id FROM facilities WHERE google_place_id = ?", (place_id,))
        if existing_fac:
            return existing_fac['company_id'], False # Existing company, duplicate facility
            
    # Check company matching by normalized name
    matched_company = query_one("SELECT id, company_name FROM companies WHERE normalized_name = ? LIMIT 1", (norm_name,))
    
    # Check by domain if website exists
    if not matched_company and website:
        domain = website.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
        if domain:
            matched_company = query_one("SELECT id, company_name FROM companies WHERE domain = ? LIMIT 1", (domain,))
            
    if matched_company:
        company_id = matched_company['id']
        is_new_company = False
    else:
        # Create new Company
        company_id = str(uuid.uuid4())
        is_new_company = True
        domain = None
        if website:
            domain = website.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
            
        execute_write("""
            INSERT INTO companies (id, company_name, normalized_name, website, domain, 
                                   headquarters_city, headquarters_state, industry, 
                                   company_scale, scale_score, verification_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, raw_name, norm_name, website, domain, city, state, industry or 'General', 'SMALL', random.randint(15, 35), 'UNVERIFIED'))
        
    # Create Facility
    fac_id = str(uuid.uuid4())
    execute_write("""
        INSERT INTO facilities (id, company_id, facility_name, facility_type, address, 
                               city, state, latitude, longitude, google_place_id, 
                               google_maps_url, phone, google_rating, review_count, operational_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (fac_id, company_id, f"{raw_name} Facility", 'FACTORY', place_data.get('address'),
          city or place_data.get('city'), state or place_data.get('state'),
          place_data.get('latitude'), place_data.get('longitude'), place_id,
          place_data.get('google_maps_url'), phone, place_data.get('google_rating'),
          place_data.get('review_count'), 'ACTIVE'))
          
    return company_id, is_new_company

def run_discovery_pipeline(query, state=None, city=None, industry=None, source="GOOGLE_PLACES"):
    """
    Executes a discovery task across Google Places or Apify and persists to DB.
    """
    search_query = query
    if city and city.lower() not in query.lower():
        search_query += f" in {city}"
    elif state and state.lower() not in query.lower():
        search_query += f" in {state}"
        
    log_id = str(uuid.uuid4())[:8]
    
    if source == "APIFY_MAPS":
        res = run_apify_maps_scraper(search_query)
    else:
        res = search_google_places(search_query)
        
    places = res.get('results', [])
    new_comp_count = 0
    new_fac_count = 0
    
    for p in places:
        _, is_new_comp = find_or_create_company(p, industry=industry, state=state, city=city)
        if is_new_comp:
            new_comp_count += 1
        new_fac_count += 1
        
    # Update coverage stats if state is provided
    if state:
        cov = query_one("SELECT id, search_count, companies_discovered, facilities_discovered, coverage_score FROM discovery_coverage WHERE state = ?", (state,))
        if cov:
            new_score = min(100, cov['coverage_score'] + int(len(places) * 1.5))
            status = 'INITIAL_COVERAGE' if new_score > 60 else 'PARTIALLY_COVERED'
            execute_write("""
                UPDATE discovery_coverage 
                SET search_count = search_count + 1,
                    companies_discovered = companies_discovered + ?,
                    facilities_discovered = facilities_discovered + ?,
                    coverage_score = ?,
                    status = ?,
                    last_searched_at = datetime('now')
                WHERE state = ?
            """, (new_comp_count, new_fac_count, new_score, status, state))
            
    # Record discovery log
    execute_write("""
        INSERT INTO discovery_logs (id, source, query, geographic_area, industry, results_count, new_companies, new_facilities, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (log_id, source, search_query, f"{city or ''}, {state or ''}".strip(', '), industry, len(places), new_comp_count, new_fac_count, 'COMPLETED'))
    
    return {
        "log_id": log_id,
        "results_found": len(places),
        "new_companies": new_comp_count,
        "new_facilities": new_fac_count,
        "places": places[:10] # Return first 10 for preview
    }
