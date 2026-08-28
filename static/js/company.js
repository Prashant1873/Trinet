/**
 * TRINET (TM) - Company Intelligence Module
 * Slide-in detailed intelligence drawer, mini-map, and data provenance table
 */

const TrinetCompany = {
  currentCompany: null,
  miniMap: null,

  init() {
    const closeBtn = document.getElementById('company-modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    const overlay = document.getElementById('global-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeModal());
    }
  },

  async openModal(companyId) {
    const modal = document.getElementById('company-profile-modal');
    const overlay = document.getElementById('global-overlay');

    try {
      const res = await fetch(`/api/companies/${companyId}`);
      if (!res.ok) throw new Error('Company not found');
      const data = await res.json();
      
      this.currentCompany = data.company;
      this.populateModal(data);

      modal?.classList.add('active');
      overlay?.classList.add('active');

      // Also fly the main map to the company's actual facility location
      if (data.facilities && data.facilities.length > 0 && typeof TrinetMap !== 'undefined' && TrinetMap.map) {
        const firstFac = data.facilities[0];
        if (firstFac.latitude && firstFac.longitude) {
          TrinetMap.flyToLocation([firstFac.longitude, firstFac.latitude], 12);
        }
      }
    } catch (e) {
      console.error('Error opening company modal', e);
      TrinetApp.showToast('Could not load company intelligence profile', 'error');
    }
  },

  populateModal(data) {
    const c = data.company;
    const facilities = data.facilities || [];
    const capabilities = data.capabilities || [];
    const sources = data.data_sources || [];

    // Header & Hero
    document.getElementById('modal-company-name').textContent = c.company_name;
    document.getElementById('modal-company-desc').textContent = c.company_description || `${c.company_name} is a manufacturing enterprise operating across India.`;
    document.getElementById('modal-company-industry').textContent = c.industry || 'General Manufacturing';
    document.getElementById('modal-company-scale').textContent = `${c.company_scale || 'Small'} Scale`;

    const websiteBtn = document.getElementById('modal-company-website');
    if (websiteBtn) {
      if (c.website) {
        websiteBtn.href = c.website;
        websiteBtn.style.display = 'inline-flex';
      } else {
        websiteBtn.style.display = 'none';
      }
    }

    // Key Metrics
    document.getElementById('modal-metric-score').textContent = `${c.scale_score || 0}/100`;
    document.getElementById('modal-metric-hq').textContent = `${c.headquarters_city || 'India'}, ${c.headquarters_state || ''}`;
    document.getElementById('modal-metric-year').textContent = c.establishment_year ? c.establishment_year : 'Unknown';
    document.getElementById('modal-metric-emp').textContent = c.employee_count ? `${c.employee_count.toLocaleString()}` : 'N/A';

    // Facilities List
    document.getElementById('modal-fac-count').textContent = facilities.length;
    const facList = document.getElementById('modal-facilities-list');
    if (facList) {
      facList.innerHTML = '';
      facilities.forEach((f, idx) => {
        const facEl = document.createElement('div');
        facEl.className = 'card';
        facEl.style.padding = 'var(--space-3)';
        facEl.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="font-semibold text-body">${f.facility_name || `Facility #${idx+1}`}</span>
            <span class="badge badge-primary">${f.facility_type || 'Factory'}</span>
          </div>
          <p class="text-caption text-secondary mt-1">${f.address || `${f.city}, ${f.state}`}</p>
          <div class="flex items-center gap-3 mt-2 text-caption text-tertiary">
            ${f.phone ? `<span><i data-lucide="phone" style="width:10px;height:10px;"></i> ${f.phone}</span>` : ''}
            ${f.google_rating ? `<span>★ ${f.google_rating} (${f.review_count || 0} reviews)</span>` : ''}
            ${f.google_maps_url ? `<a href="${f.google_maps_url}" target="_blank" class="text-accent">Google Maps ↗</a>` : ''}
          </div>
        `;
        facList.appendChild(facEl);
      });
    }

    // Mini Map Render
    this.renderMiniMap(facilities);

    // Capabilities Tags
    const capContainer = document.getElementById('modal-capabilities-container');
    if (capContainer) {
      capContainer.innerHTML = '';
      if (capabilities.length > 0) {
        capabilities.forEach(cap => {
          const badge = document.createElement('span');
          badge.className = 'badge badge-neutral';
          badge.textContent = cap.name;
          capContainer.appendChild(badge);
        });
      } else {
        capContainer.innerHTML = '<span class="text-caption text-tertiary">No specific capabilities cataloged yet.</span>';
      }
    }

    // Sources Table
    const srcBody = document.getElementById('modal-sources-body');
    if (srcBody) {
      srcBody.innerHTML = '';
      sources.forEach(s => {
        const tr = document.createElement('tr');
        const confClass = s.confidence_score >= 0.8 ? 'confidence-high' : (s.confidence_score >= 0.5 ? 'confidence-medium' : 'confidence-low');
        tr.innerHTML = `
          <td class="font-medium">${s.data_field}</td>
          <td>${s.data_value || '-'}</td>
          <td><a href="${s.source_url || '#'}" target="_blank" class="text-accent">${s.source_name || s.source_type}</a></td>
          <td class="${confClass}">${Math.round((s.confidence_score || 0.5) * 100)}%</td>
        `;
        srcBody.appendChild(tr);
      });
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderMiniMap(facilities) {
    const validFacilities = facilities.filter(f => f.latitude && f.longitude);
    if (validFacilities.length === 0) return;

    const centerLat = validFacilities[0].latitude;
    const centerLng = validFacilities[0].longitude;

    if (this.miniMap) {
      this.miniMap.remove();
    }

    this.miniMap = new maplibregl.Map({
      container: 'company-minimap',
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm-tiles' }]
      },
      center: [centerLng, centerLat],
      zoom: 11,
      interactive: true
    });

    validFacilities.forEach(f => {
      new maplibregl.Marker({ color: '#00A06C' })
        .setLngLat([f.longitude, f.latitude])
        .addTo(this.miniMap);
    });
  },

  closeModal() {
    const modal = document.getElementById('company-profile-modal');
    const overlay = document.getElementById('global-overlay');
    modal?.classList.remove('active');
    overlay?.classList.remove('active');
  }
};
