"""
TRINET™ — National & Defence Industrial Corridors Registry
Defines India's 13 Major Industrial Corridors (NICDC National Corridors + Defence Corridors),
key smart cities/nodes, focus manufacturing sectors, and real-time coverage aggregations.
"""

# Registry of 11 National Industrial Corridors (NICDC) + 2 Defence Industrial Corridors (UPDIC & TNDIC)
INDUSTRIAL_CORRIDORS = [
    {
        "code": "DMIC",
        "name": "Delhi-Mumbai Industrial Corridor",
        "authority": "NICDC / DMICDC",
        "length_km": 1504,
        "states": ["Delhi", "Haryana", "Rajasthan", "Madhya Pradesh", "Gujarat", "Maharashtra"],
        "nodes": [
            {"name": "Dholera Special Investment Region (SIR)", "city": "Ahmedabad", "state": "Gujarat", "lat": 22.2450, "lng": 72.1950, "status": "Operational Smart City"},
            {"name": "AURIC (Shendra-Bidkin Industrial Park)", "city": "Aurangabad", "state": "Maharashtra", "lat": 19.8780, "lng": 75.4850, "status": "Operational Smart City"},
            {"name": "IMT Manesar - Bawal Industrial Node", "city": "Gurugram", "state": "Haryana", "lat": 28.3580, "lng": 76.9380, "status": "Active Hub"},
            {"name": "Neemrana Japanese Zone & Khushkhera", "city": "Bhiwadi", "state": "Rajasthan", "lat": 27.9850, "lng": 76.3850, "status": "Active Hub"},
            {"name": "Integrated Industrial Township Greater Noida (IITGN)", "city": "Noida", "state": "Uttar Pradesh", "lat": 28.5355, "lng": 77.3910, "status": "Operational"},
            {"name": "Sanand GIDC Industrial Corridor", "city": "Ahmedabad", "state": "Gujarat", "lat": 22.9850, "lng": 72.3780, "status": "Active Hub"},
            {"name": "Pithampur Auto & Pharma Corridor", "city": "Indore", "state": "Madhya Pradesh", "lat": 22.6078, "lng": 75.6944, "status": "Active Hub"},
            {"name": "Dighi Port Industrial Area", "city": "Mumbai", "state": "Maharashtra", "lat": 18.2950, "lng": 72.9850, "status": "Approved Node"},
            {"name": "Chakan - Talegaon Auto Corridor", "city": "Pune", "state": "Maharashtra", "lat": 18.7560, "lng": 73.8450, "status": "Active Hub"}
        ],
        "focus_sectors": ["Automotive", "Electronics", "Precision Engineering", "Chemicals", "Pharmaceuticals"],
        "description": "India's flagship corridor connecting Delhi NCR to Mumbai ports, anchored by Western Dedicated Freight Corridor (WDFC).",
        "centroid": [74.5000, 23.5000],
        "zoom": 6
    },
    {
        "code": "CBIC",
        "name": "Chennai-Bengaluru Industrial Corridor",
        "authority": "NICDC / JICA Supported",
        "length_km": 560,
        "states": ["Tamil Nadu", "Karnataka", "Andhra Pradesh"],
        "nodes": [
            {"name": "Sriperumbudur - Oragadam Industrial Node", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9690, "lng": 79.9480, "status": "Active Hub"},
            {"name": "Tumakuru Industrial Smart City (Vasanthanarasapura)", "city": "Bengaluru", "state": "Karnataka", "lat": 13.3450, "lng": 77.1050, "status": "Nearing Completion"},
            {"name": "Krishnapatnam Industrial Node", "city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 14.2850, "lng": 80.0850, "status": "Under Implementation"},
            {"name": "Ponneri Industrial Smart City", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.3250, "lng": 80.1950, "status": "Under Implementation"},
            {"name": "Hosur SIPCOT Manufacturing Zone", "city": "Hosur", "state": "Tamil Nadu", "lat": 12.7480, "lng": 77.8420, "status": "Active Hub"},
            {"name": "Peenya & Bommasandra Industrial Areas", "city": "Bengaluru", "state": "Karnataka", "lat": 13.0285, "lng": 77.5185, "status": "Active Hub"}
        ],
        "focus_sectors": ["Aerospace & Defence", "Automotive", "EV Components", "Electronics", "Machinery"],
        "description": "Pivotal southern manufacturing corridor linking Chennai port infrastructure to Bengaluru's tech and R&D capital.",
        "centroid": [78.8000, 13.0000],
        "zoom": 7
    },
    {
        "code": "AKIC",
        "name": "Amritsar-Kolkata Industrial Corridor",
        "authority": "NICDC",
        "length_km": 1839,
        "states": ["Punjab", "Haryana", "Uttarakhand", "Uttar Pradesh", "Bihar", "Jharkhand", "West Bengal"],
        "nodes": [
            {"name": "Rajpura-Patiala Industrial Smart Node", "city": "Ludhiana", "state": "Punjab", "lat": 30.4850, "lng": 76.5950, "status": "Approved Smart City"},
            {"name": "Khurpia Farm Industrial Node", "city": "Rudrapur", "state": "Uttarakhand", "lat": 28.9880, "lng": 79.4150, "status": "Approved Smart City"},
            {"name": "Agra Integrated Industrial Hub", "city": "Agra", "state": "Uttar Pradesh", "lat": 27.2050, "lng": 78.0550, "status": "Approved Node"},
            {"name": "Prayagraj Industrial Hub (Saraswati City)", "city": "Kanpur", "state": "Uttar Pradesh", "lat": 25.4350, "lng": 81.8450, "status": "Approved Node"},
            {"name": "Gaya Integrated Manufacturing Cluster (IMC)", "city": "Ranchi", "state": "Bihar", "lat": 24.7950, "lng": 85.0050, "status": "Approved Smart City"},
            {"name": "Raghunathpur / Durgapur Industrial Zone", "city": "Kolkata", "state": "West Bengal", "lat": 23.5250, "lng": 87.3150, "status": "Under Development"},
            {"name": "Adityapur Industrial Area", "city": "Jamshedpur", "state": "Jharkhand", "lat": 22.7880, "lng": 86.1550, "status": "Active Hub"}
        ],
        "focus_sectors": ["Steel & Metals", "Machinery", "Chemicals", "Agro-Processing", "Textiles"],
        "description": "Traverses 7 northern and eastern states along the Eastern Dedicated Freight Corridor (EDFC).",
        "centroid": [81.5000, 26.0000],
        "zoom": 6
    },
    {
        "code": "ECIC",
        "name": "East Coast Economic Corridor (Vizag-Chennai VCIC)",
        "authority": "NICDC / ADB Supported",
        "length_km": 800,
        "states": ["Andhra Pradesh", "Tamil Nadu", "Odisha"],
        "nodes": [
            {"name": "Visakhapatnam Autonagar & Duvvada Corridor", "city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6980, "lng": 83.1950, "status": "Active Hub"},
            {"name": "Kopparthy Industrial Smart City", "city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 14.4850, "lng": 78.7850, "status": "Approved Smart City"},
            {"name": "Orvakal Mega Industrial Hub (Kurnool)", "city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 15.6850, "lng": 78.2150, "status": "Approved Smart City"},
            {"name": "Kakinada Petroleum & Petrochemicals Region", "city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 16.9850, "lng": 82.2450, "status": "Active Hub"}
        ],
        "focus_sectors": ["Petrochemicals", "Pharmaceuticals", "Electronics", "Steel & Metals", "Port Equipment"],
        "description": "India's first coastal corridor extending along the Bay of Bengal, linking major deepwater ports to Southeast Asian supply chains.",
        "centroid": [81.5000, 15.5000],
        "zoom": 6.5
    },
    {
        "code": "BMIC",
        "name": "Bengaluru-Mumbai Industrial Corridor (BMEC)",
        "authority": "NICDC / UK Partnered",
        "length_km": 1000,
        "states": ["Karnataka", "Maharashtra"],
        "nodes": [
            {"name": "Dharwad-Belur Industrial Area", "city": "Hubli-Dharwad", "state": "Karnataka", "lat": 15.4850, "lng": 74.9850, "status": "Active Node"},
            {"name": "Belagavi Precision Engineering Cluster (Udyambag)", "city": "Belgaum", "state": "Karnataka", "lat": 15.8250, "lng": 74.5050, "status": "Active Hub"},
            {"name": "Pune-Chakan-Talegaon-Bhosari MIDC Belt", "city": "Pune", "state": "Maharashtra", "lat": 18.6350, "lng": 73.8450, "status": "Active Hub"},
            {"name": "Satara-Kolhapur Foundries & Machining Cluster", "city": "Pune", "state": "Maharashtra", "lat": 16.7050, "lng": 74.2450, "status": "Active Node"},
            {"name": "Mumbai TTC & Taloja Chemical/Engg Zone", "city": "Mumbai", "state": "Maharashtra", "lat": 19.0680, "lng": 73.1250, "status": "Active Hub"}
        ],
        "focus_sectors": ["Automotive", "Industrial Equipment", "Precision Tooling", "Polymers & Rubber", "Machinery"],
        "description": "Connects peninsular India's twin mega-industrial powerhouses through the Konkan-Deccan manufacturing heartland.",
        "centroid": [74.5000, 16.5000],
        "zoom": 6.5
    },
    {
        "code": "CBIC-Kochi",
        "name": "CBIC Extension to Kochi via Coimbatore",
        "authority": "NICDC",
        "length_km": 360,
        "states": ["Tamil Nadu", "Kerala"],
        "nodes": [
            {"name": "Coimbatore SIDCO & Kurichi Machining Cluster", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 10.9420, "lng": 76.9750, "status": "Active Hub"},
            {"name": "Palakkad Integrated Industrial Smart City (Pudussery)", "city": "Kochi", "state": "Kerala", "lat": 10.7850, "lng": 76.7250, "status": "Approved Smart City"},
            {"name": "Kochi Kalamassery & Edayar Industrial Belt", "city": "Kochi", "state": "Kerala", "lat": 10.0520, "lng": 76.3250, "status": "Active Hub"},
            {"name": "Tirupur Apparel & Technical Textiles Cluster", "city": "Tirupur", "state": "Tamil Nadu", "lat": 11.1350, "lng": 77.3850, "status": "Active Hub"}
        ],
        "focus_sectors": ["Machinery", "Food & Beverage", "Medical Devices", "Textiles", "Chemicals"],
        "description": "Extends CBIC to the Arabian Sea through the Palghat gap, serving high-value engineering, agro, and port logistics.",
        "centroid": [76.7000, 10.6000],
        "zoom": 7.5
    },
    {
        "code": "HNIC",
        "name": "Hyderabad-Nagpur Industrial Corridor",
        "authority": "NICDC",
        "length_km": 500,
        "states": ["Telangana", "Maharashtra"],
        "nodes": [
            {"name": "Medchal & Jeedimetla Industrial Corridor", "city": "Hyderabad", "state": "Telangana", "lat": 17.5250, "lng": 78.4480, "status": "Active Hub"},
            {"name": "Adilabad Regional Manufacturing Cluster", "city": "Hyderabad", "state": "Telangana", "lat": 19.6650, "lng": 78.5350, "status": "Under Planning"},
            {"name": "Butibori & Hingna MIDC Heavy Engineering Park", "city": "Nagpur", "state": "Maharashtra", "lat": 20.9250, "lng": 78.9950, "status": "Active Hub"}
        ],
        "focus_sectors": ["Pharmaceuticals", "Steel & Metals", "Defence Electronics", "Machinery"],
        "description": "Central north-south axis uniting Telangana pharma and electronics clusters with Vidarbha heavy engineering.",
        "centroid": [78.7000, 19.3000],
        "zoom": 7
    },
    {
        "code": "HWIC",
        "name": "Hyderabad-Warangal Industrial Corridor",
        "authority": "Telangana State / NICDC",
        "length_km": 150,
        "states": ["Telangana"],
        "nodes": [
            {"name": "Cherlapally & Nacharam IDA", "city": "Hyderabad", "state": "Telangana", "lat": 17.4720, "lng": 78.6010, "status": "Active Hub"},
            {"name": "Kakatiya Mega Textile Park (KMTP), Warangal", "city": "Hyderabad", "state": "Telangana", "lat": 17.9650, "lng": 79.5950, "status": "Operational Park"},
            {"name": "Genome Valley Biotech SEZ, Shameerpet", "city": "Hyderabad", "state": "Telangana", "lat": 17.6520, "lng": 78.6050, "status": "Active Hub"}
        ],
        "focus_sectors": ["Textiles", "Pharmaceuticals", "Biotechnology", "Electronics"],
        "description": "Dedicated bio-pharma and mega-textile corridor connecting the state capital with regional manufacturing nodes.",
        "centroid": [79.0000, 17.7000],
        "zoom": 8.5
    },
    {
        "code": "HBIC",
        "name": "Hyderabad-Bengaluru Industrial Corridor",
        "authority": "NICDC",
        "length_km": 570,
        "states": ["Telangana", "Andhra Pradesh", "Karnataka"],
        "nodes": [
            {"name": "Zaheerabad National Investment & Mfg Zone (NIMZ)", "city": "Hyderabad", "state": "Telangana", "lat": 17.6850, "lng": 77.6150, "status": "Approved Smart City"},
            {"name": "Kurnool (Orvakal) Solar & Machinery Cluster", "city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 15.6850, "lng": 78.2150, "status": "Active Node"},
            {"name": "Pashamylaram & Patancheru Industrial Belt", "city": "Hyderabad", "state": "Telangana", "lat": 17.5320, "lng": 78.2640, "status": "Active Hub"},
            {"name": "Jigani & Electronic City High-Tech Belt", "city": "Bengaluru", "state": "Karnataka", "lat": 12.7840, "lng": 77.6320, "status": "Active Hub"}
        ],
        "focus_sectors": ["Automotive", "Electronics", "Energy Equipment", "Forgings & Castings"],
        "description": "Connects two premier innovation and hardware capitals through semi-arid industrial development zones.",
        "centroid": [77.8000, 15.0000],
        "zoom": 7
    },
    {
        "code": "OEC",
        "name": "Odisha Economic Corridor",
        "authority": "NICDC / IPICOL",
        "length_km": 600,
        "states": ["Odisha"],
        "nodes": [
            {"name": "Kalinganagar National Steel & Metallurgy Hub", "city": "Rourkela", "state": "Odisha", "lat": 20.9550, "lng": 86.0150, "status": "Active Hub"},
            {"name": "Paradip Petroleum, Chemical & Port Zone", "city": "Rourkela", "state": "Odisha", "lat": 20.2950, "lng": 86.6850, "status": "Active Hub"},
            {"name": "Kalunga & Rourkela Heavy Steel Estate", "city": "Rourkela", "state": "Odisha", "lat": 22.2150, "lng": 84.7650, "status": "Active Hub"},
            {"name": "Gopalpur Multi-Product SEZ", "city": "Rourkela", "state": "Odisha", "lat": 19.2650, "lng": 84.9150, "status": "Operational Park"}
        ],
        "focus_sectors": ["Steel & Metals", "Chemicals", "Heavy Equipment", "Mineral Processing"],
        "description": "Mineral-rich metallurgical powerhouse supplying raw alloy, specialty steel, and heavy structures across India.",
        "centroid": [85.5000, 20.5000],
        "zoom": 7.5
    },
    {
        "code": "DNIC",
        "name": "Delhi-Nagpur Industrial Corridor",
        "authority": "NICDC",
        "length_km": 1050,
        "states": ["Delhi", "Haryana", "Uttar Pradesh", "Madhya Pradesh", "Maharashtra"],
        "nodes": [
            {"name": "Faridabad Sector 24/58 Industrial Area", "city": "Faridabad", "state": "Haryana", "lat": 28.3280, "lng": 77.3380, "status": "Active Hub"},
            {"name": "Gwalior - Malanpur Industrial Area", "city": "Agra", "state": "Madhya Pradesh", "lat": 26.3550, "lng": 78.2950, "status": "Active Node"},
            {"name": "Govindpura & Mandideep Industrial Area", "city": "Bhopal", "state": "Madhya Pradesh", "lat": 23.0850, "lng": 77.5150, "status": "Active Hub"},
            {"name": "Vikram Udyogpuri (Ujjain)", "city": "Indore", "state": "Madhya Pradesh", "lat": 23.2150, "lng": 75.8250, "status": "Operational Smart City"}
        ],
        "focus_sectors": ["Energy Equipment", "Machinery", "Auto Components", "Transformers & Switchgear"],
        "description": "Heartland power and energy manufacturing corridor providing central electrical equipment grid integration.",
        "centroid": [77.5000, 25.0000],
        "zoom": 6.5
    },
    {
        "code": "UPDIC",
        "name": "Uttar Pradesh Defence Industrial Corridor",
        "authority": "UPEIDA / Ministry of Defence",
        "length_km": 1100,
        "states": ["Uttar Pradesh"],
        "nodes": [
            {"name": "Lucknow Aerospace & UAV Cluster", "city": "Kanpur", "state": "Uttar Pradesh", "lat": 26.8467, "lng": 80.9462, "status": "Active Defence Node"},
            {"name": "Kanpur Small Arms & Heavy Military Hardware Hub (Panki)", "city": "Kanpur", "state": "Uttar Pradesh", "lat": 26.4650, "lng": 80.2450, "status": "Active Defence Node"},
            {"name": "Agra Precision Castings & Military Systems Node", "city": "Agra", "state": "Uttar Pradesh", "lat": 27.2050, "lng": 78.0550, "status": "Active Defence Node"},
            {"name": "Aligarh Defence Hardware & Lock Components Node", "city": "Noida", "state": "Uttar Pradesh", "lat": 27.8974, "lng": 78.0880, "status": "Active Defence Node"},
            {"name": "Jhansi Heavy Armour & Ammunition Node", "city": "Kanpur", "state": "Uttar Pradesh", "lat": 25.4484, "lng": 78.5685, "status": "Under Implementation"},
            {"name": "Chitrakoot Defence Explosives & Propellant Node", "city": "Kanpur", "state": "Uttar Pradesh", "lat": 25.2150, "lng": 80.9150, "status": "Under Implementation"}
        ],
        "focus_sectors": ["Aerospace & Defence", "Machinery", "Steel & Metals", "Electronics"],
        "description": "Strategic 6-node state-wide defence manufacturing ecosystem backed by UPEIDA and BrahMos/HAL/DRDO anchors.",
        "centroid": [80.0000, 26.5000],
        "zoom": 7
    },
    {
        "code": "TNDIC",
        "name": "Tamil Nadu Defence Industrial Corridor",
        "authority": "TIDCO / Ministry of Defence",
        "length_km": 850,
        "states": ["Tamil Nadu"],
        "nodes": [
            {"name": "Chennai Avadi & Guindy Defence Heavy Vehicles Node", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0980, "lng": 80.1620, "status": "Active Defence Node"},
            {"name": "Coimbatore Precision Defence Component Machining Node", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0280, "lng": 76.9920, "status": "Active Defence Node"},
            {"name": "Hosur SIPCOT Missile & Drone Systems Node", "city": "Hosur", "state": "Tamil Nadu", "lat": 12.7480, "lng": 77.8420, "status": "Active Defence Node"},
            {"name": "Salem Special Steel & Armour Fabrication Node", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.6643, "lng": 78.1460, "status": "Active Defence Node"},
            {"name": "Tiruchirappalli Heavy Ordnance & Boiler Fabrication Node", "city": "Chennai", "state": "Tamil Nadu", "lat": 10.7905, "lng": 78.7047, "status": "Active Defence Node"}
        ],
        "focus_sectors": ["Aerospace & Defence", "Precision Machining", "Special Alloys", "Electronics"],
        "description": "5-node southern defence ecosystem supplying precision avionics, heavy armoured fighting vehicles, and missile components.",
        "centroid": [78.2000, 11.8000],
        "zoom": 7.5
    }
]

def get_all_corridors_with_stats():
    """
    Computes real-time coverage, company counts, and facility counts across each corridor
    based on the database contents.
    """
    from lib.database import query_one, query_all
    corridors_data = []

    for corr in INDUSTRIAL_CORRIDORS:
        cities = list(set([n['city'] for n in corr['nodes']]))
        states = corr['states']

        # Query companies within the corridor's cities/states
        city_placeholders = ','.join(['?'] * len(cities))
        state_placeholders = ','.join(['?'] * len(states))

        sql_comp = f"""
            SELECT COUNT(DISTINCT c.id) as count 
            FROM companies c
            WHERE c.headquarters_city IN ({city_placeholders}) 
               OR c.headquarters_state IN ({state_placeholders})
        """
        params_comp = cities + states
        comp_res = query_one(sql_comp, params_comp)
        comp_count = comp_res['count'] if comp_res else 0

        # Query facilities in corridor cities
        sql_fac = f"""
            SELECT COUNT(f.id) as count 
            FROM facilities f
            WHERE f.city IN ({city_placeholders}) 
               OR f.state IN ({state_placeholders})
        """
        fac_res = query_one(sql_fac, params_comp)
        fac_count = fac_res['count'] if fac_res else 0

        # Compute dynamic coverage score based on facilities and smart nodes
        node_count = len(corr['nodes'])
        coverage_score = min(98, max(42, int((fac_count / (node_count * 15)) * 80) + 25))

        status = 'FULLY_MAPPED' if coverage_score >= 80 else ('ACTIVE_DISCOVERY' if coverage_score >= 50 else 'INITIAL_COVERAGE')

        corridors_data.append({
            **corr,
            "companies_discovered": comp_count,
            "facilities_mapped": fac_count,
            "node_count": node_count,
            "coverage_score": coverage_score,
            "coverage_status": status
        })

    return corridors_data
