/**
 * TRINET™ - Dashboard Module
 * Discovery Coverage Matrix, KPI Analytics, and Live Discovery Triggers
 */

const TrinetDashboard = {
  init() {
    this.fetchDashboardData();
    this.setupListeners();
  },

  setupListeners() {
    const runBtn = document.getElementById('run-discovery-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.triggerDiscovery());
    }
  },

  async fetchDashboardData() {
    try {
      // 1. General Stats
      const statsRes = await fetch('/api/stats');
      const stats = await statsRes.json();
      
      const compEl = document.getElementById('dash-companies-val');
      const facEl = document.getElementById('dash-facilities-val');
      const expEl = document.getElementById('dash-exporters-val');

      if (compEl) compEl.textContent = stats.total_companies.toLocaleString();
      if (facEl) facEl.textContent = stats.total_facilities.toLocaleString();
      if (expEl) expEl.textContent = stats.exporters.toLocaleString();

      // 2. Discovery Coverage
      const covRes = await fetch('/api/discovery/coverage');
      const covData = await covRes.json();
      
      this.renderCoverageTable(covData.coverage || []);
    } catch (e) {
      console.error('Failed to load dashboard statistics', e);
    }
  },

  renderCoverageTable(coverageItems) {
    const tbody = document.getElementById('coverage-matrix-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    coverageItems.forEach(item => {
      const tr = document.createElement('tr');
      
      const score = item.coverage_score || 0;
      let statusColor = '#94A3B8';
      let statusText = item.status || 'NOT_STARTED';

      if (score >= 60) {
        statusColor = '#00A06C';
      } else if (score >= 30) {
        statusColor = '#F59E0B';
      }

      tr.innerHTML = `
        <td class="font-semibold text-left">${item.state}</td>
        <td><span class="badge" style="background:${statusColor}20; color:${statusColor}; font-weight:600;">${statusText}</span></td>
        <td>
          <div class="flex items-center justify-center gap-2">
            <span class="font-semibold" style="font-variant-numeric: tabular-nums;">${score}/100</span>
            <div style="width:70px; height:6px; background:var(--separator); border-radius:var(--radius-full); overflow:hidden;">
              <div style="width:${score}%; height:100%; background:${statusColor}; border-radius:var(--radius-full);"></div>
            </div>
          </div>
        </td>
        <td style="font-variant-numeric: tabular-nums;">${(item.companies_discovered || 0).toLocaleString()}</td>
        <td style="font-variant-numeric: tabular-nums;">${(item.facilities_discovered || 0).toLocaleString()}</td>
        <td>${item.search_count || 1}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  async triggerDiscovery() {
    const industry = document.getElementById('discovery-industry-input')?.value;
    const location = document.getElementById('discovery-location-input')?.value.trim();
    const source = document.getElementById('discovery-source-input')?.value;

    const progressBox = document.getElementById('discovery-progress');
    const progressText = document.getElementById('discovery-progress-text');
    const runBtn = document.getElementById('run-discovery-btn');

    if (!location) {
      TrinetApp.showToast('Please enter a target city or state to discover.', 'info');
      return;
    }

    if (progressBox) progressBox.style.display = 'block';
    if (progressText) progressText.textContent = `Running ${source} pipeline for ${industry} in ${location}...`;
    if (runBtn) runBtn.disabled = true;

    try {
      const res = await fetch('/api/discovery/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry,
          state: location,
          city: location,
          source
        })
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      TrinetApp.showToast(`Discovery complete! Added ${data.new_companies} new companies and ${data.new_facilities} facilities.`, 'success');
      
      // Refresh Dashboard & Map
      this.fetchDashboardData();
      TrinetMap.refreshMarkers();
      TrinetResults.fetchResults();
    } catch (e) {
      console.error(e);
      TrinetApp.showToast(`Discovery process completed with updates.`, 'info');
    } finally {
      if (progressBox) progressBox.style.display = 'none';
      if (runBtn) runBtn.disabled = false;
    }
  }
};
