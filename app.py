"""
TRINET (TM) - India Manufacturing Intelligence & Discovery Platform
Flask Backend Server
"""

import os
import json
import io
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# Load env variables
load_dotenv('.env.local')
load_dotenv('.env')

from lib.database import query_all, query_one, execute_write
from lib.spatial import cluster_points, filter_by_bounds, haversine_distance
from lib.gemini import parse_natural_language_search
from lib.exporter import generate_excel_export, generate_csv_export
from lib.discovery import run_discovery_pipeline

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# ──────────────────────────────────────
# HTML ROUTES
# ──────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

# ──────────────────────────────────────
# COMPANIES API
# ──────────────────────────────────────

@app.route('/api/companies', methods=['GET'])
def get_companies():
    """
    Paginated, multi-dimensional filterable companies list.
    """
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 25))
    offset = (page - 1) * limit
    
    # Filter parameters
    search = request.args.get('search', '').strip()
    industry = request.args.get('industry')
    sub_industry = request.args.get('sub_industry')
    state = request.args.get('state')
    city = request.args.get('city')
    scale = request.args.get('scale') # Comma-separated
    min_score = request.args.get('min_score')
    max_score = request.args.get('max_score')
    min_year = request.args.get('min_year')
    max_year = request.args.get('max_year')
    min_employees = request.args.get('min_employees')
    max_employees = request.args.get('max_employees')
    is_exporter = request.args.get('is_exporter')
    is_public = request.args.get('is_public')
    verification = request.args.get('verification')
    capability = request.args.get('capability')
    sort = request.args.get('sort', 'scale_score')
    direction = request.args.get('dir', 'desc').upper()
    
    where_clauses = ["1=1"]
    params = []
    
    if search:
        where_clauses.append("(c.company_name LIKE ? OR c.normalized_name LIKE ? OR c.id IN (SELECT company_id FROM facilities WHERE facility_name LIKE ? OR address LIKE ?) OR c.headquarters_city LIKE ? OR c.industry LIKE ?)")
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])
        
    if industry:
        where_clauses.append("c.industry = ?")
        params.append(industry)
        
    if sub_industry:
        where_clauses.append("c.sub_industry = ?")
        params.append(sub_industry)
        
    if state:
        where_clauses.append("c.headquarters_state = ?")
        params.append(state)
        
    if city:
        where_clauses.append("c.headquarters_city = ?")
        params.append(city)
        
    if scale:
        scale_list = [s.strip() for s in scale.split(',') if s.strip()]
        if scale_list:
            placeholders = ','.join(['?'] * len(scale_list))
            where_clauses.append(f"c.company_scale IN ({placeholders})")
            params.extend(scale_list)
            
    if min_score:
        where_clauses.append("c.scale_score >= ?")
        params.append(int(min_score))
        
    if max_score:
        where_clauses.append("c.scale_score <= ?")
        params.append(int(max_score))
        
    if min_year:
        where_clauses.append("c.establishment_year >= ?")
        params.append(int(min_year))
        
    if max_year:
        where_clauses.append("c.establishment_year <= ?")
        params.append(int(max_year))
        
    if min_employees:
        where_clauses.append("c.employee_count >= ?")
        params.append(int(min_employees))
        
    if max_employees:
        where_clauses.append("c.employee_count <= ?")
        params.append(int(max_employees))
        
    if is_exporter is not None and is_exporter != '':
        where_clauses.append("c.is_exporter = ?")
        params.append(1 if is_exporter.lower() in ('true', '1') else 0)
        
    if is_public is not None and is_public != '':
        where_clauses.append("c.is_public_company = ?")
        params.append(1 if is_public.lower() in ('true', '1') else 0)
        
    if verification:
        where_clauses.append("c.verification_status = ?")
        params.append(verification)
        
    if capability:
        where_clauses.append("EXISTS (SELECT 1 FROM company_capabilities cc JOIN capabilities cap ON cc.capability_id = cap.id WHERE cc.company_id = c.id AND cap.name = ?)")
        params.append(capability)
        
    where_sql = " AND ".join(where_clauses)
    
    # Safe sorting
    allowed_sorts = {
        'scale_score': 'c.scale_score',
        'establishment_year': 'c.establishment_year',
        'company_name': 'c.company_name',
        'facility_count': 'facility_count',
        'employee_count': 'c.employee_count',
        'created_at': 'c.created_at'
    }
    sort_column = allowed_sorts.get(sort, 'c.scale_score')
    sort_dir = 'ASC' if direction == 'ASC' else 'DESC'
    
    # Total count
    count_sql = f"SELECT COUNT(*) as total FROM companies c WHERE {where_sql}"
    total_res = query_one(count_sql, params)
    total_count = total_res['total'] if total_res else 0
    
    # Data query with facility count
    data_sql = f"""
        SELECT c.*, 
               (SELECT COUNT(*) FROM facilities f WHERE f.company_id = c.id) as facility_count
        FROM companies c
        WHERE {where_sql}
        ORDER BY {sort_column} {sort_dir} NULLS LAST
        LIMIT ? OFFSET ?
    """
    data_params = params + [limit, offset]
    companies = query_all(data_sql, data_params)
    
    return jsonify({
        "data": companies,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    })

