"""
TRINET (TM) AI Natural Language Search
Translates plain English queries (e.g. 'Pharma factories near Hyderabad with 500+ workers')
into structured filter parameters and map view actions.
"""

import os
import json
import re
from dotenv import load_dotenv

# Load env variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

CITIES_COORDS = {
    'mumbai': [72.8777, 19.0760],
    'pune': [73.8567, 18.5204],
    'chakan': [73.8450, 18.7560],
    'bhosari': [73.8450, 18.6350],
    'pimpri': [73.7997, 18.6298],
    'talegaon': [73.6850, 18.7320],
    'ranjangaon': [74.2450, 18.7980],
    'nashik': [73.7898, 19.9975],
    'aurangabad': [75.3433, 19.8762],
    'nagpur': [79.0882, 21.1458],
    'ahmedabad': [72.5714, 23.0225],
    'sanand': [72.3780, 22.9850],
    'surat': [72.8311, 21.1702],
    'vadodara': [73.1812, 22.3072],
    'rajkot': [70.8022, 22.3039],
    'morbi': [70.8350, 22.8150],
    'jamnagar': [70.0750, 22.4450],
    'vapi': [72.9150, 20.3720],
    'ankleshwar': [73.0050, 21.6280],
    'chennai': [80.2707, 13.0827],
    'coimbatore': [76.9558, 11.0168],
    'hosur': [77.8280, 12.7420],
    'tirupur': [77.3420, 11.1080],
    'bengaluru': [77.5946, 12.9716],
    'bangalore': [77.5946, 12.9716],
    'peenya': [77.5185, 13.0285],
    'belagavi': [74.5250, 15.8650],
    'belgaum': [74.5050, 15.8250],
    'mysuru': [76.6050, 12.3550],
    'hubli': [75.1850, 15.3450],
    'dharwad': [74.9850, 15.4850],
    'hyderabad': [78.4867, 17.3850],
    'visakhapatnam': [83.2185, 17.6868],
    'gurugram': [77.0266, 28.4595],
    'gurgaon': [77.0266, 28.4595],
    'manesar': [76.9380, 28.3580],
    'faridabad': [77.3180, 28.3680],
    'panipat': [76.9850, 29.4050],
    'noida': [77.3910, 28.5355],
    'kanpur': [80.2450, 26.4650],
    'agra': [78.0550, 27.2050],
    'ludhiana': [75.8573, 30.9010],
    'jalandhar': [75.6050, 31.3450],
    'jamshedpur': [86.2029, 22.8046],
    'ranchi': [85.3150, 23.2950],
    'kolkata': [88.3639, 22.5726],
    'indore': [75.8577, 22.7196],
    'pithampur': [75.6850, 22.6150],
    'bhopal': [77.4650, 23.2650],
    'jaipur': [75.7873, 26.9124],
    'neemrana': [76.3850, 27.9850],
    'bhiwadi': [76.8650, 28.2150],
    'baddi': [76.7914, 30.9578],
    'pantnagar': [79.4050, 29.0250],
    'haridwar': [78.0450, 29.9650],
    'dehradun': [77.8550, 30.3650],
    'bhilai': [81.3850, 21.2150],
    'raipur': [81.6050, 21.3050],
    'rourkela': [84.7650, 22.2150],
    'guwahati': [91.6850, 26.1850],
    'kochi': [76.3250, 10.0550],
    'silvassa': [73.0150, 20.2850],
    'goa': [73.9350, 15.3650]
}

SYSTEM_PROMPT = """You are TRINET AI Search Assistant for Indian Manufacturing.
Your job is to parse natural language queries from users into a structured JSON filter object and map action.

Available Filters:
- search: Exact or partial name of factory, company, unit, plant, or specific manufacturer keyword (e.g. "Ace Gears", "Tata Motors", "Bharat Forge", "Thermax", "Kirloskar", "Shree Precision") if searching for a specific enterprise/facility, or null.
- industry: One of ["Automotive", "Aerospace & Defence", "Electronics", "Semiconductors", "Pharmaceuticals", "Chemicals", "Textiles", "Food & Beverage", "Steel & Metals", "Machinery", "Industrial Equipment", "Plastics", "Packaging", "Energy Equipment", "Consumer Goods", "Construction Materials", "Furniture", "Medical Devices"] or null.
- state: Full Indian state name (e.g. "Maharashtra", "Gujarat", "Tamil Nadu", "Karnataka", "Telangana", "Haryana", "Punjab", "Uttar Pradesh", "West Bengal", "Rajasthan") or null.
- city: City name (e.g. "Pune", "Chakan", "Hyderabad", "Bengaluru", "Ahmedabad", "Chennai", "Gurugram", "Manesar", "Surat", "Coimbatore", "Ludhiana", "Jamshedpur") or null.
- scale: Array with any of ["MICRO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"] or null.
- minEmployees: integer or null
- maxEmployees: integer or null
- minEstablishmentYear: integer or null
- maxEstablishmentYear: integer or null
- minScaleScore: integer (0-100) or null
- maxScaleScore: integer (0-100) or null
- capability: Manufacturing capability (e.g. "Fabrication", "CNC Machining", "Casting", "Forging", "Welding", "Injection Moulding", "Stamping", "Assembly") or null.
- isExporter: true / false / null
- isPublicCompany: true / false / null

Map Action:
- center: [longitude, latitude] of the target factory/city/state, or null
- zoom: target map zoom level (e.g. 14-16 for specific factory/plant, 11-12 for city, 6-7 for state, null for national)

Output format must be ONLY raw JSON without markdown code fences:
{
  "filters": { ... },
  "mapAction": { "center": [lng, lat], "zoom": number } or null,
  "explanation": "Clear 1-sentence description of what filters and views were applied.",
  "suggestedFollowUps": ["Question 1", "Question 2"]
}
"""

