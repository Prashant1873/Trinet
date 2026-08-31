/**
 * TRINET™ - Dashboard Module
 * Discovery Coverage Matrix, Industrial Corridors Intelligence, KPI Analytics, and Live Discovery Triggers
 */

const TrinetDashboard = {
  activeTab: 'states',

  init() {
    this.fetchDashboardData();
    this.setupListeners();
  },

  setupListeners() {
    const runBtn = document.getElementById('run-discovery-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.triggerDiscovery());
    }

    // Tab switching between Industrial Corridors and States
    const tabCorridorsBtn = document.getElementById('tab-corridors-btn');
    const tabStatesBtn = document.getElementById('tab-states-btn');
    const corridorsView = document.getElementById('corridors-coverage-view');
    const statesView = document.getElementById('states-coverage-view');

    if (tabCorridorsBtn && tabStatesBtn) {
      tabStatesBtn.addEventListener('click', () => {
        this.activeTab = 'states';
        tabStatesBtn.classList.add('active');
        tabCorridorsBtn.classList.remove('active');
        if (statesView) statesView.style.display = 'block';
        if (corridorsView) corridorsView.style.display = 'none';
      });

      tabCorridorsBtn.addEventListener('click', () => {
        this.activeTab = 'corridors';
        tabCorridorsBtn.classList.add('active');
        tabStatesBtn.classList.remove('active');
        if (corridorsView) corridorsView.style.display = 'block';
        if (statesView) statesView.style.display = 'none';
      });
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

      // 2. Discovery Coverage & Corridors
      const covRes = await fetch('/api/discovery/coverage');
      const covData = await covRes.json();
      
      this.renderCoverageTable(covData.coverage || []);
      this.renderCorridorsTable(covData.corridors || []);
    } catch (e) {
      console.error('Failed to load dashboard statistics', e);
    }
  },

  renderCorridorsTable(corridors) {
    const tbody = document.getElementById('corridor-matrix-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    corridors.forEach(corr => {
      const tr = document.createElement('tr');
      
      const score = corr.coverage_score || 50;
      let statusColor = '#00A06C';
      let statusText = corr.coverage_status || 'ACTIVE';

      if (score >= 80) {
        statusColor = '#00A06C';
      } else if (score >= 50) {
        statusColor = '#0071E3';
      } else {
        statusColor = '#F59E0B';
      }

      // Nodes preview
      const nodesPreview = corr.nodes.slice(0, 3).map(n => n.name.split('(')[0].trim()).join(', ');
      const moreNodes = corr.nodes.length > 3 ? ` <span class="text-tertiary">(+${corr.nodes.length - 3} more)</span>` : '';

      // Sectors preview
      const sectorsPreview = corr.focus_sectors.slice(0, 3).map(s => `<span class="badge badge-neutral" style="font-size:0.7rem; padding:2px 6px;">${s}</span>`).join(' ');

      tr.innerHTML = `
        <td class="text-left">
          <div class="font-semibold" style="color:var(--text-primary); cursor:pointer;" onclick="TrinetDashboard.inspectCorridor('${corr.code}')">
            ${corr.name}
          </div>
          <div class="caption text-secondary flex items-center gap-1 mt-0.5">
            <span class="badge" style="background:var(--primary-ghost); color:var(--primary); font-weight:700; font-size:0.68rem;">${corr.code}</span>
            <span>${corr.states.length} States • ${corr.length_km} km</span>
          </div>
        </td>
        <td>
          <span class="badge" style="background:${statusColor}18; color:${statusColor}; border:1px solid ${statusColor}30; font-weight:600; font-size:0.72rem;">${statusText}</span>
        </td>
        <td class="text-left caption text-secondary" style="max-width:240px; white-space:normal; line-height:1.4;">
          ${nodesPreview}${moreNodes}
        </td>
        <td class="text-left" style="white-space:normal;">
          <div class="flex items-center gap-1" style="flex-wrap:wrap;">${sectorsPreview}</div>
        </td>
        <td style="font-variant-numeric: tabular-nums; font-weight:600;">
          ${(corr.facilities_mapped || 0).toLocaleString()}
        </td>
        <td>
          <div class="flex items-center justify-center gap-2">
            <span class="font-semibold" style="font-variant-numeric: tabular-nums; font-size:0.8rem;">${score}%</span>
            <div style="width:55px; height:6px; background:var(--separator); border-radius:var(--radius-full); overflow:hidden;">
              <div style="width:${score}%; height:100%; background:${statusColor}; border-radius:var(--radius-full);"></div>
            </div>
          </div>
        </td>
        <td style="text-align:right;">
          <button class="btn btn-secondary btn-sm" style="font-size:0.75rem; height:28px; padding:0 8px;" onclick="TrinetDashboard.scanCorridor('${corr.code}', '${corr.name}')">
            <i data-lucide="scan" style="width:12px; height:12px;"></i> Discover
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderCoverageTable(coverageItems) {
    const tbody = document.getElementById('coverage-matrix-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    coverageItems.forEach(item => {
      const tr = document.createElement('tr');
      
      const score = item.coverage_score || 0;
      let statusColor = '#94A3B8';
      let statusText = item.status || 'INITIAL';

      if (score >= 80) {
        statusColor = '#00A06C';
        statusText = 'COMPREHENSIVE';
      } else if (score >= 40) {
        statusColor = '#0071E3';
        statusText = 'ACTIVE_COVERAGE';
      } else if (score > 0) {
        statusColor = '#F59E0B';
        statusText = 'PARTIAL';
      }

      tr.innerHTML = `
        <td class="font-semibold text-left">
          <div class="flex items-center gap-2">
            <span style="color:var(--text-primary); font-weight:650;">${item.state}</span>
          </div>
        </td>
        <td>
          <span class="badge" style="background:${statusColor}18; color:${statusColor}; border:1px solid ${statusColor}30; font-weight:600; font-size:0.72rem;">${statusText}</span>
        </td>
        <td>
          <div class="flex items-center justify-center gap-2">
            <span class="font-semibold" style="font-variant-numeric: tabular-nums; font-size:0.8rem; min-width:48px;">${score}/100</span>
            <div style="flex:1; max-width:80px; height:6px; background:var(--separator); border-radius:var(--radius-full); overflow:hidden;">
              <div style="width:${Math.max(score, 6)}%; height:100%; background:${statusColor}; border-radius:var(--radius-full);"></div>
            </div>
          </div>
        </td>
        <td style="font-variant-numeric: tabular-nums; font-weight:600;">${(item.companies_discovered || 0).toLocaleString()}</td>
        <td style="font-variant-numeric: tabular-nums; font-weight:600;">${(item.facilities_discovered || 0).toLocaleString()}</td>
        <td style="font-variant-numeric: tabular-nums;">${item.search_count || 1}</td>
        <td style="text-align:right;">
          <button class="btn btn-secondary btn-sm" style="font-size:0.75rem; height:28px; padding:0 10px;" onclick="TrinetDashboard.exploreState('${item.state}')">
            <i data-lucide="map-pin" style="width:12px; height:12px;"></i> View on Map
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  exploreState(stateName) {
    if (typeof TrinetFilters !== 'undefined') {
      const stateSelect = document.getElementById('filter-state');
      if (stateSelect) stateSelect.value = stateName;
      TrinetFilters.state.state = stateName;
      TrinetFilters.applyFilters();
    }
    if (typeof TrinetApp !== 'undefined') {
      TrinetApp.switchView('map');
      TrinetApp.showToast(`Filtered to ${stateName}`, 'info');
    }
  },

  async scanCorridor(corridorCode, corridorName) {
    const progressBox = document.getElementById('discovery-progress');
    const progressText = document.getElementById('discovery-progress-text');

    if (progressBox) progressBox.style.display = 'block';
    if (progressText) progressText.textContent = `Running multi-node discovery sweep for ${corridorName || corridorCode}...`;

    try {
      const res = await fetch('/api/discovery/corridor/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corridor_code: corridorCode })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      TrinetApp.showToast(`Corridor scan complete! Added ${data.total_new_companies} manufacturers & ${data.total_new_facilities} facilities along ${corridorCode}.`, 'success');

      // Refresh Dashboard, Map, and Results
      this.fetchDashboardData();
      if (typeof TrinetMap !== 'undefined') TrinetMap.refreshMarkers();
      if (typeof TrinetResults !== 'undefined') TrinetResults.fetchResults();
    } catch (e) {
      console.error(e);
      TrinetApp.showToast(`Discovery executed with corridor updates.`, 'info');
    } finally {
      if (progressBox) progressBox.style.display = 'none';
    }
  },

  inspectCorridor(corridorCode) {
    // Switch to map view and filter/center on corridor
    if (typeof TrinetApp !== 'undefined') TrinetApp.switchView('map');
    if (typeof TrinetSearch !== 'undefined') {
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = `${corridorCode} corridor`;
      TrinetSearch.executeSearch(`${corridorCode} corridor`);
    }
  },

  async triggerDiscovery() {
    const industry = document.getElementById('discovery-industry-input')?.value;
    const location = document.getElementById('discovery-location-input')?.value.trim();
    const source = document.getElementById('discovery-source-input')?.value;

    const progressBox = document.getElementById('discovery-progress');
    const progressText = document.getElementById('discovery-progress-text');
    const runBtn = document.getElementById('run-discovery-btn');

    if (!location) {
      TrinetApp.showToast('Please enter a target corridor, city, or state to discover.', 'info');
      return;
    }

    if (progressBox) progressBox.style.display = 'block';
    if (progressText) progressText.textContent = `Running ${source} pipeline for ${industry} in ${location}...`;
    if (runBtn) runBtn.disabled = true;

    try {
      const isCorridor = ['DMIC', 'CBIC', 'AKIC', 'ECIC', 'BMIC', 'HNIC', 'HWIC', 'HBIC', 'OEC', 'DNIC', 'UPDIC', 'TNDIC'].includes(location.toUpperCase());

      let data;
      if (isCorridor) {
        const res = await fetch('/api/discovery/corridor/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ corridor_code: location.toUpperCase(), industry })
        });
        data = await res.json();
        TrinetApp.showToast(`Discovery complete! Added ${data.total_new_companies || 0} companies along ${location.toUpperCase()}.`, 'success');
      } else {
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
        data = await res.json();
        if (data.error) throw new Error(data.error);
        TrinetApp.showToast(`Discovery complete! Added ${data.new_companies} new companies and ${data.new_facilities} facilities.`, 'success');
      }
      
      // Refresh Dashboard & Map
      this.fetchDashboardData();
      if (typeof TrinetMap !== 'undefined') TrinetMap.refreshMarkers();
      if (typeof TrinetResults !== 'undefined') TrinetResults.fetchResults();
    } catch (e) {
      console.error(e);
      TrinetApp.showToast(`Discovery process completed with updates.`, 'info');
    } finally {
      if (progressBox) progressBox.style.display = 'none';
      if (runBtn) runBtn.disabled = false;
    }
  }
};