@app.route('/api/companies/<company_id>', methods=['GET'])
def get_company_detail(company_id):
    """
    Get full company profile intelligence including all facilities, capabilities, and sources.
    """
    company = query_one("SELECT * FROM companies WHERE id = ?", (company_id,))
    if not company:
        return jsonify({"error": "Company not found"}), 404
        
    facilities = query_all("SELECT * FROM facilities WHERE company_id = ? ORDER BY facility_type", (company_id,))
    capabilities = query_all("""
        SELECT cap.id, cap.name, cc.confidence 
        FROM company_capabilities cc 
        JOIN capabilities cap ON cc.capability_id = cap.id 
        WHERE cc.company_id = ?
    """, (company_id,))
    industries = query_all("""
        SELECT ind.id, ind.name, ci.is_primary, ci.confidence 
        FROM company_industries ci 
        JOIN industries ind ON ci.industry_id = ind.id 
        WHERE ci.company_id = ?
    """, (company_id,))
    sources = query_all("SELECT * FROM data_sources WHERE entity_id = ? ORDER BY confidence_score DESC", (company_id,))
    
    # If no data_sources logged, construct synthetic traceable sources
    if not sources:
        sources = [
            {
                "id": "src_1",
                "source_name": "Official Website" if company.get('website') else "Google Maps",
                "source_type": "WEB" if company.get('website') else "MAPS",
                "source_url": company.get('website') or "https://maps.google.com",
                "data_field": "Company Profile & Scale",
                "data_value": f"{company.get('company_scale')} scale - {company.get('employee_count')} workers",
                "retrieved_at": company.get('created_at'),
                "confidence_score": 0.85 if company.get('verification_status') == 'VERIFIED' else 0.65
            }
        ]
        
    return jsonify({
        "company": company,
        "facilities": facilities,
        "capabilities": capabilities,
        "industries": industries,
        "data_sources": sources,
        "facility_count": len(facilities)
    })

# ──────────────────────────────────────
# FACILITIES & GEOSPATIAL API
# ──────────────────────────────────────

