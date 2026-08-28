/**
 * TRINET™ - Company Intelligence Module
 * Slide-in detailed intelligence drawer, scale score radar chart, facility site switcher, mini-map.
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

    const exportSingleBtn = document.getElementById('modal-export-single-btn');
    if (exportSingleBtn) {
      exportSingleBtn.addEventListener('click', () => {
        if (this.currentCompany) {
          TrinetExport.serverExport(
            { selectedCompanyIds: [this.currentCompany.id] },
            'xlsx',
            `${this.currentCompany.company_name.replace(/\s+/g, '_')}_Intelligence.xlsx`
          );
        }
      });
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

      // Fly the main map to the company's facility
      if (data.facilities && data.facilities.length > 0 && typeof TrinetMap !== 'undefined' && TrinetMap.map) {
        const firstFac = data.facilities[0];
        if (firstFac.latitude && firstFac.longitude) {
          TrinetMap.flyToLocation([firstFac.longitude, firstFac.latitude], 13);
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

    // Render Multi-Axis Radar Chart
    this.renderRadarChart(c, facilities);

    // Render Facility Tabs & List
    this.renderFacilityTabs(facilities);

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

  renderRadarChart(c, facilities) {
    const container = document.getElementById('modal-radar-chart');
    if (!container) return;

    const workforceVal = Math.min(100, Math.round(((c.employee_count || 50) / 1200) * 100));
    const footprintVal = Math.min(100, Math.round((facilities.length / 4) * 100));
    const exportVal = c.is_exporter ? 90 : 30;
    const verifVal = c.verification_status === 'VERIFIED' ? 95 : (c.verification_status === 'PARTIALLY_VERIFIED' ? 60 : 30);
    const stabilityVal = Math.min(100, Math.round(((2026 - (c.establishment_year || 2012)) / 35) * 100));

    const axes = [
      { label: 'Workforce', value: workforceVal },
      { label: 'Footprint', value: footprintVal },
      { label: 'Export Reach', value: exportVal },
      { label: 'Verification', value: verifVal },
      { label: 'Stability', value: stabilityVal }
    ];

    const size = 200;
    const center = size / 2;
    const radius = 65;
    const total = axes.length;

    let gridSvg = '';
    [0.33, 0.66, 1.0].forEach(rRatio => {
      const points = axes.map((_, i) => {
        const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
        const x = center + radius * rRatio * Math.cos(angle);
        const y = center + radius * rRatio * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
      gridSvg += `<polygon points="${points}" class="radar-grid-line" />`;
    });

    let axisSvg = '';
    axes.forEach((axis, i) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      const labelX = center + (radius + 18) * Math.cos(angle);
      const labelY = center + (radius + 18) * Math.sin(angle) + 3;
      axisSvg += `
        <line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis-line" />
        <text x="${labelX}" y="${labelY}" class="radar-label">${axis.label}</text>
      `;
    });

    const valPoints = axes.map((axis, i) => {
      const rRatio = Math.max(0.18, axis.value / 100);
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x = center + radius * rRatio * Math.cos(angle);
      const y = center + radius * rRatio * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');

    container.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}" class="radar-chart-svg">
        ${gridSvg}
        ${axisSvg}
        <polygon points="${valPoints}" class="radar-polygon" />
      </svg>
    `;
  },

  renderFacilityTabs(facilities) {
    const container = document.getElementById('modal-facility-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    if (facilities.length <= 1) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    
    facilities.forEach((f, idx) => {
      const btn = document.createElement('button');
      btn.className = `facility-tab-btn ${idx === 0 ? 'active' : ''}`;
      btn.textContent = `Site ${idx + 1}: ${f.city}`;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.facility-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.miniMap && f.latitude && f.longitude) {
          this.miniMap.flyTo({ center: [f.longitude, f.latitude], zoom: 14 });
        }
      });
      container.appendChild(btn);
    });
  },

  renderMiniMap(facilities) {
    const container = document.getElementById('company-minimap');
    if (!container) return;

    if (this.miniMap) {
      this.miniMap.remove();
      this.miniMap = null;
    }

    if (!facilities.length || !facilities[0].latitude) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    const firstFac = facilities[0];

    setTimeout(() => {
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
          layers: [{ id: 'osm-layer', type: 'raster', source: 'osm-tiles' }]
        },
        center: [firstFac.longitude, firstFac.latitude],
        zoom: 12,
        interactive: true
      });

      this.miniMap.on('load', () => {
        facilities.forEach(f => {
          if (f.latitude && f.longitude) {
            new maplibregl.Marker({ color: '#00A06C' })
              .setLngLat([f.longitude, f.latitude])
              .setPopup(new maplibregl.Popup({ offset: 25 }).setText(f.facility_name || 'Plant'))
              .addTo(this.miniMap);
          }
        });
      });
    }, 100);
  },

  closeModal() {
    const modal = document.getElementById('company-profile-modal');
    const overlay = document.getElementById('global-overlay');
    modal?.classList.remove('active');
    overlay?.classList.remove('active');
  }
};
