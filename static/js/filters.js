/**
 * TRINET (TM) - Filters Module
 * Multi-dimensional filter management, state sync, and active chips UI
 */

const TrinetFilters = {
  state: {
    search: '',
    industry: '',
    state: '',
    city: '',
    capability: '',
    scale: [],
    minScore: 0,
    isExporter: null,
    isPublic: null,
    verification: null
  },

  metadata: {
    industries: [],
    capabilities: [],
    states: [],
    cities: []
  },

  async init() {
    await this.fetchMetadata();
    this.setupListeners();
    this.renderDropdowns();
  },

  async fetchMetadata() {
    try {
      const res = await fetch('/api/metadata');
      this.metadata = await res.json();
    } catch (e) {
      console.error('Failed to load filter metadata', e);
    }
  },

  renderDropdowns() {
    // Populate Industries
    const indSelect = document.getElementById('filter-industry');
    if (indSelect) {
      this.metadata.industries.forEach(ind => {
        const opt = document.createElement('option');
        opt.value = ind;
        opt.textContent = ind;
        indSelect.appendChild(opt);
      });
    }

    // Populate States
    const stateSelect = document.getElementById('filter-state');
    if (stateSelect) {
      this.metadata.states.forEach(st => {
        const opt = document.createElement('option');
        opt.value = st;
        opt.textContent = st;
        stateSelect.appendChild(opt);
      });
    }

    // Populate Cities
    const citySelect = document.getElementById('filter-city');
    if (citySelect) {
      this.metadata.cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name} (${c.state})`;
        citySelect.appendChild(opt);
      });
    }

    // Populate Capabilities
    const capSelect = document.getElementById('filter-capability');
    if (capSelect) {
      this.metadata.capabilities.forEach(cap => {
        const opt = document.createElement('option');
        opt.value = cap;
        opt.textContent = cap;
        capSelect.appendChild(opt);
      });
    }
  },

  setupListeners() {
    // Collapsible filter section disclosures
    document.querySelectorAll('.filter-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.filter-section');
        section.classList.toggle('collapsed');
      });
    });

    // Score Slider
    const scoreSlider = document.getElementById('filter-min-score');
    const scoreVal = document.getElementById('score-slider-val');
    if (scoreSlider && scoreVal) {
      scoreSlider.addEventListener('input', (e) => {
        scoreVal.textContent = e.target.value;
        this.state.minScore = parseInt(e.target.value) || 0;
      });
    }

    // Apply & Reset Buttons
    const applyBtn = document.getElementById('apply-filters-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.readFilterValues();
        this.applyFilters();
      });
    }

    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetFilters());
    }

    // Direct change handlers for immediate reactivity
    document.getElementById('filter-industry')?.addEventListener('change', (e) => {
      this.state.industry = e.target.value;
      this.applyFilters();
    });

    document.getElementById('filter-state')?.addEventListener('change', (e) => {
      this.state.state = e.target.value;
      this.applyFilters();
    });

    document.getElementById('filter-city')?.addEventListener('change', (e) => {
      this.state.city = e.target.value;
      this.applyFilters();
    });

    document.querySelectorAll('.filter-scale-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        this.readScaleCheckboxes();
        this.applyFilters();
      });
    });
  },

  readScaleCheckboxes() {
    const checked = [];
    document.querySelectorAll('.filter-scale-checkbox:checked').forEach(cb => {
      checked.push(cb.value);
    });
    this.state.scale = checked;
  },

  readFilterValues() {
    this.state.industry = document.getElementById('filter-industry')?.value || '';
    this.state.state = document.getElementById('filter-state')?.value || '';
    this.state.city = document.getElementById('filter-city')?.value || '';
    this.state.capability = document.getElementById('filter-capability')?.value || '';
    this.state.isExporter = document.getElementById('filter-exporter')?.checked ? true : null;
    this.state.isPublic = document.getElementById('filter-public')?.checked ? true : null;
    this.state.verification = document.getElementById('filter-verified')?.checked ? 'VERIFIED' : null;
    this.readScaleCheckboxes();
  },

  applyFilters() {
    this.renderActiveChips();
    this.syncLegendActive();
    if (typeof TrinetResults !== 'undefined') TrinetResults.fetchResults(1);
    if (typeof TrinetMap !== 'undefined') TrinetMap.refreshMarkers(false);
  },

  syncLegendActive() {
    const activeInd = (this.state.industry || '').trim().toLowerCase();
    document.querySelectorAll('.legend-item').forEach(item => {
      const itemInd = (item.getAttribute('data-industry') || '').trim().toLowerCase();
      if (activeInd && (itemInd === activeInd || activeInd.includes(itemInd) || itemInd.includes(activeInd))) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  setIndustry(industry) {
    this.state.industry = industry || '';
    const el = document.getElementById('filter-industry');
    if (el) el.value = this.state.industry;
    this.applyFilters();
  },

  setFiltersFromAI(aiFilters) {
    if (!aiFilters) return;

    if (aiFilters.industry !== undefined) {
      this.state.industry = aiFilters.industry || '';
      const el = document.getElementById('filter-industry');
      if (el) el.value = this.state.industry;
    }

    if (aiFilters.state !== undefined) {
      this.state.state = aiFilters.state || '';
      const el = document.getElementById('filter-state');
      if (el) el.value = this.state.state;
    }

    if (aiFilters.city !== undefined) {
      this.state.city = aiFilters.city || '';
      const el = document.getElementById('filter-city');
      if (el) el.value = this.state.city;
    }

    if (aiFilters.scale) {
      this.state.scale = Array.isArray(aiFilters.scale) ? aiFilters.scale : [aiFilters.scale];
      document.querySelectorAll('.filter-scale-checkbox').forEach(cb => {
        cb.checked = this.state.scale.includes(cb.value);
      });
    }

    if (aiFilters.minScaleScore !== undefined) {
      this.state.minScore = aiFilters.minScaleScore || 0;
      const el = document.getElementById('filter-min-score');
      const valEl = document.getElementById('score-slider-val');
      if (el) el.value = this.state.minScore;
      if (valEl) valEl.textContent = this.state.minScore;
    }

    if (aiFilters.isExporter !== undefined) {
      this.state.isExporter = aiFilters.isExporter;
      const el = document.getElementById('filter-exporter');
      if (el) el.checked = !!aiFilters.isExporter;
    }

    if (aiFilters.search !== undefined) {
      this.state.search = aiFilters.search || '';
    }

    this.applyFilters();
  },

  renderActiveChips() {
    const container = document.getElementById('active-filters-container');
    const badge = document.getElementById('active-filters-badge');
    if (!container) return;

    container.innerHTML = '';
    const activeList = [];

    if (this.state.search) activeList.push({ key: 'search', label: `Search / Factory: "${this.state.search}"` });
    if (this.state.industry) activeList.push({ key: 'industry', label: `Industry: ${this.state.industry}` });
    if (this.state.state) activeList.push({ key: 'state', label: `State: ${this.state.state}` });
    if (this.state.city) activeList.push({ key: 'city', label: `City: ${this.state.city}` });
    if (this.state.capability) activeList.push({ key: 'capability', label: `Cap: ${this.state.capability}` });
    if (this.state.scale && this.state.scale.length > 0) activeList.push({ key: 'scale', label: `Scale: ${this.state.scale.join(', ')}` });
    if (this.state.minScore > 0) activeList.push({ key: 'minScore', label: `Score >= ${this.state.minScore}` });
    if (this.state.isExporter) activeList.push({ key: 'isExporter', label: 'Exporters' });
    if (this.state.isPublic) activeList.push({ key: 'isPublic', label: 'Public Listed' });
    if (this.state.verification) activeList.push({ key: 'verification', label: 'Verified Only' });

    activeList.forEach(item => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `
        ${item.label}
        <button class="chip-remove" data-key="${item.key}">✕</button>
      `;
      chip.querySelector('.chip-remove').addEventListener('click', () => {
        this.clearFilterKey(item.key);
      });
      container.appendChild(chip);
    });

    if (activeList.length > 0) {
      const clearAllBtn = document.createElement('button');
      clearAllBtn.className = 'filters-clear-all';
      clearAllBtn.textContent = 'Clear All';
      clearAllBtn.addEventListener('click', () => this.resetFilters());
      container.appendChild(clearAllBtn);

      if (badge) {
        badge.textContent = activeList.length;
        badge.style.display = 'inline-block';
      }
    } else {
      if (badge) badge.style.display = 'none';
    }
  },

  clearFilterKey(key) {
    if (key === 'search') {
      this.state.search = '';
    } else if (key === 'industry') {
      this.state.industry = '';
      const el = document.getElementById('filter-industry');
      if (el) el.value = '';
    } else if (key === 'state') {
      this.state.state = '';
      const el = document.getElementById('filter-state');
      if (el) el.value = '';
    } else if (key === 'city') {
      this.state.city = '';
      const el = document.getElementById('filter-city');
      if (el) el.value = '';
    } else if (key === 'capability') {
      this.state.capability = '';
      const el = document.getElementById('filter-capability');
      if (el) el.value = '';
    } else if (key === 'scale') {
      this.state.scale = [];
      document.querySelectorAll('.filter-scale-checkbox').forEach(cb => cb.checked = false);
    } else if (key === 'minScore') {
      this.state.minScore = 0;
      const el = document.getElementById('filter-min-score');
      const val = document.getElementById('score-slider-val');
      if (el) el.value = 0;
      if (val) val.textContent = '0';
    } else if (key === 'isExporter') {
      this.state.isExporter = null;
      const el = document.getElementById('filter-exporter');
      if (el) el.checked = false;
    } else if (key === 'isPublic') {
      this.state.isPublic = null;
      const el = document.getElementById('filter-public');
      if (el) el.checked = false;
    } else if (key === 'verification') {
      this.state.verification = null;
      const el = document.getElementById('filter-verified');
      if (el) el.checked = false;
    }

    this.applyFilters();
  },

  resetFilters() {
    this.state = {
      search: '',
      industry: '',
      state: '',
      city: '',
      capability: '',
      scale: [],
      minScore: 0,
      isExporter: null,
      isPublic: null,
      verification: null
    };

    document.querySelectorAll('#filter-panel select').forEach(s => s.value = '');
    document.querySelectorAll('#filter-panel input[type="checkbox"]').forEach(c => c.checked = false);
    const scoreEl = document.getElementById('filter-min-score');
    if (scoreEl) scoreEl.value = 0;
    const scoreVal = document.getElementById('score-slider-val');
    if (scoreVal) scoreVal.textContent = '0';

    this.applyFilters();
  },

  getFilterPayload() {
    const payload = {};
    if (this.state.search) payload.search = this.state.search;
    if (this.state.industry) payload.industry = this.state.industry;
    if (this.state.state) payload.state = this.state.state;
    if (this.state.city) payload.city = this.state.city;
    if (this.state.capability) payload.capability = this.state.capability;
    if (this.state.scale && this.state.scale.length > 0) payload.scale = this.state.scale.join(',');
    if (this.state.minScore > 0) payload.min_score = this.state.minScore;
    if (this.state.isExporter) payload.is_exporter = true;
    if (this.state.isPublic) payload.is_public = true;
    if (this.state.verification) payload.verification = this.state.verification;
    return payload;
  }
};
