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
    'nashik': [73.7898, 19.9975],
    'aurangabad': [75.3433, 19.8762],
    'nagpur': [79.0882, 21.1458],
    'ahmedabad': [72.5714, 23.0225],
    'surat': [72.8311, 21.1702],
    'vadodara': [73.1812, 22.3072],
    'rajkot': [70.8022, 22.3039],
    'chennai': [80.2707, 13.0827],
    'coimbatore': [76.9558, 11.0168],
    'bengaluru': [77.5946, 12.9716],
    'bangalore': [77.5946, 12.9716],
    'hyderabad': [78.4867, 17.3850],
    'gurugram': [77.0266, 28.4595],
    'gurgaon': [77.0266, 28.4595],
    'noida': [77.3910, 28.5355],
    'ludhiana': [75.8573, 30.9010],
    'jamshedpur': [86.2029, 22.8046],
    'kolkata': [88.3639, 22.5726],
    'indore': [75.8577, 22.7196],
    'visakhapatnam': [83.2185, 17.6868],
    'jaipur': [75.7873, 26.9124],
    'baddi': [76.7914, 30.9578]
}

SYSTEM_PROMPT = """You are TRINET AI Search Assistant for Indian Manufacturing.
Your job is to parse natural language queries from users into a structured JSON filter object and map action.

Available Filters:
- industry: One of ["Automotive", "Aerospace & Defence", "Electronics", "Semiconductors", "Pharmaceuticals", "Chemicals", "Textiles", "Food & Beverage", "Steel & Metals", "Machinery", "Industrial Equipment", "Plastics", "Packaging", "Energy Equipment", "Consumer Goods", "Construction Materials", "Furniture", "Medical Devices"] or null.
- state: Full Indian state name (e.g. "Maharashtra", "Gujarat", "Tamil Nadu", "Karnataka", "Telangana", "Haryana", "Punjab", "Uttar Pradesh", "West Bengal", "Rajasthan") or null.
- city: City name (e.g. "Pune", "Hyderabad", "Bengaluru", "Ahmedabad", "Chennai", "Gurugram", "Surat", "Coimbatore", "Ludhiana", "Jamshedpur") or null.
- scale: Array with any of ["MICRO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"] or null.
- minEmployees: integer or null
- maxEmployees: integer or null
- minEstablishmentYear: integer or null
- maxEstablishmentYear: integer or null
- minScaleScore: integer (0-100) or null
- maxScaleScore: integer (0-100) or null
- capability: Manufacturing capability (e.g. "CNC Machining", "Casting", "Forging", "Welding", "Injection Moulding", "Stamping", "Assembly") or null.
- isExporter: true / false / null
- isPublicCompany: true / false / null
- search: generic text query if any, or null

Map Action:
- center: [longitude, latitude] of the target city/state, or null
- zoom: target map zoom level (e.g. 10-12 for city, 6-7 for state, null for national)

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
    q_lower = query.lower()
    filters = {}
    map_action = None
    applied_desc = []
    
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
        'machin': 'Machinery',
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
    for k, v in industry_map.items():
        if k in q_lower:
            filters['industry'] = v
            applied_desc.append(f"Industry: {v}")
            break
            
    # Check cities & map action
    for city_name, coords in CITIES_COORDS.items():
        if city_name in q_lower:
            cap_city = city_name.capitalize()
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
