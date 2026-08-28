/**
 * TRINET (TM) - Results Module
 * Infinite scrolling manufacturer cards, selection checkboxes, sorting, and score badges
 */

const TrinetResults = {
  companies: [],
  selectedCompanyIds: new Set(),
  currentPage: 1,
  totalPages: 1,
  isLoading: false,
  currentSort: 'scale_score',
  currentSortDir: 'desc',

  init() {
    // Sort dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [col, dir] = e.target.value.split(':');
        this.currentSort = col;
        this.currentSortDir = dir || 'desc';
        this.fetchResults(1);
      });
    }

    // Select all page checkbox
    const selectAllCb = document.getElementById('select-all-checkbox');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', (e) => {
        const checked = e.target.checked;
        this.companies.forEach(c => {
          if (checked) this.selectedCompanyIds.add(c.id);
          else this.selectedCompanyIds.delete(c.id);
        });
        this.updateSelectionUI();
      });
    }

    // Clear selection
    const clearSelBtn = document.getElementById('clear-selection-btn');
    if (clearSelBtn) {
      clearSelBtn.addEventListener('click', () => {
        this.selectedCompanyIds.clear();
        this.updateSelectionUI();
      });
    }

    // Infinite scroll listener
    const container = document.getElementById('results-list-container');
    if (container) {
      container.addEventListener('scroll', () => {
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
          if (!this.isLoading && this.currentPage < this.totalPages) {
            this.fetchResults(this.currentPage + 1, true);
          }
        }
      });
    }

    this.fetchResults(1);
  },

  async fetchResults(page = 1, append = false) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.currentPage = page;

    const loadingEl = document.getElementById('results-loading');
    if (loadingEl && !append) loadingEl.style.display = 'block';

    const filters = TrinetFilters.getFilterPayload();
    const queryParams = new URLSearchParams({
      page: page,
      limit: 20,
      sort: this.currentSort,
      dir: this.currentSortDir,
      ...filters
    });

    try {
      const res = await fetch(`/api/companies?${queryParams}`);
      const json = await res.json();

      this.totalPages = json.pagination.total_pages || 1;
      const totalCount = json.pagination.total || 0;

      // Update counters
      document.getElementById('results-count-display').textContent = totalCount.toLocaleString();
      document.getElementById('results-tab-count').textContent = totalCount.toLocaleString();

      if (append) {
        this.companies = this.companies.concat(json.data || []);
      } else {
        this.companies = json.data || [];
      }

      this.renderCards(append);
    } catch (e) {
      console.error('Error fetching companies', e);
    } finally {
      this.isLoading = false;
      if (loadingEl) loadingEl.style.display = 'none';
    }
  },

  renderCards(append = false) {
    const listEl = document.getElementById('results-items');
    if (!listEl) return;

    if (!append) listEl.innerHTML = '';

    if (this.companies.length === 0) {
      listEl.innerHTML = `
        <div style="padding:var(--space-8) var(--space-4); text-align:center; color:var(--text-tertiary);">
          <i data-lucide="search-x" style="width:36px; height:36px; margin:0 auto var(--space-2); opacity:0.4;"></i>
          <p class="text-headline">No manufacturers match the selected criteria</p>
          <p class="text-caption mt-1">Try broadening your geographic radius or resetting filters.</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const fragment = document.createDocumentFragment();
    const renderList = append ? this.companies.slice((this.currentPage - 1) * 20) : this.companies;

    renderList.forEach(c => {
      const card = document.createElement('div');
      card.className = 'result-card card';
      if (this.selectedCompanyIds.has(c.id)) card.classList.add('selected');

      const isChecked = this.selectedCompanyIds.has(c.id);
      const scaleBadgeClass = `badge-scale-${(c.company_scale || 'small').toLowerCase()}`;

      card.innerHTML = `
        <div class="result-card-checkbox">
          <input type="checkbox" class="checkbox comp-select-cb" data-id="${c.id}" ${isChecked ? 'checked' : ''}>
        </div>
        <div class="result-card-content" onclick="TrinetCompany.openModal('${c.id}')">
          <div class="result-card-name" title="${c.company_name}">${c.company_name}</div>
          <div class="result-card-meta">
            <span class="result-card-meta-item">
              <i data-lucide="map-pin" style="width:12px; height:12px;"></i> ${c.headquarters_city || 'India'}, ${c.headquarters_state || ''}
            </span>
            ${c.establishment_year ? `<span class="result-card-meta-item">Est. ${c.establishment_year}</span>` : ''}
            <span class="result-card-meta-item font-semibold text-accent">${c.facility_count || 1} Sites</span>
          </div>
          <div class="result-card-tags">
            <span class="badge badge-primary">${c.industry || 'General'}</span>
            <span class="badge ${scaleBadgeClass}">${c.company_scale || 'Small'}</span>
            ${c.is_exporter ? '<span class="badge badge-neutral">Exporter</span>' : ''}
          </div>
        </div>
        <div class="result-card-score" onclick="TrinetCompany.openModal('${c.id}')">
          <div class="score-ring">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle class="score-ring-bg" cx="20" cy="20" r="16"></circle>
              <circle class="score-ring-fill" cx="20" cy="20" r="16" 
                      stroke-dasharray="100.5" 
                      stroke-dashoffset="${100.5 - (100.5 * (c.scale_score || 0) / 100)}"></circle>
            </svg>
            <div class="score-ring-text">${c.scale_score || 0}</div>
          </div>
          <span style="font-size:0.625rem; font-weight:600; color:var(--text-tertiary);">SCORE</span>
        </div>
      `;

      // Checkbox click stops propagation to avoid opening modal
      const cb = card.querySelector('.comp-select-cb');
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.checked) {
          this.selectedCompanyIds.add(c.id);
          card.classList.add('selected');
        } else {
          this.selectedCompanyIds.delete(c.id);
          card.classList.remove('selected');
        }
        this.updateSelectionUI();
      });

      fragment.appendChild(card);
    });

    listEl.appendChild(fragment);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    this.updateSelectionUI();
  },

  updateSelectionUI() {
    const count = this.selectedCompanyIds.size;
    document.getElementById('selected-count-display').textContent = count;
    
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) clearBtn.style.display = count > 0 ? 'inline-block' : 'none';

    // Synchronize checkboxes in DOM
    document.querySelectorAll('.comp-select-cb').forEach(cb => {
      cb.checked = this.selectedCompanyIds.has(cb.getAttribute('data-id'));
    });

    // Update floating export toolbar
    TrinetExport.updateToolbar(count);
  }
};
