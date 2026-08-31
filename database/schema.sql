-- TRINET™ Database Schema
-- India Manufacturing Intelligence & Discovery Platform
-- SQLite3

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ──────────────────────────────────────
-- CORE ENTITIES
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    website TEXT,
    domain TEXT,
    establishment_year INTEGER,
    headquarters_city TEXT,
    headquarters_state TEXT,
    industry TEXT,
    sub_industry TEXT,
    employee_count INTEGER,
    employee_count_estimated INTEGER DEFAULT 0,
    estimated_revenue TEXT,
    company_scale TEXT CHECK(company_scale IN ('MICRO','SMALL','MEDIUM','LARGE','ENTERPRISE')),
    scale_score INTEGER CHECK(scale_score >= 0 AND scale_score <= 100),
    company_description TEXT,
    verification_status TEXT DEFAULT 'UNVERIFIED' CHECK(verification_status IN ('UNVERIFIED','PARTIALLY_VERIFIED','VERIFIED')),
    is_exporter INTEGER DEFAULT 0,
    is_public_company INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_enriched_at TEXT
);

CREATE INDEX idx_companies_state ON companies(headquarters_state);
CREATE INDEX idx_companies_city ON companies(headquarters_city);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_scale ON companies(company_scale);
CREATE INDEX idx_companies_score ON companies(scale_score);
CREATE INDEX idx_companies_year ON companies(establishment_year);
CREATE INDEX idx_companies_normalized ON companies(normalized_name);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_verification ON companies(verification_status);

CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    facility_name TEXT,
    facility_type TEXT CHECK(facility_type IN ('FACTORY','PLANT','ASSEMBLY','PROCESSING','FABRICATION','WAREHOUSE','HQ','RND','OTHER')),
    address TEXT,
    city TEXT,
    state TEXT,
    district TEXT,
    pincode TEXT,
    latitude REAL,
    longitude REAL,
    google_place_id TEXT UNIQUE,
    google_maps_url TEXT,
    email TEXT,
    phone TEXT,
    google_rating REAL,
    review_count INTEGER,
    operational_status TEXT DEFAULT 'ACTIVE' CHECK(operational_status IN ('ACTIVE','INACTIVE','UNKNOWN')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_facilities_company ON facilities(company_id);
CREATE INDEX idx_facilities_city ON facilities(city);
CREATE INDEX idx_facilities_state ON facilities(state);
CREATE INDEX idx_facilities_lat_lng ON facilities(latitude, longitude);
CREATE INDEX idx_facilities_place_id ON facilities(google_place_id);
CREATE INDEX idx_facilities_type ON facilities(facility_type);
CREATE INDEX idx_facilities_status ON facilities(operational_status);

-- ──────────────────────────────────────
-- TAXONOMY
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS industries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id TEXT,
    level INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES industries(id)
);

CREATE TABLE IF NOT EXISTS capabilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT
);

-- ──────────────────────────────────────
-- MANY-TO-MANY RELATIONS
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_industries (
    company_id TEXT NOT NULL,
    industry_id TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.5,
    PRIMARY KEY (company_id, industry_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS company_capabilities (
    company_id TEXT NOT NULL,
    capability_id TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    PRIMARY KEY (company_id, capability_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (capability_id) REFERENCES capabilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS company_products (
    company_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    PRIMARY KEY (company_id, product_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────
-- DATA PROVENANCE
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_sources (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('company','facility')),
    entity_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_url TEXT,
    source_name TEXT,
    data_field TEXT NOT NULL,
    data_value TEXT,
    retrieved_at TEXT DEFAULT (datetime('now')),
    confidence_score REAL DEFAULT 0.5 CHECK(confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX idx_sources_entity ON data_sources(entity_type, entity_id);

-- ──────────────────────────────────────
-- DISCOVERY & SEARCH
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_cache (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    query TEXT NOT NULL,
    geographic_area TEXT,
    query_hash TEXT NOT NULL,
    response_data TEXT,
    result_count INTEGER DEFAULT 0,
    searched_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
);

CREATE UNIQUE INDEX idx_cache_hash ON search_cache(query_hash);

CREATE TABLE IF NOT EXISTS discovery_logs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    query TEXT NOT NULL,
    geographic_area TEXT,
    industry TEXT,
    searched_at TEXT DEFAULT (datetime('now')),
    results_count INTEGER DEFAULT 0,
    new_companies INTEGER DEFAULT 0,
    new_facilities INTEGER DEFAULT 0,
    duplicates_detected INTEGER DEFAULT 0,
    status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')),
    error_message TEXT,
    duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS discovery_coverage (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    city TEXT,
    industry TEXT,
    status TEXT DEFAULT 'NOT_STARTED' CHECK(status IN ('NOT_STARTED','IN_PROGRESS','PARTIALLY_COVERED','INITIAL_COVERAGE','NEEDS_REFRESH')),
    coverage_score INTEGER DEFAULT 0 CHECK(coverage_score >= 0 AND coverage_score <= 100),
    last_searched_at TEXT,
    search_count INTEGER DEFAULT 0,
    companies_discovered INTEGER DEFAULT 0,
    facilities_discovered INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX idx_coverage_unique ON discovery_coverage(state, COALESCE(city,''), COALESCE(industry,''));

-- ──────────────────────────────────────
-- DEDUPLICATION
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id TEXT PRIMARY KEY,
    company_a_id TEXT NOT NULL,
    company_b_id TEXT NOT NULL,
    similarity_score REAL NOT NULL,
    match_signals TEXT, -- JSON: which fields matched
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','MERGED','NOT_DUPLICATE','SKIPPED')),
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_a_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (company_b_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_duplicates_status ON duplicate_candidates(status);

-- ──────────────────────────────────────
-- API USAGE & EXPORT
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_usage_logs (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    endpoint TEXT,
    requested_at TEXT DEFAULT (datetime('now')),
    success INTEGER DEFAULT 1,
    cached INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    estimated_cost REAL,
    error_message TEXT
);

CREATE INDEX idx_api_usage_service ON api_usage_logs(service, requested_at);

CREATE TABLE IF NOT EXISTS export_history (
    id TEXT PRIMARY KEY,
    export_type TEXT NOT NULL,
    format TEXT NOT NULL,
    record_count INTEGER,
    filters_applied TEXT, -- JSON
    file_size_bytes INTEGER,
    exported_at TEXT DEFAULT (datetime('now'))
);