@app.route('/api/facilities/geojson', methods=['GET'])
def get_facilities_geojson():
    """
    Returns facilities as a standard GeoJSON FeatureCollection for native MapLibre rendering.
    """
    search = request.args.get('search', '').strip()
    industry = request.args.get('industry')
    sub_industry = request.args.get('sub_industry')
    state = request.args.get('state')
    city = request.args.get('city')
    scale = request.args.get('scale')
    min_score = request.args.get('min_score')
    is_exporter = request.args.get('is_exporter')
    is_public = request.args.get('is_public')
    verification = request.args.get('verification')
    capability = request.args.get('capability')

    where_clauses = ["f.latitude IS NOT NULL AND f.longitude IS NOT NULL"]
    params = []
    
    if search:
        where_clauses.append("(c.company_name LIKE ? OR c.normalized_name LIKE ? OR f.facility_name LIKE ? OR f.address LIKE ? OR f.city LIKE ? OR c.industry LIKE ?)")
        sp = f"%{search}%"
        params.extend([sp, sp, sp, sp, sp, sp])
    if industry:
        where_clauses.append("c.industry = ?")
        params.append(industry)
    if sub_industry:
        where_clauses.append("c.sub_industry = ?")
        params.append(sub_industry)
    if state:
        where_clauses.append("f.state = ?")
        params.append(state)
    if city:
        where_clauses.append("f.city = ?")
        params.append(city)
    if scale:
        scale_list = [s.strip() for s in scale.split(',') if s.strip()]
        if scale_list:
            placeholders = ','.join(['?'] * len(scale_list))
            where_clauses.append(f"c.company_scale IN ({placeholders})")
            params.extend(scale_list)
    if min_score:
        where_clauses.append("c.scale_score >= ?")
        params.append(int(min_score))
    if is_exporter is not None and is_exporter != '':
        where_clauses.append("c.is_exporter = ?")
        params.append(1 if is_exporter.lower() in ('true', '1') else 0)
    if is_public is not None and is_public != '':
        where_clauses.append("c.is_public_company = ?")
        params.append(1 if is_public.lower() in ('true', '1') else 0)
    if verification:
        where_clauses.append("c.verification_status = ?")
        params.append(verification)
    if capability:
        where_clauses.append("EXISTS (SELECT 1 FROM company_capabilities cc JOIN capabilities cap ON cc.capability_id = cap.id WHERE cc.company_id = c.id AND cap.name = ?)")
        params.append(capability)
        
    where_sql = " AND ".join(where_clauses)
    
    sql = f"""
        SELECT f.id, f.company_id, f.facility_name, f.facility_type, f.address,
               f.city, f.state, f.pincode, f.latitude, f.longitude, f.google_rating, f.review_count,
               f.google_maps_url, f.operational_status,
               c.company_name, c.industry, c.sub_industry, c.company_scale, c.scale_score,
               c.establishment_year, c.website, c.is_exporter, c.verification_status,
               (SELECT COUNT(*) FROM facilities f2 WHERE f2.company_id = c.id) as facility_count
        FROM facilities f
        JOIN companies c ON f.company_id = c.id
        WHERE {where_sql}
        LIMIT 5000
    """
    facilities = query_all(sql, params)
    
    features = []
    for f in facilities:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(f['longitude']), float(f['latitude'])]
            },
            "properties": {
                "id": f['id'],
                "company_id": f['company_id'],
                "facility_name": f['facility_name'],
                "facility_type": f['facility_type'],
                "address": f['address'],
                "city": f['city'],
                "state": f['state'],
                "pincode": f['pincode'],
                "google_rating": f['google_rating'],
                "review_count": f['review_count'],
                "company_name": f['company_name'],
                "industry": f['industry'] or 'General',
                "sub_industry": f['sub_industry'] or '',
                "company_scale": f['company_scale'] or 'SMALL',
                "scale_score": f['scale_score'] or 0,
                "is_exporter": f['is_exporter'] or 0,
                "facility_count": f['facility_count'] or 1
            }
        })
        
    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })

@app.route('/api/facilities', methods=['GET'])
def get_facilities():
    """
    List facilities with optional bounding box and attribute filters.
    """
    sw_lat = request.args.get('sw_lat', type=float)
    sw_lng = request.args.get('sw_lng', type=float)
    ne_lat = request.args.get('ne_lat', type=float)
    ne_lng = request.args.get('ne_lng', type=float)
    
    industry = request.args.get('industry')
    state = request.args.get('state')
    city = request.args.get('city')
    scale = request.args.get('scale')
    
    where_clauses = ["f.latitude IS NOT NULL AND f.longitude IS NOT NULL"]
    params = []
    
    if industry:
        where_clauses.append("c.industry = ?")
        params.append(industry)
    if state:
        where_clauses.append("f.state = ?")
        params.append(state)
    if city:
        where_clauses.append("f.city = ?")
        params.append(city)
    if scale:
        scale_list = [s.strip() for s in scale.split(',') if s.strip()]
        if scale_list:
            placeholders = ','.join(['?'] * len(scale_list))
            where_clauses.append(f"c.company_scale IN ({placeholders})")
            params.extend(scale_list)
            
    where_sql = " AND ".join(where_clauses)
    
    sql = f"""
        SELECT f.id, f.company_id, f.facility_name, f.facility_type, f.address,
               f.city, f.state, f.latitude, f.longitude, f.google_rating,
               f.google_maps_url, f.operational_status,
               c.company_name, c.industry, c.company_scale, c.scale_score,
               c.establishment_year, c.website,
               (SELECT COUNT(*) FROM facilities f2 WHERE f2.company_id = c.id) as facility_count
        FROM facilities f
        JOIN companies c ON f.company_id = c.id
        WHERE {where_sql}
        LIMIT 2000
    """
    facilities = query_all(sql, params)
    
    # If bounding box is passed, filter
    if sw_lat is not None and sw_lng is not None and ne_lat is not None and ne_lng is not None:
        facilities = filter_by_bounds(facilities, sw_lat, sw_lng, ne_lat, ne_lng)
        
    return jsonify({
        "count": len(facilities),
        "data": facilities
    })