def rule_based_fallback(query):
    """Fallback NLP parser if AI API fails or key is unavailable."""
    from lib.database import query_one
    q_lower = query.lower()
    filters = {}
    map_action = None
    applied_desc = []
    
    # 0. Check if query is looking for a specific factory or company name directly
    clean_target = re.sub(r'^(find|search for|search|show me|locate|where is|get|look for)\s+', '', query, flags=re.IGNORECASE).strip()
    clean_target = re.sub(r'\s+(factory|plant|facility|works|unit|industries|corp|ltd)$', '', clean_target, flags=re.IGNORECASE).strip()
    
    matched_entity = None
    if len(clean_target) >= 3 and clean_target.lower() not in ['all', 'india', 'manufacturer', 'manufacturers', 'companies', 'factories', 'units', 'plants']:
        matched_entity = query_one("""
            SELECT c.id AS company_id, c.company_name, c.industry, c.headquarters_city, c.headquarters_state,
                   f.id AS facility_id, f.facility_name, f.latitude, f.longitude, f.address, f.city, f.state
            FROM companies c
            LEFT JOIN facilities f ON c.id = f.company_id
            WHERE c.company_name LIKE ? OR c.normalized_name LIKE ? OR f.facility_name LIKE ?
            ORDER BY c.scale_score DESC
            LIMIT 1
        """, (f"%{clean_target}%", f"%{clean_target}%", f"%{clean_target}%"))
        
    if matched_entity and matched_entity.get('latitude') and matched_entity.get('longitude'):
        filters['search'] = clean_target
        if matched_entity.get('industry'):
            filters['industry'] = matched_entity['industry']
        map_action = {
            "center": [matched_entity['longitude'], matched_entity['latitude']],
            "zoom": 14.5
        }
        name_display = matched_entity['facility_name'] or matched_entity['company_name']
        loc_display = matched_entity.get('city') or matched_entity.get('headquarters_city') or 'India'
        explanation = f"Located {name_display} ({matched_entity['company_name']}) in {loc_display}."
        return {
            "filters": filters,
            "mapAction": map_action,
            "explanation": explanation,
            "suggestedFollowUps": [
                f"Show all facilities for {matched_entity['company_name']}",
                f"Show suppliers near {loc_display}",
                "Show verified manufacturers in this region"
            ]
        }
    
    # Check industries
    industry_map = {
        'pharma': 'Pharmaceuticals',
        'pharmaceutical': 'Pharmaceuticals',
        'drug': 'Pharmaceuticals',
        'auto': 'Automotive',
        'automobile': 'Automotive',
        'car': 'Automotive',
        'vehicle': 'Automotive',
        'electronic': 'Electronics',
        'pcb': 'Electronics',
        'semiconductor': 'Semiconductors',
        'chip': 'Semiconductors',
        'chemical': 'Chemicals',
        'textile': 'Textiles',
        'fabric': 'Textiles',
        'cloth': 'Textiles',
        'food': 'Food & Beverage',
        'beverage': 'Food & Beverage',
        'steel': 'Steel & Metals',
        'metal': 'Steel & Metals',
        'iron': 'Steel & Metals',
        'fabricat': 'Steel & Metals',
        'welding': 'Steel & Metals',
        'casting': 'Steel & Metals',
        'foundry': 'Steel & Metals',
        'forg': 'Steel & Metals',
        'machin': 'Machinery',
        'cnc': 'Machinery',
        'equipment': 'Industrial Equipment',
        'pump': 'Industrial Equipment',
        'valve': 'Industrial Equipment',
        'plastic': 'Plastics',
        'packaging': 'Packaging',
        'solar': 'Energy Equipment',
        'power': 'Energy Equipment',
        'cement': 'Construction Materials',
        'tile': 'Construction Materials',
        'medical': 'Medical Devices'
    }
    # Sort by key length descending to prevent sub-string collisions (e.g. 'fabricat' vs 'fabric')
    for k, v in sorted(industry_map.items(), key=lambda x: len(x[0]), reverse=True):
        if k in q_lower:
            filters['industry'] = v
            applied_desc.append(f"Industry: {v}")
            break

    # Check capabilities
    if 'fabricat' in q_lower:
        filters['capability'] = 'Fabrication'
        applied_desc.append("Capability: Fabrication")
    elif 'cnc' in q_lower:
        filters['capability'] = 'CNC Machining'
        applied_desc.append("Capability: CNC Machining")
    elif 'cast' in q_lower:
        filters['capability'] = 'Die Casting'
        applied_desc.append("Capability: Casting")
    elif 'forg' in q_lower:
        filters['capability'] = 'Forging'
        applied_desc.append("Capability: Forging")
            
    # Check cities & map action
    for city_name, coords in CITIES_COORDS.items():
        if city_name in q_lower:
            cap_city = city_name.capitalize()
            # Map Chakan, Bhosari, Talegaon, Pimpri to Pune if searching in db
            if city_name in ['chakan', 'bhosari', 'pimpri', 'talegaon', 'ranjangaon']:
                filters['city'] = 'Pune'
            elif city_name in ['manesar']:
                filters['city'] = 'Gurugram'
            elif city_name in ['sanand']:
                filters['city'] = 'Ahmedabad'
            elif city_name in ['peenya']:
                filters['city'] = 'Bengaluru'
            else:
                filters['city'] = cap_city
            map_action = {"center": coords, "zoom": 12.5}
            applied_desc.append(f"Location: {cap_city}")
            break
            
    # Check scale
    if 'large' in q_lower or 'enterprise' in q_lower:
        filters['scale'] = ['LARGE', 'ENTERPRISE']
        applied_desc.append("Scale: Large / Enterprise")
    elif 'small' in q_lower or 'micro' in q_lower or 'msme' in q_lower:
        filters['scale'] = ['MICRO', 'SMALL']
        applied_desc.append("Scale: Micro / Small")
    elif 'medium' in q_lower:
        filters['scale'] = ['MEDIUM']
        applied_desc.append("Scale: Medium")
        
    # Check exporter
    if 'export' in q_lower:
        filters['isExporter'] = True
        applied_desc.append("Exporters only")
        
    # Check employee counts
    emp_match = re.search(r'(\d+)\+?\s*(?:employees|workers|staff)', q_lower)
    if emp_match:
        filters['minEmployees'] = int(emp_match.group(1))
        applied_desc.append(f"Min Employees: {emp_match.group(1)}")
        
    # If no industry or location was explicitly matched, treat the query as a keyword/factory search
    if not filters.get('industry') and not filters.get('city') and not filters.get('scale') and clean_target:
        filters['search'] = clean_target
        applied_desc.append(f"Factory / Keyword: '{clean_target}'")

    explanation = f"Showing manufacturers matching: {', '.join(applied_desc)}" if applied_desc else f"Searching for '{query}'"
    
    return {
        "filters": filters,
        "mapAction": map_action,
        "explanation": explanation,
        "suggestedFollowUps": [
            "Show only verified manufacturers",
            "Filter by companies with 500+ employees",
            "Show only active exporters"
        ]
    }

