/**
 * TRINET (TM) - Main Application Coordinator
 * State orchestration, view switching, toasts, and module initialization
 */

const TrinetApp = {
  currentView: 'map', // 'map' | 'companies' | 'dashboard'

  async init() {
    this.setupViewNavigation();
    this.setupSidebarTabs();
    this.setupSidebarCollapse();

    // Initialize Submodules
    await TrinetFilters.init();
    TrinetMap.init();
    TrinetResults.init();
    TrinetSearch.init();
    TrinetExport.init();
    TrinetCompany.init();
    TrinetDashboard.init();

    this.fetchGlobalStats();
  },

  setupViewNavigation() {
    // Header navigation buttons
    document.querySelectorAll('.header-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });
  },

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.header-nav-item').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === viewName);
    });

    const mapContainer = document.getElementById('map-container');
    const sidebar = document.getElementById('sidebar');
    const dashboardView = document.getElementById('dashboard-view');

    if (viewName === 'map') {
      mapContainer.style.display = 'block';
      sidebar.style.display = 'flex';
      sidebar.style.width = ''; // Reset from 100% back to default CSS variable
      dashboardView.classList.remove('active');
      setTimeout(() => {
        if (TrinetMap.map) {
          TrinetMap.map.resize();
          TrinetMap.refreshMarkers();
        }
      }, 150);
    } else if (viewName === 'companies') {
      mapContainer.style.display = 'none';
      sidebar.style.display = 'flex';
      sidebar.style.width = '100%';
      dashboardView.classList.remove('active');
      this.switchSidebarTab('results');
    } else if (viewName === 'dashboard') {
      mapContainer.style.display = 'none';
      sidebar.style.display = 'none';
      sidebar.style.width = '';
      dashboardView.classList.add('active');
      TrinetDashboard.fetchDashboardData();
    }
  },

  setupSidebarTabs() {
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = tab.getAttribute('data-tab');
        this.switchSidebarTab(targetTab);
      });
    });
  },

  switchSidebarTab(tabName) {
    document.querySelectorAll('.sidebar-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    });

    const resultsPanel = document.getElementById('results-panel');
    const filterPanel = document.getElementById('filter-panel');

    if (tabName === 'results') {
      resultsPanel.style.display = 'flex';
      filterPanel.style.display = 'none';
    } else {
      resultsPanel.style.display = 'none';
      filterPanel.style.display = 'block';
    }
  },

  setupSidebarCollapse() {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        if (toggleIcon) {
          toggleIcon.setAttribute('data-lucide', isCollapsed ? 'chevron-right' : 'chevron-left');
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        setTimeout(() => {
          TrinetMap.map?.resize();
        }, 350);
      });
    }
  },

  async fetchGlobalStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      
      const compEl = document.getElementById('stat-companies-count');
      const facEl = document.getElementById('stat-facilities-count');
      const stateEl = document.getElementById('stat-states-count');

      if (compEl) compEl.textContent = data.total_companies.toLocaleString();
      if (facEl) facEl.textContent = data.total_facilities.toLocaleString();
      if (stateEl) stateEl.textContent = data.total_states.toLocaleString();
    } catch (e) {
      console.error('Stats loading failed', e);
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-out 300ms cubic-bezier(0.25, 1, 0.5, 1) forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  TrinetApp.init();
});