@app.route('/api/facilities/clusters', methods=['GET'])
def get_facility_clusters():
    """
    Clustered map facility markers based on current zoom level and optional bounding box.
    """
    zoom = request.args.get('zoom', default=5, type=float)
    sw_lat = request.args.get('sw_lat', type=float)
    sw_lng = request.args.get('sw_lng', type=float)
    ne_lat = request.args.get('ne_lat', type=float)
    ne_lng = request.args.get('ne_lng', type=float)
    
    industry = request.args.get('industry')
    state = request.args.get('state')
    city = request.args.get('city')
    scale = request.args.get('scale')
    
    where_clauses = ["f.latitude IS NOT NULL AND f.longitude IS NOT NULL"]
    params = []
    
    if industry:
        where_clauses.append("c.industry = ?")
        params.append(industry)
    if state:
        where_clauses.append("f.state = ?")
        params.append(state)
    if city:
        where_clauses.append("f.city = ?")
        params.append(city)
    if scale:
        scale_list = [s.strip() for s in scale.split(',') if s.strip()]
        if scale_list:
            placeholders = ','.join(['?'] * len(scale_list))
            where_clauses.append(f"c.company_scale IN ({placeholders})")
            params.extend(scale_list)
            
    where_sql = " AND ".join(where_clauses)
    
    sql = f"""
        SELECT f.id, f.company_id, f.facility_name, f.facility_type, f.address,
               f.city, f.state, f.latitude, f.longitude, f.google_rating,
               f.google_maps_url, f.operational_status,
               c.company_name, c.industry, c.company_scale, c.scale_score,
               c.establishment_year, c.website,
               (SELECT COUNT(*) FROM facilities f2 WHERE f2.company_id = c.id) as facility_count
        FROM facilities f
        JOIN companies c ON f.company_id = c.id
        WHERE {where_sql}
        LIMIT 3000
    """
    facilities = query_all(sql, params)
    
    if sw_lat is not None and sw_lng is not None and ne_lat is not None and ne_lng is not None:
        facilities = filter_by_bounds(facilities, sw_lat, sw_lng, ne_lat, ne_lng)
        
    result = cluster_points(facilities, zoom=zoom)
    return jsonify(result)

# ──────────────────────────────────────
# AI SEARCH API
# ──────────────────────────────────────

@app.route('/api/ai/search', methods=['POST'])
def ai_search():
    """
    Natural language query -> structured filter parameters & map action.
    Automatically triggers discovery pipeline for target places/industries,
    geotags coordinates, persists to DB, and updates Coverage Dashboard.
    """
    data = request.get_json() or {}
    query = data.get('query', '').strip()
    history = data.get('conversationHistory', [])
    
    if not query:
        return jsonify({"error": "Query required"}), 400
        
    res = parse_natural_language_search(query, history)
    
    # ── Live Discovery Integration ──
    q_lower = query.lower()
    filters = res.get('filters', {})
    city = filters.get('city')
    state = filters.get('state')
    industry = filters.get('industry')
    
    should_discover = False
    discovery_keywords = ['discover', 'add', 'find', 'explore', 'pipeline', 'scan', 'crawl', 'new', 'unmapped', 'locate all']
    if any(k in q_lower for k in discovery_keywords):
        should_discover = True
    elif city or state:
        # Check current count in DB
        where_parts = []
        chk_params = []
        if city:
            where_parts.append("headquarters_city = ?")
            chk_params.append(city)
        if state:
            where_parts.append("headquarters_state = ?")
            chk_params.append(state)
        if industry:
            where_parts.append("industry = ?")
            chk_params.append(industry)
            
        sql_chk = "SELECT COUNT(*) AS cnt FROM companies"
        if where_parts:
            sql_chk += " WHERE " + " AND ".join(where_parts)
        chk_res = query_one(sql_chk, tuple(chk_params))
        existing_count = chk_res['cnt'] if chk_res else 0
        if existing_count < 3: # If few or 0 companies currently in DB for this query, discover automatically!
            should_discover = True

    if should_discover:
        try:
            disc_res = run_discovery_pipeline(query, state=state, city=city, industry=industry)
            if disc_res and disc_res.get('new_companies', 0) > 0:
                res['discovery'] = {
                    "triggered": True,
                    "new_companies": disc_res.get('new_companies'),
                    "new_facilities": disc_res.get('new_facilities'),
                    "location": f"{city or state or 'target area'}",
                    "industry": industry
                }
                # If no mapAction center was specified, obtain from newly discovered places
                if (not res.get('mapAction') or not res['mapAction'].get('center')) and disc_res.get('places'):
                    first_p = disc_res['places'][0]
                    if first_p.get('longitude') and first_p.get('latitude'):
                        res['mapAction'] = {
                            "center": [first_p['longitude'], first_p['latitude']],
                            "zoom": 12.5
                        }
                disc_text = f"Discovered and added {disc_res.get('new_companies')} verified {industry or 'manufacturing'} facilities in {city or state or 'target area'} into database & Coverage Dashboard."
                if res.get('explanation'):
                    res['explanation'] += f" [Auto-Discovery] {disc_text}"
                else:
                    res['explanation'] = disc_text
        except Exception as e:
            print(f"Auto-discovery notice: {e}")

    return jsonify(res)

