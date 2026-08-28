# TRINET™ — India Manufacturing Intelligence & Discovery Platform

TRINET™ is a comprehensive, persistent manufacturing discovery and intelligence platform engineered to discover, map, classify, enrich, and analyze manufacturers and industrial facilities operating across India.

![TRINET Platform](https://img.shields.io/badge/Platform-TRINET%E2%84%A2-00A06C)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask)
![MapLibre](https://img.shields.io/badge/MapLibre_GL-4.7-3969EC?logo=maplibre)
![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?logo=google)
![License](https://img.shields.io/badge/License-Proprietary-red)

---

## 🌟 Key Features

### 1. 🗺️ Interactive India Manufacturing Map (MapLibre GL JS)
* **High-Performance Geospatial Rendering:** WebGL raster & vector rendering centered on India (`[78.9629, 21.5937]`).
* **Dynamic Spatial Clustering:** Real-time clustering with weighted centroids and cluster markers sized by facility density.
* **Verified Land Geocoding:** Every facility is precisely mapped to real-world industrial estates (MIDC, GIDC, SIPCOT, RIICO, SIDCUL, etc.) with accurate PIN codes and on-land coordinates.
* **Industry Color-Coding:** Custom SVG markers color-coded across 18 industrial sectors.
* **Box / Area Selection Tool:** Draw a bounding rectangle over any industrial hub to immediately select and export all factories in that area.

### 2. 🤖 AI Natural Language Search (Google Gemini AI)
* **Conversational Query Parsing:** Converts plain English prompts into structured multi-dimensional map filters.
  * *"Pharma factories in Hyderabad with 500+ workers"*
  * *"Automotive component makers in Pune"*
  * *"Large textile exporters in Gujarat"*
* **Map Action Automation:** Flies the camera directly to the relevant industrial cluster and presents contextual follow-up suggestions.
* **Keyboard Shortcut:** Press `/` anywhere in the app to instantly focus the AI search bar.

### 3. 📊 Dual-Sheet Data Export (Excel & CSV)
* **Client-Side Instant Export (SheetJS):** Instant downloads directly from the browser.
* **Server-Side Streaming Export:** Fast bulk downloads supporting up to thousands of manufacturers.
* **Formatted Excel Workbooks (`.xlsx`):**
  * **Sheet 1 (`Companies`):** Name, Industry, Sub-Industry, City, State, Est. Year, Website, Scale, Scale Score, Employees, Total Facilities, Exporter Status, Public Company Status, Verification Status, Last Updated.
  * **Sheet 2 (`Facilities`):** Company Name, Facility Name, Facility Type, Address, City, State, District, PIN Code, Latitude, Longitude, Phone, Google Rating, Reviews, Operational Status.

### 4. 🎨 Apple-Inspired Design System
* **Fluid Physics & Spring Motion:** Immediate feedback on pointer-down (`scale(0.97)`), interruptible spring curves (`cubic-bezier(0.25, 1, 0.5, 1)`).
* **Translucent Materials:** Glassmorphic navigation and panels with `backdrop-filter: blur(24px) saturate(180%)`.
* **Curated Palette:** TRINET Primary Green (`#00A06C`), Secondary Green (`#8DCCAD`), Neutral Stone (`#D8D2C8`), and Warm Accent (`#F4EBC3`).

### 5. 🏢 Slide-In Company Intelligence Drawer
* **Scale Score Radar (0–100):** Scale scoring based on employee counts, operational footprints, revenue tiers, export presence, and verification status.
* **Interactive Facility Mini-Map:** Mini MapLibre map rendering all mapped physical sites for the selected enterprise.
* **Manufacturing Capabilities:** Tagged capabilities (CNC Machining, Forging, Casting, Stamping, Injection Moulding, etc.).
* **Data Provenance & Traceability:** Auditable data source logs with individual confidence percentages.

### 6. 📈 Discovery Coverage Dashboard
* **National Coverage Score:** Real-time visibility into discovery progress across India's 36 States/UTs.
* **State-by-State Coverage Matrix:** Visual progress bars indicating discovery yield and coverage status.
* **Live Discovery Pipelines:** Trigger automated Google Places API and Apify scraper scans for new industrial regions.

---

## 🏗️ Architecture & Project Structure

```
MSME_FINDER/
├── app.py                      # Flask Application & REST API Server
├── requirements.txt            # Python Dependencies
├── test_system.py              # Automated System Integration Test Suite
├── .env.example                # Environment Variable Template
├── .env.local                  # Local Configuration & API Keys
├── .gitignore                  # Git Ignore Rules
├── database/
│   ├── schema.sql              # 15-Table Relational SQLite Schema with Indexes
│   ├── seed.py                 # Precision Geospatial Seed Generator
│   └── trinet.db               # SQLite Database with WAL Journaling
├── lib/
│   ├── database.py             # SQLite Connection Management & Query Helpers
│   ├── spatial.py              # Haversine Distance, Bounds Filter, & Clustering
│   ├── gemini.py               # Google Gemini NL-to-Filter Query Parser
│   ├── exporter.py             # Multi-Sheet Excel & CSV Exporter
│   ├── google_places.py        # Google Places API (New) Client
│   ├── apify_client.py         # Apify Maps & Web Scraper Integration
│   └── discovery.py            # Discovery Pipeline Orchestrator & Deduplication
├── static/
│   ├── css/
│   │   ├── design-system.css   # Apple-Inspired Tokens, Typography, Materials
│   │   ├── components.css      # UI Components (Buttons, Badges, Cards, Modals)
│   │   ├── layout.css          # Header, Sidebar, Directory, Dashboard Layouts
│   │   └── map.css             # MapLibre Overrides, Markers, Popups, AI Bar
│   └── js/
│       ├── app.js              # State Coordinator, Navigation, Toast Notifications
│       ├── map.js              # MapLibre GL JS Map, WebGL Clusters, Box Selection
│       ├── filters.js          # Multi-Facet Filter State & Dropdown Management
│       ├── results.js          # Infinite Scroll List, Selection, Score Rings
│       ├── search.js           # AI Chat Bar, Suggestions, Keyboard Shortcuts
│       ├── export.js           # Client & Server-Side Excel/CSV Export Handlers
│       ├── company.js          # Slide-In Intelligence Modal & Mini-Map
│       └── dashboard.js        # Coverage Matrix & Live Discovery Runner
└── templates/
    └── index.html              # Main Single Page Application Shell
```

---

## ⚡ Quick Start

### 1. Prerequisites
* Python 3.10+
* Git

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repository_url>
cd MSME_FINDER
pip install -r requirements.txt
```

### 3. Environment Setup
Configure your `.env.local` or `.env` file:
```env
GOOGLE_API_KEY=your_google_gemini_and_places_api_key
APIFY_API_TOKEN=your_apify_api_token
```

### 4. Database Setup
Seed the SQLite database with 500+ manufacturers across 46 Indian industrial hubs:
```bash
python database/seed.py
```

### 5. Run the Application
Start the Flask application server:
```bash
python app.py
```
Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 🧪 Automated Testing

Execute the comprehensive 12-test integration suite:
```bash
python test_system.py
```

Expected output:
```
==================================================
TRINET (TM) Automated Test Suite
==================================================
[PASS] HTML SPA Shell loaded successfully (status 200)
[PASS] All 4 CSS files served correctly
[PASS] All 8 JS modules served correctly
[PASS] Metadata API returned 18 industries and 20 states
[PASS] Stats API: 500 companies, 804 facilities mapped
[PASS] Multi-Filter API: 12 Automotive Large/Enterprise companies found
[PASS] Company Details API: Ace Gears Works (3 mapped sites)
[PASS] Spatial Clustering API: 41 clusters calculated
[PASS] AI NLP Search API: 'Showing manufacturers matching: Industry: Pharmaceuticals, Location: Hyderabad, Min Employees: 500'
[PASS] Excel Export API: Generated 141,168 bytes (.xlsx) with 'Companies' & 'Facilities' sheets
[PASS] CSV Export API: Generated valid CSV stream (501 rows)
[PASS] Discovery Coverage API: 20 states tracked with score matrices
==================================================
>>> ALL 12 TRINET SYSTEM INTEGRATION TESTS PASSED! <<<
==================================================
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /` | `GET` | Main Single Page Application shell |
| `GET /api/companies` | `GET` | Paginated, filterable company directory |
| `GET /api/companies/<id>` | `GET` | Full company intelligence profile & facilities |
| `GET /api/facilities` | `GET` | Bounding-box filtered facilities query |
| `GET /api/facilities/clusters` | `GET` | Server-side spatial clustering for MapLibre |
| `POST /api/ai/search` | `POST` | Natural language query -> structured filter translation |
| `POST /api/export` | `POST` | Dual-sheet Excel (`.xlsx`) or `.csv` export generation |
| `POST /api/discovery/start` | `POST` | Trigger live discovery scanning pipeline |
| `GET /api/discovery/coverage` | `GET` | State-level discovery coverage matrix |
| `GET /api/stats` | `GET` | National database metrics & API usage analytics |
| `GET /api/metadata` | `GET` | Lookup lists for industries, capabilities, and locations |

---

## 📄 License
TRINET™ — Proprietary Intelligence Platform. All rights reserved.
