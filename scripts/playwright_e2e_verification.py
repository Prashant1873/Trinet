"""
TRINET™ Comprehensive Playwright E2E Verification Suite
Executes all verification items in the plan using the Chromium browser.
"""

import sys
from playwright.sync_api import sync_playwright

PHARMA_VALID_KEYWORDS = [
    'pharma', 'laboratories', 'labs', 'biotech', 'formulations', 'remedies', 
    'therapeutics', 'healthcare', 'drugs', 'medisciences', 'biopharma', 'life sciences', 'api'
]
PHARMA_INVALID_KEYWORDS = ['paint', 'cement', 'castings', 'gears', 'foundry', 'flour']

AUTO_VALID_KEYWORDS = [
    'motors', 'automotive', 'auto', 'drivetrain', 'mobility', 'forge', 'brakes', 
    'transmissions', 'engine', 'vehicle', 'chassis'
]

def run_playwright_verification():
    print("==================================================================")
    print("TRINET™ Comprehensive Playwright Browser Verification Suite")
    print("==================================================================")
    
    passed_tests = 0
    total_tests = 0
    
    def log_result(test_name, success, details=""):
        nonlocal passed_tests, total_tests
        total_tests += 1
        if success:
            passed_tests += 1
            print(f"  [PASS] {test_name} {details}")
        else:
            print(f"  [FAIL] {test_name} {details}")
            
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        
        # ---------------------------------------------------------
        # TEST 1: Page Load & Initial State Integrity
        # ---------------------------------------------------------
        print("\n[STEP 1] Testing Initial Page Load & Component Hierarchy...")
        page.goto('http://127.0.0.1:5000', wait_until='networkidle')
        page.wait_for_timeout(1500)
        
        title = page.title()
        log_result("Page Title Verification", "TRINET" in title, f"('{title}')")
        
        results_count_el = page.query_selector('#results-count-display')
        results_count = results_count_el.inner_text() if results_count_el else "0"
        log_result("Manufacturer Count Initialization", results_count.replace(',', '') == "2615", f"(Count: {results_count})")
        
        map_el = page.query_selector('#map')
        log_result("Map Container Initialized", map_el is not None)
        
        # ---------------------------------------------------------
        # TEST 2: Sector Taxonomy & Filtering Semantic Integrity (Pharmaceuticals)
        # ---------------------------------------------------------
        print("\n[STEP 2] Testing Sector Taxonomy Semantic Integrity (Pharmaceuticals)...")
        pharma_legend = page.query_selector('.legend-item[data-industry="Pharmaceuticals"]')
        if pharma_legend:
            with page.expect_response(lambda r: '/api/companies' in r.url and r.status == 200):
                pharma_legend.click()
            page.wait_for_timeout(1000)
            
            cards = page.query_selector_all('.result-card-content')
            all_cards_valid = True
            card_names = []
            for card in cards[:10]:
                text = card.inner_text().lower()
                card_names.append(text.split('\n')[0])
                has_valid = any(kw in text for kw in PHARMA_VALID_KEYWORDS)
                has_invalid = any(kw in text for kw in PHARMA_INVALID_KEYWORDS)
                if not has_valid or has_invalid:
                    all_cards_valid = False
                    
            log_result("Pharma Industry Filtering Semantic Integrity", all_cards_valid, f"(Sample: {', '.join(card_names[:3])})")
            
        # ---------------------------------------------------------
        # TEST 3: Automotive Sector Semantic Integrity
        # ---------------------------------------------------------
        print("\n[STEP 3] Testing Sector Taxonomy Semantic Integrity (Automotive)...")
        auto_legend = page.query_selector('.legend-item[data-industry="Automotive"]')
        if auto_legend:
            with page.expect_response(lambda r: '/api/companies' in r.url and r.status == 200):
                auto_legend.click()
            page.wait_for_timeout(1000)
            
            cards = page.query_selector_all('.result-card-content')
            auto_valid = True
            auto_sample = []
            for card in cards[:10]:
                text = card.inner_text().lower()
                auto_sample.append(text.split('\n')[0])
                if not any(kw in text for kw in AUTO_VALID_KEYWORDS):
                    auto_valid = False
            log_result("Automotive Sector Filtering Semantic Integrity", auto_valid, f"(Sample: {', '.join(auto_sample[:3])})")

        # ---------------------------------------------------------
        # TEST 4: Reset to All India Map Action
        # ---------------------------------------------------------
        print("\n[STEP 4] Testing 'Reset to All India' Camera & Filter Reset...")
        reset_btn = page.query_selector('#map-reset-view')
        if reset_btn:
            with page.expect_response(lambda r: '/api/companies' in r.url and r.status == 200):
                reset_btn.click()
            page.wait_for_timeout(1500)
            
            count_after_reset = page.query_selector('#results-count-display').inner_text()
            log_result("Reset View Restores Total Database Count", count_after_reset.replace(',', '') == "2615", f"(Count: {count_after_reset})")
            
            active_chips = page.query_selector_all('.filter-chip')
            log_result("Reset View Clears Active Filter Chips", len(active_chips) == 0, f"(Active Chips: {len(active_chips)})")

        # ---------------------------------------------------------
        # TEST 5: AI Natural Language Search & Specific Factory Finding (MYPOL in Mysore)
        # ---------------------------------------------------------
        print("\n[STEP 5] Testing AI Natural Language Search (MYPOL in Mysore)...")
        ai_input = page.query_selector('#ai-chat-input')
        ai_submit = page.query_selector('#ai-chat-submit-btn')
        if ai_input and ai_submit:
            ai_input.fill("mypol in mysore")
            with page.expect_response(lambda r: '/api/ai/search' in r.url and r.status == 200):
                ai_submit.click()
            
            page.wait_for_selector('.result-card-content:has-text("MYPOL")', timeout=6000)
            mypol_card = page.query_selector('.result-card-content:has-text("MYPOL")')
            log_result("AI Search matches 'mypol in mysore'", mypol_card is not None, f"({mypol_card.inner_text().split('\n')[0] if mypol_card else ''})")

        # ---------------------------------------------------------
        # TEST 6: Quick Prompt Chips (Pharma in Hyderabad)
        # ---------------------------------------------------------
        print("\n[STEP 6] Testing Quick Prompt Chip ('Pharma in Hyderabad')...")
        pharma_chip = page.query_selector('.prompt-chip:has-text("Pharma in Hyderabad")')
        if pharma_chip:
            with page.expect_response(lambda r: '/api/ai/search' in r.url and r.status == 200):
                pharma_chip.click()
            
            page.wait_for_selector('.result-card-content:has-text("Dr. Reddy")', timeout=6000)
            dr_reddy_card = page.query_selector('.result-card-content:has-text("Dr. Reddy")')
            log_result("AI Quick Prompt 'Pharma in Hyderabad' Filters Correctly", dr_reddy_card is not None, f"({dr_reddy_card.inner_text().split('\n')[0] if dr_reddy_card else ''})")

        # ---------------------------------------------------------
        # TEST 7: Company Intelligence Modal Drawer & Radar Chart
        # ---------------------------------------------------------
        print("\n[STEP 7] Testing Company Intelligence Drawer & Radar Chart...")
        first_card = page.query_selector('.result-card-content')
        if first_card:
            first_card.click()
            page.wait_for_selector('#company-profile-modal.active', timeout=5000)
            page.wait_for_timeout(1000)
            
            modal = page.query_selector('#company-profile-modal')
            modal_has_active = 'active' in modal.get_attribute('class')
            log_result("Company Modal Opens on Click", modal_has_active)
            
            radar_svg = page.query_selector('#modal-radar-chart svg')
            log_result("Enterprise Capability Radar Chart Rendered", radar_svg is not None)
            
            mini_map = page.query_selector('#company-minimap')
            log_result("Facility Mini-Map Rendered", mini_map is not None)
            
            # Close modal
            close_btn = page.query_selector('#company-modal-close-btn')
            if close_btn:
                close_btn.click()
                page.wait_for_timeout(500)
                modal_closed = 'active' not in modal.get_attribute('class')
                log_result("Company Modal Closes on Dismiss", modal_closed)

        # ---------------------------------------------------------
        # TEST 8: Theme Switching & Contrast
        # ---------------------------------------------------------
        print("\n[STEP 8] Testing Dark / Light Theme Toggle...")
        theme_btn = page.query_selector('#theme-toggle-btn')
        if theme_btn:
            theme_btn.click() # Dark mode
            page.wait_for_timeout(500)
            theme_dark = page.evaluate("document.documentElement.getAttribute('data-theme') === 'dark'")
            log_result("Theme Toggled to Dark Mode", theme_dark)
            
            theme_btn.click() # Light mode
            page.wait_for_timeout(500)
            theme_light = page.evaluate("document.documentElement.getAttribute('data-theme') === 'light'")
            log_result("Theme Toggled Back to Light Mode", theme_light)

        # ---------------------------------------------------------
        # TEST 9: View Switching (Companies Directory & Coverage Dashboard)
        # ---------------------------------------------------------
        print("\n[STEP 9] Testing View Switching across Navigation Tabs...")
        # Reset to all india first
        with page.expect_response(lambda r: '/api/companies' in r.url and r.status == 200):
            page.click('#map-reset-view')
        page.wait_for_timeout(1000)
        
        # Companies Directory View
        companies_btn = page.query_selector('#nav-companies-btn')
        if companies_btn:
            companies_btn.click()
            page.wait_for_timeout(1000)
            is_companies_active = page.evaluate("document.getElementById('sidebar').style.width === '100%'")
            log_result("Companies Directory Fullscreen View Switched", is_companies_active)
            
        # Coverage Dashboard View
        dashboard_btn = page.query_selector('#nav-dashboard-btn')
        if dashboard_btn:
            with page.expect_response(lambda r: '/api/discovery/coverage' in r.url and r.status == 200):
                dashboard_btn.click()
            page.wait_for_timeout(1000)
            dash_companies = page.query_selector('#dash-companies-val').inner_text()
            dash_facilities = page.query_selector('#dash-facilities-val').inner_text()
            log_result("Coverage Dashboard Active with Live Metrics", dash_companies.replace(',', '') == "2615" and dash_facilities.replace(',', '') == "4414", f"({dash_companies} companies, {dash_facilities} facilities)")
            
        # Map View Restore
        map_btn = page.query_selector('#nav-map-btn')
        if map_btn:
            map_btn.click()
            page.wait_for_timeout(1000)
            is_map_active = page.evaluate("document.getElementById('map-container').style.display === 'block'")
            log_result("Map View Restored Successfully", is_map_active)
            
        browser.close()
        
    print("\n==================================================================")
    print(f"Results: {passed_tests} Passed, {total_tests - passed_tests} Failed (Total: {total_tests})")
    print("==================================================================")
    
    return total_tests > 0 and passed_tests == total_tests

if __name__ == '__main__':
    success = run_playwright_verification()
    sys.exit(0 if success else 1)