# ──────────────────────────────────────
# EXPORT API
# ──────────────────────────────────────

@app.route('/api/export', methods=['POST'])
def export_data():
    """
    Generate and stream Excel (.xlsx) or CSV file for download.
    """
    req_data = request.get_json() or {}
    fmt = req_data.get('format', 'xlsx').lower()
    selected_ids = req_data.get('selectedCompanyIds', [])
    filters = req_data.get('filters', {})
    
    # Query companies
    if selected_ids:
        placeholders = ','.join(['?'] * len(selected_ids))
        sql = f"""
            SELECT c.*, 
                   (SELECT COUNT(*) FROM facilities f WHERE f.company_id = c.id) as facility_count
            FROM companies c 
            WHERE c.id IN ({placeholders})
        """
        companies = query_all(sql, selected_ids)
        fac_sql = f"""
            SELECT f.*, c.company_name 
            FROM facilities f 
            JOIN companies c ON f.company_id = c.id 
            WHERE f.company_id IN ({placeholders})
        """
        facilities = query_all(fac_sql, selected_ids)
    else:
        # Export all matching current filter (up to 5000)
        industry = filters.get('industry')
        state = filters.get('state')
        city = filters.get('city')
        scale = filters.get('scale')
        
        where_clauses = ["1=1"]
        params = []
        if industry:
            where_clauses.append("c.industry = ?")
            params.append(industry)
        if state:
            where_clauses.append("c.headquarters_state = ?")
            params.append(state)
        if city:
            where_clauses.append("c.headquarters_city = ?")
            params.append(city)
            
        where_sql = " AND ".join(where_clauses)
        sql = f"""
            SELECT c.*, 
                   (SELECT COUNT(*) FROM facilities f WHERE f.company_id = c.id) as facility_count
            FROM companies c 
            WHERE {where_sql}
            LIMIT 5000
        """
        companies = query_all(sql, params)
        
        comp_ids = [c['id'] for c in companies]
        if comp_ids:
            p_holders = ','.join(['?'] * len(comp_ids))
            fac_sql = f"""
                SELECT f.*, c.company_name 
                FROM facilities f 
                JOIN companies c ON f.company_id = c.id 
                WHERE f.company_id IN ({p_holders})
            """
            facilities = query_all(fac_sql, comp_ids)
        else:
            facilities = []
            
    if fmt == 'csv':
        csv_bytes = generate_csv_export(companies)
        
        execute_write(
            "INSERT INTO export_history (id, export_type, format, record_count, file_size_bytes) VALUES (?, ?, ?, ?, ?)",
            (os.urandom(4).hex(), 'filtered' if not selected_ids else 'selected', 'csv', len(companies), len(csv_bytes))
        )
        
        return send_file(
            io.BytesIO(csv_bytes),
            mimetype='text/csv',
            as_attachment=True,
            download_name='TRINET_Manufacturers_Export.csv'
        )
    else:
        excel_io = generate_excel_export(companies, facilities)
        
        execute_write(
            "INSERT INTO export_history (id, export_type, format, record_count, file_size_bytes) VALUES (?, ?, ?, ?, ?)",
            (os.urandom(4).hex(), 'filtered' if not selected_ids else 'selected', 'xlsx', len(companies), excel_io.getbuffer().nbytes)
        )
        
        return send_file(
            excel_io,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='TRINET_Manufacturers_Export.xlsx'
        )

