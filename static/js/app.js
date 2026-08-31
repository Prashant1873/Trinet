/**
 * TRINET™ - Main Application Coordinator
 * State orchestration, theme switching, view routing, shortcuts, toasts, and module initialization.
 */

const TrinetApp = {
  currentView: 'map', // 'map' | 'companies' | 'dashboard'
  currentTheme: 'light',

  async init() {
    this.initTheme();
    this.setupViewNavigation();
    this.setupSidebarTabs();
    this.setupSidebarCollapse();
    this.setupKeyboardShortcuts();

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

  // ── Theme Manager ──
  initTheme() {
    const savedTheme = localStorage.getItem('trinet_theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.setTheme(savedTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
      });
    }
  },

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('trinet_theme', theme);

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  },

  setupViewNavigation() {
    document.querySelectorAll('.header-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
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
    const expandBtn = document.getElementById('sidebar-expand-btn');

    if (viewName === 'map') {
      dashboardView.style.display = 'none';
      dashboardView.classList.remove('active');
      mapContainer.style.display = 'block';
      sidebar.style.display = 'flex';
      sidebar.style.width = ''; // Resets smoothly from 100% back to default 420px
      
      if (expandBtn) {
        expandBtn.style.display = sidebar.classList.contains('collapsed') ? 'inline-flex' : 'none';
      }
      setTimeout(() => {
        if (TrinetMap.map) {
          TrinetMap.map.resize();
          TrinetMap.refreshMarkers();
        }
      }, 320);
    } else if (viewName === 'companies') {
      dashboardView.style.display = 'none';
      dashboardView.classList.remove('active');
      mapContainer.style.display = 'block'; // Keep map stable in background
      sidebar.style.display = 'flex';
      sidebar.classList.remove('collapsed'); // Ensure it is uncollapsed
      sidebar.style.width = '100%'; // Smoothly expands across the full viewport
      
      if (expandBtn) {
        expandBtn.style.display = 'none';
      }
      this.switchSidebarTab('results');
    } else if (viewName === 'dashboard') {
      mapContainer.style.display = 'none';
      sidebar.style.display = 'none';
      sidebar.style.width = '';
      if (expandBtn) {
        expandBtn.style.display = 'none';
      }
      dashboardView.style.display = 'block';
      dashboardView.classList.add('active');
      TrinetDashboard.fetchDashboardData();
    }
  },

  setupSidebarTabs() {
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => {
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
    const headerToggleBtn = document.getElementById('header-sidebar-toggle-btn');
    const expandBtn = document.getElementById('sidebar-expand-btn');
    const sidebar = document.getElementById('sidebar');

    const toggleFn = () => {
      if (!sidebar) return;
      if (this.currentView !== 'map') {
        this.switchView('map');
        return;
      }
      const isCollapsed = sidebar.classList.toggle('collapsed');
      
      if (expandBtn) {
        expandBtn.style.display = isCollapsed ? 'inline-flex' : 'none';
      }

      if (typeof lucide !== 'undefined') lucide.createIcons();

      setTimeout(() => {
        TrinetMap.map?.resize();
        TrinetMap.refreshMarkers();
      }, 320);
    };

    headerToggleBtn?.addEventListener('click', toggleFn);
    expandBtn?.addEventListener('click', toggleFn);
  },

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is currently typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
          TrinetCompany.closeModal();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        const input = document.getElementById('ai-chat-input');
        if (input) {
          input.focus();
          input.select();
        }
      } else if (e.key === 'Escape') {
        TrinetCompany.closeModal();
        TrinetMap.cancelSelection();
      } else if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey) {
        this.switchView('map');
      } else if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) {
        this.switchView('companies');
      } else if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey) {
        this.switchView('dashboard');
      } else if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey) {
        const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
      }
    });
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
      toast.style.animation = 'toast-out 250ms var(--ease-spring) forwards';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  TrinetApp.init();
});
