"""
TRINET™ Full Viewport Screenshot Capturer
Captures clean screenshots of every single view: Map Light/Dark, Company Modal, Directory Table, Dashboard.
"""

import os
from playwright.sync_api import sync_playwright

def capture_all_views():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        
        # 1. Light Mode Map
        page.goto('http://127.0.0.1:5000', wait_until='networkidle')
        page.wait_for_timeout(2000)
        os.makedirs('artifacts', exist_ok=True)
        page.screenshot(path='artifacts/preview_light_mode.png')
        print("[1/7] Captured artifacts/preview_light_mode.png")
        
        # 2. Dark Mode Map
        page.click('#theme-toggle-btn')
        page.wait_for_timeout(1000)
        page.screenshot(path='artifacts/preview_dark_mode.png')
        print("[2/7] Captured artifacts/preview_dark_mode.png")
        
        # 3. AI Search (Pharma in Hyderabad)
        page.click('.prompt-chip:has-text("Pharma in Hyderabad")')
        page.wait_for_timeout(2500)
        page.screenshot(path='artifacts/preview_ai_pharma_search.png')
        print("[3/7] Captured artifacts/preview_ai_pharma_search.png")
        
        # 4. Open Company Intelligence Drawer
        first_card = page.query_selector('.result-card-content')
        if first_card:
            first_card.click()
            page.wait_for_timeout(1500)
            page.screenshot(path='artifacts/preview_company_modal.png')
            print("[4/7] Captured artifacts/preview_company_modal.png")
            
            # Close modal
            page.click('#company-modal-close-btn')
            page.wait_for_timeout(500)
            
        # 5. Reset to All India
        page.click('#map-reset-view')
        page.wait_for_timeout(1500)
        page.screenshot(path='artifacts/preview_reset_all_india.png')
        print("[5/7] Captured artifacts/preview_reset_all_india.png")
        
        # 6. Companies Directory Table View
        page.click('#nav-companies-btn')
        page.wait_for_timeout(1500)
        page.screenshot(path='artifacts/preview_companies_directory.png')
        print("[6/7] Captured artifacts/preview_companies_directory.png")
        
        # 7. Coverage Dashboard View
        page.click('#nav-dashboard-btn')
        page.wait_for_timeout(1500)
        page.screenshot(path='artifacts/preview_coverage_dashboard.png')
        print("[7/7] Captured artifacts/preview_coverage_dashboard.png")
        
        browser.close()
        print("\nAll 7 visual viewports captured successfully!")

if __name__ == '__main__':
    capture_all_views()