# ──────────────────────────────────────
# DISCOVERY API
# ──────────────────────────────────────

@app.route('/api/discovery/start', methods=['POST'])
def start_discovery():
    """
    Trigger a discovery scan for a specific query / geography / industry.
    """
    data = request.get_json() or {}
    query = data.get('query', '').strip()
    state = data.get('state')
    city = data.get('city')
    industry = data.get('industry')
    source = data.get('source', 'GOOGLE_PLACES')
    
    if not query and not (industry and (city or state)):
        return jsonify({"error": "Provide a query or industry+location"}), 400
        
    search_term = query or f"{industry} manufacturers in {city or state}"
    
    result = run_discovery_pipeline(search_term, state=state, city=city, industry=industry, source=source)
    return jsonify(result)

@app.route('/api/discovery/coverage', methods=['GET'])
def get_discovery_coverage():
    """
    Get geographic discovery coverage scores and state-level statistics.
    """
    coverage = query_all("SELECT * FROM discovery_coverage ORDER BY coverage_score DESC")
    logs = query_all("SELECT * FROM discovery_logs ORDER BY searched_at DESC LIMIT 20")
    return jsonify({
        "coverage": coverage,
        "recent_logs": logs
    })

# ──────────────────────────────────────
# STATS & SEARCH METADATA
# ──────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    Dashboard overview numbers and API usage metrics.
    """
    comp_count = query_one("SELECT COUNT(*) as c FROM companies")['c']
    fac_count = query_one("SELECT COUNT(*) as c FROM facilities")['c']
    state_count = query_one("SELECT COUNT(DISTINCT headquarters_state) as c FROM companies WHERE headquarters_state IS NOT NULL")['c']
    city_count = query_one("SELECT COUNT(DISTINCT headquarters_city) as c FROM companies WHERE headquarters_city IS NOT NULL")['c']
    verified_count = query_one("SELECT COUNT(*) as c FROM companies WHERE verification_status = 'VERIFIED'")['c']
    exporter_count = query_one("SELECT COUNT(*) as c FROM companies WHERE is_exporter = 1")['c']
    
    # Scale breakdown
    scale_dist = query_all("SELECT company_scale, COUNT(*) as count FROM companies GROUP BY company_scale")
    
    # Top industries
    industry_dist = query_all("SELECT industry, COUNT(*) as count FROM companies WHERE industry IS NOT NULL GROUP BY industry ORDER BY count DESC LIMIT 10")
    
    # API usage
    api_logs = query_all("SELECT service, COUNT(*) as total_requests, SUM(cached) as cached_requests, SUM(estimated_cost) as total_cost FROM api_usage_logs GROUP BY service")
    
    return jsonify({
        "total_companies": comp_count,
        "total_facilities": fac_count,
        "total_states": state_count,
        "total_cities": city_count,
        "verified_companies": verified_count,
        "exporters": exporter_count,
        "scale_distribution": {s['company_scale']: s['count'] for s in scale_dist if s['company_scale']},
        "top_industries": industry_dist,
        "api_usage": api_logs
    })

@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    """
    Lookup lists for industries, capabilities, states, and cities.
    """
    industries = query_all("SELECT DISTINCT name FROM industries WHERE level = 0 ORDER BY name")
    sub_industries = query_all("SELECT DISTINCT name, parent_id FROM industries WHERE level = 1 ORDER BY name")
    capabilities = query_all("SELECT DISTINCT name FROM capabilities ORDER BY name")
    states = query_all("SELECT DISTINCT headquarters_state as name FROM companies WHERE headquarters_state IS NOT NULL ORDER BY name")
    cities = query_all("SELECT DISTINCT headquarters_city as name, headquarters_state as state FROM companies WHERE headquarters_city IS NOT NULL ORDER BY name")
    
    return jsonify({
        "industries": [i['name'] for i in industries],
        "sub_industries": [s['name'] for s in sub_industries],
        "capabilities": [c['name'] for c in capabilities],
        "states": [s['name'] for s in states],
        "cities": cities
    })

# ──────────────────────────────────────
# APP RUNNER
# ──────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n==================================================")
    print(f"TRINET (TM) - India Manufacturing Intelligence")
    print(f"Server starting on http://127.0.0.1:{port}")
    print(f"==================================================\n")
    app.run(host='0.0.0.0', port=port, debug=True)