def parse_natural_language_search(query, conversation_history=None):
    """
    Parse natural language query with Google Gemini API, with fallback.
    """
    if not GOOGLE_API_KEY or GOOGLE_API_KEY.startswith('your_'):
        return rule_based_fallback(query)
        
    try:
        import google.generativeai as genai
        genai.configure(api_key=GOOGLE_API_KEY)
        
        # Try latest flash model
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction=SYSTEM_PROMPT
        )
        
        prompt = f"User Query: {query}"
        if conversation_history:
            prompt += f"\nPrevious context: {json.dumps(conversation_history[-3:])}"
            
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.1}
        )
        
        text = response.text.strip()
        # Clean up any potential markdown wrap
        if text.startswith('```'):
            text = re.sub(r'^```json\s*|\s*```$', '', text, flags=re.MULTILINE).strip()
            
        data = json.loads(text)
        
        # If city was identified but no center coordinate provided, populate from dictionary
        if data.get('filters', {}).get('city') and not data.get('mapAction'):
            c_name = data['filters']['city'].lower()
            if c_name in CITIES_COORDS:
                data['mapAction'] = {
                    "center": CITIES_COORDS[c_name],
                    "zoom": 11
                }
                
        return data
        
    except Exception as e:
        print(f"Gemini API parse warning ({e}), using rule-based parser fallback.")
        return rule_based_fallback(query)
