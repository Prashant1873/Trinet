/**
 * TRINET™ - Hierarchical Geospatial Map Engine
 * Level 1 (Zoom < 6.5): State Cluster Badges with counts
 * Level 2 (Zoom 6.5 - 11.5): City / Industrial Hub Badges with counts
 * Level 3 (Zoom >= 11.5): Teardrop Map Pins color-coded by Facility Type
 */

const TrinetMap = {
  map: null,
  currentPopup: null,
  currentBasemap: 'light',
  isSelectToolActive: false,
  selectStartPoint: null,
  selectRectEl: null,
  geojsonData: { type: 'FeatureCollection', features: [] },
  markers: [],

  // Color mapping by Facility Type
  FACILITY_TYPE_COLORS: {
    'FACTORY': '#00A06C',
    'PLANT': '#008F5F',
    'HQ': '#3B82F6',
    'ASSEMBLY': '#F59E0B',
    'FABRICATION': '#8B5CF6',
    'PROCESSING': '#EC4899',
    'WAREHOUSE': '#6B7280',
    'RND': '#10B981',
    'R&D': '#10B981',
    'DEFAULT': '#00A06C'
  },

  // Color mapping by Industry Sector
  INDUSTRY_COLORS: {
    'Automotive': '#EF4444',
    'Pharmaceuticals': '#10B981',
    'Electronics': '#3B82F6',
    'Aerospace & Defence': '#8B5CF6',
    'Chemicals': '#F59E0B',
    'Textiles': '#EC4899',
    'Steel & Metals': '#6B7280',
    'Machinery': '#14B8A6',
    'Electricals': '#6366F1',
    'Plastics & Polymers': '#06B6D4',
    'Food & Beverage': '#84CC16',
    'Energy Equipment': '#F97316',
    'Construction Materials': '#78716C',
    'Precision Tools': '#0EA5E9',
    'Petrochemicals': '#D97706',
    'Paper & Packaging': '#A855F7',
    'Consumer Goods': '#10B981',
    'Other': '#00A06C'
  },

  // State Centroids for Clean National Overview (Exact geographic anchor within state boundaries)
  STATE_CENTROIDS: {
    'Maharashtra': [75.3000, 19.5000],
    'Gujarat': [71.8000, 22.3000],
    'Tamil Nadu': [78.3500, 11.1200],
    'Karnataka': [76.5000, 14.5000],
    'Telangana': [79.0000, 17.8000],
    'Uttar Pradesh': [80.5000, 26.8500],
    'Haryana': [76.4000, 29.0500],
    'West Bengal': [87.8500, 23.0000],
    'Rajasthan': [74.2000, 26.8000],
    'Madhya Pradesh': [77.4000, 23.2500],
    'Kerala': [76.5000, 10.3500],
    'Andhra Pradesh': [80.1000, 15.9000],
    'Punjab': [75.5000, 31.1000],
    'Jharkhand': [85.5000, 23.6000],
    'Odisha': [84.4500, 20.9500],
    'Uttarakhand': [79.0000, 30.1000],
    'Himachal Pradesh': [77.1000, 31.4000],
    'Chhattisgarh': [81.8500, 21.2500],
    'Assam': [92.5000, 26.2000],
    'Delhi': [77.1000, 28.6500],
    'Dadra & Nagar Haveli and Daman & Diu': [73.0100, 20.2800],
    'Goa': [74.0000, 15.3500],
    'Chandigarh': [76.7800, 30.7300],
    'Puducherry': [79.8100, 11.9400]
  },

  BASEMAP_SOURCES: {
    light: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
  },

  init() {
    this.map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          'basemap-tiles': {
            type: 'raster',
            tiles: [this.BASEMAP_SOURCES.light],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'basemap-layer',
            type: 'raster',
            source: 'basemap-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [78.9629, 21.5937], // India geographic center
      zoom: 4.8,
      minZoom: 3.5,
      maxZoom: 18
    });

    this.map.on('load', () => {
      this.setupControls();
      this.setupBasemapSwitcher();
      this.setupLegend();
      this.setupSelectionTool();
      this.refreshMarkers();
    });

    // Dismiss popup on background map canvas click
    this.map.on('click', () => {
      if (this.currentPopup) {
        this.currentPopup.remove();
        this.currentPopup = null;
      }
    });

    // Hierarchical marker rendering on zoom or pan
    let updateTimeout;
    this.map.on('moveend', () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        this.renderHierarchicalView();
        this.updateViewportCount();
      }, 100);
    });
  },

  async refreshMarkers(autoFit = false) {
    const filters = typeof TrinetFilters !== 'undefined' ? TrinetFilters.getFilterPayload() : {};
    const queryParams = new URLSearchParams(filters);

    try {
      const res = await fetch(`/api/facilities/geojson?${queryParams}`);
      const geojson = await res.json();
      this.geojsonData = geojson;
      
      // Auto-fit to matching factories if a city/state/search filter is active
      if (autoFit || (filters.city && geojson.features.length > 0) || (filters.search && geojson.features.length > 0 && geojson.features.length < 200)) {
        this.fitToFeatures(geojson.features);
      }

      this.renderHierarchicalView();
      this.updateViewportCount();
    } catch (e) {
      console.error('Failed to load map GeoJSON data', e);
    }
  },

  fitToFeatures(features) {
    if (!this.map || !features || !features.length) return;
    if (features.length === 1) {
      const [lng, lat] = features[0].geometry.coordinates;
      this.flyToLocation([lng, lat], 13.5);
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    features.forEach(f => bounds.extend(f.geometry.coordinates));
    this.map.fitBounds(bounds, {
      padding: { top: 90, bottom: 90, left: 90, right: 90 },
      maxZoom: 13.5,
      duration: 500
    });
  },

  computeSectorDistribution(feats) {
    const counts = {};
    feats.forEach(f => {
      const ind = f.properties.industry || 'Other';
      counts[ind] = (counts[ind] || 0) + 1;
    });

    const total = feats.length;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    let barHtml = '<div class="trinet-sector-bar">';
    const summaryParts = [];
    const gradientStops = [];
    let currentDeg = 0;

    sorted.forEach(([ind, cnt]) => {
      const pct = cnt / total;
      const pctFormatted = (pct * 100).toFixed(1);
      const color = this.INDUSTRY_COLORS[ind] || '#00A06C';
      const deg = pct * 360;

      gradientStops.push(`${color} ${currentDeg.toFixed(1)}deg ${(currentDeg + deg).toFixed(1)}deg`);
      currentDeg += deg;

      barHtml += `<div class="trinet-sector-segment" style="width:${pctFormatted}%; background:${color};" title="${ind}: ${cnt} (${Math.round(pct * 100)}%)"></div>`;
      if (summaryParts.length < 3) {
        summaryParts.push(`${ind} ${Math.round(pct * 100)}%`);
      }
    });
    barHtml += '</div>';

    const conicGradient = gradientStops.length > 0
      ? `conic-gradient(${gradientStops.join(', ')})`
      : 'conic-gradient(#00A06C 0deg 360deg)';

    return {
      barHtml,
      conicGradient,
      summary: summaryParts.join(' · ')
    };
  },

  renderHierarchicalView() {
    if (!this.map || !this.geojsonData || !this.geojsonData.features) return;

    // Clear existing markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    const zoom = this.map.getZoom();
    const bounds = this.map.getBounds();
    const allFeatures = this.geojsonData.features;
    const isFilteredByCity = typeof TrinetFilters !== 'undefined' && (!!TrinetFilters.state.city || !!TrinetFilters.state.search);

    // ────────────────────────────────────────────────────────
    // LEVEL 1: Zoom < 6.8 (National Overview: 1 Circular Pie Chart Node per State)
    // ────────────────────────────────────────────────────────
    if (zoom < 6.8 && !isFilteredByCity && allFeatures.length > 200) {
      const stateGroups = {};
      allFeatures.forEach(f => {
        const state = f.properties.state || 'Other';
        if (!stateGroups[state]) stateGroups[state] = [];
        stateGroups[state].push(f);
      });

      Object.entries(stateGroups).forEach(([stateName, feats]) => {
        const count = feats.length;
        let coords = this.STATE_CENTROIDS[stateName];
        
        if (!coords) {
          const avgLng = feats.reduce((s, f) => s + f.geometry.coordinates[0], 0) / count;
          const avgLat = feats.reduce((s, f) => s + f.geometry.coordinates[1], 0) / count;
          coords = [avgLng, avgLat];
        }

        const sectorData = this.computeSectorDistribution(feats);
        const shortName = stateName.length > 8 ? stateName.slice(0, 7) + '..' : stateName;

        const el = document.createElement('div');
        el.className = 'trinet-cluster-node trinet-node-state';
        el.innerHTML = `
          <!-- Compact Circle Pie Chart View (Zero Clutter Default) -->
          <div class="trinet-pie-circle trinet-pie-circle-state" style="background:${sectorData.conicGradient};">
            <div class="trinet-pie-inner">
              <span class="trinet-pie-count">${count}</span>
              <span class="trinet-pie-label">${shortName}</span>
            </div>
          </div>

          <!-- Expanded Rectangle Card (Smooth morph on hover) -->
          <div class="trinet-expanded-card">
            <div class="trinet-card-header">
              <span class="trinet-card-title">${stateName}</span>
              <span class="trinet-card-badge">${count} factories</span>
            </div>
            ${sectorData.barHtml}
            <div class="trinet-card-sectors">${sectorData.summary}</div>
            <div class="trinet-card-hint">Click to zoom into state</div>
          </div>
        `;
        el.title = `${stateName}: ${count} manufacturing facilities\nSectors: ${sectorData.summary}`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.map.flyTo({
            center: coords,
            zoom: 8.8,
            duration: 500,
            essential: true
          });
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .addTo(this.map);

        this.markers.push(marker);
      });
      return;
    }

    // Filter features in visible viewport for deeper zoom levels
    const visibleFeatures = allFeatures.filter(f => {
      const [lng, lat] = f.geometry.coordinates;
      return lat >= bounds.getSouth() - 0.4 && lat <= bounds.getNorth() + 0.4 &&
             lng >= bounds.getWest() - 0.4 && lng <= bounds.getEast() + 0.4;
    });

    // ────────────────────────────────────────────────────────
    // LEVEL 3: Granular Precision: Direct Teardrop Factory Pins
    // Show direct pins when:
    // 1. A city or search filter is active
    // 2. Or zoom >= 10.5
    // 3. Or visible/total facilities <= 80
    // ────────────────────────────────────────────────────────
    if (isFilteredByCity || zoom >= 10.5 || visibleFeatures.length <= 80 || allFeatures.length <= 80) {
      const displayFeatures = isFilteredByCity ? allFeatures : visibleFeatures;
      displayFeatures.forEach(feat => {
        const [lng, lat] = feat.geometry.coordinates;
        const props = feat.properties;
        const facType = (props.facility_type || 'FACTORY').toUpperCase();
        const color = this.FACILITY_TYPE_COLORS[facType] || this.FACILITY_TYPE_COLORS.DEFAULT;

        const el = document.createElement('div');
        el.className = 'trinet-map-pin';
        el.innerHTML = `
          <div class="trinet-pin-tag">${props.company_name}</div>
          <svg class="trinet-pin-svg" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="14" cy="13" r="5" fill="#FFFFFF"/>
          </svg>
        `;
        el.title = `${props.company_name} - ${props.facility_name || 'Plant'} (${facType})`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showFacilityPopup(props, [lng, lat]);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(this.map);

        this.markers.push(marker);
      });
      return;
    }

    // ────────────────────────────────────────────────────────
    // LEVEL 2: Regional View (6.8 <= Zoom < 10.5 on broad all-India browse)
    // Circular Pie Chart Nodes for Industrial Cities & Hubs
    // ────────────────────────────────────────────────────────
    const cityGroups = {};
    visibleFeatures.forEach(feat => {
      const city = feat.properties.city || 'District';
      if (!cityGroups[city]) cityGroups[city] = [];
      cityGroups[city].push(feat);
    });

    Object.entries(cityGroups).forEach(([cityName, feats]) => {
      const count = feats.length;
      const avgLng = feats.reduce((s, f) => s + f.geometry.coordinates[0], 0) / count;
      const avgLat = feats.reduce((s, f) => s + f.geometry.coordinates[1], 0) / count;
      const coords = [avgLng, avgLat];

      if (count === 1) {
        // Single factory -> show pin
        const feat = feats[0];
        const props = feat.properties;
        const facType = (props.facility_type || 'FACTORY').toUpperCase();
        const color = this.FACILITY_TYPE_COLORS[facType] || this.FACILITY_TYPE_COLORS.DEFAULT;

        const el = document.createElement('div');
        el.className = 'trinet-map-pin';
        el.innerHTML = `
          <div class="trinet-pin-tag">${props.company_name}</div>
          <svg class="trinet-pin-svg" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="14" cy="13" r="5" fill="#FFFFFF"/>
          </svg>
        `;
        el.title = `${props.company_name} - ${props.facility_name || 'Plant'}`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showFacilityPopup(props, [feat.geometry.coordinates[0], feat.geometry.coordinates[1]]);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(feat.geometry.coordinates)
          .addTo(this.map);

        this.markers.push(marker);
      } else {
        // Multi-facility City Pie Chart Node with Smooth Rectangle Hover Expansion
        const sectorData = this.computeSectorDistribution(feats);
        const shortName = cityName.length > 8 ? cityName.slice(0, 7) + '..' : cityName;

        const el = document.createElement('div');
        el.className = 'trinet-cluster-node trinet-node-city';
        el.innerHTML = `
          <!-- Compact Circle Pie Chart View (Zero Clutter Default) -->
          <div class="trinet-pie-circle trinet-pie-circle-city" style="background:${sectorData.conicGradient};">
            <div class="trinet-pie-inner">
              <span class="trinet-pie-count">${count}</span>
              <span class="trinet-pie-label">${shortName}</span>
            </div>
          </div>

          <!-- Expanded Rectangle Card (Smooth morph on hover) -->
          <div class="trinet-expanded-card">
            <div class="trinet-card-header">
              <span class="trinet-card-title">${cityName}</span>
              <span class="trinet-card-badge">${count} sites</span>
            </div>
            ${sectorData.barHtml}
            <div class="trinet-card-sectors">${sectorData.summary}</div>
            <div class="trinet-card-hint">Click to zoom into hub</div>
          </div>
        `;
        el.title = `${cityName}: ${count} facilities\nSectors: ${sectorData.summary}`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.map.flyTo({
            center: coords,
            zoom: 12.5,
            duration: 450,
            essential: true
          });
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .addTo(this.map);

        this.markers.push(marker);
      }
    });
  },

  showFacilityPopup(props, coordinates) {
    if (this.currentPopup) {
      this.currentPopup.remove();
      this.currentPopup = null;
    }

    const facType = (props.facility_type || 'FACTORY').toUpperCase();
    const typeColor = this.FACILITY_TYPE_COLORS[facType] || this.FACILITY_TYPE_COLORS.DEFAULT;

    const popupHtml = `
      <div class="facility-popup">
        <div class="facility-popup-header">
          <div class="facility-popup-company">${props.company_name}</div>
          <div class="facility-popup-name">${props.facility_name || 'Manufacturing Facility'}</div>
        </div>
        <div class="facility-popup-body">
          <div class="facility-popup-row">
            <span class="facility-popup-label">Facility Type:</span>
            <span class="badge" style="background:${typeColor}20; color:${typeColor}; font-weight:600;">${facType}</span>
          </div>
          <div class="facility-popup-row">
            <span class="facility-popup-label">Industry:</span>
            <span class="badge badge-primary">${props.industry || 'General'}</span>
          </div>
          <div class="facility-popup-row">
            <span class="facility-popup-label">Location:</span>
            <span class="facility-popup-value">${props.city}, ${props.state}</span>
          </div>
          <div class="facility-popup-row">
            <span class="facility-popup-label">Scale Score:</span>
            <span class="facility-popup-value text-accent font-semibold">${props.scale_score || 0}/100</span>
          </div>
          <div class="facility-popup-row">
            <span class="facility-popup-label">Address:</span>
            <span class="facility-popup-value" style="font-size:0.75rem; color:var(--text-secondary);">${props.address || ''}</span>
          </div>
        </div>
        <div class="facility-popup-actions">
          <button class="btn btn-primary btn-sm w-full" onclick="TrinetCompany.openModal('${props.company_id}')">
            View Company Intelligence
          </button>
        </div>
      </div>
    `;

    this.currentPopup = new maplibregl.Popup({
      maxWidth: '380px',
      offset: [0, -34],
      closeOnClick: true,
      closeButton: true
    })
      .setLngLat(coordinates)
      .setHTML(popupHtml)
      .addTo(this.map);
  },

  setupBasemapSwitcher() {
    document.querySelectorAll('.map-style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const style = btn.getAttribute('data-style');
        document.querySelectorAll('.map-style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchBasemap(style);
      });
    });
  },

  switchBasemap(styleKey) {
    this.currentBasemap = styleKey;
    const tileUrl = this.BASEMAP_SOURCES[styleKey] || this.BASEMAP_SOURCES.light;
    
    if (this.map.getLayer('basemap-layer')) {
      this.map.removeLayer('basemap-layer');
    }
    if (this.map.getSource('basemap-tiles')) {
      this.map.removeSource('basemap-tiles');
    }

    this.map.addSource('basemap-tiles', {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256
    });

    this.map.addLayer({
      id: 'basemap-layer',
      type: 'raster',
      source: 'basemap-tiles',
      minzoom: 0,
      maxzoom: 19
    });
  },

  setupLegend() {
    const toggle = document.getElementById('map-legend-toggle');
    const items = document.getElementById('map-legend-items');
    const icon = document.getElementById('legend-toggle-icon');

    if (toggle && items) {
      toggle.addEventListener('click', () => {
        const isHidden = items.style.display === 'none';
        items.style.display = isHidden ? 'grid' : 'none';
        if (icon) {
          icon.setAttribute('data-lucide', isHidden ? 'chevron-down' : 'chevron-up');
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
      });
    }

    // Legend item click -> filter by that industry
    document.querySelectorAll('.legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const industry = item.getAttribute('data-industry');
        const filterSelect = document.getElementById('filter-industry');
        if (filterSelect) {
          filterSelect.value = industry;
          TrinetFilters.applyFilters();
          TrinetApp.showToast(`Filtered by ${industry}`, 'info');
        }
      });
    });
  },

  setupControls() {
    document.getElementById('map-zoom-in')?.addEventListener('click', () => {
      this.map.zoomIn({ duration: 300 });
    });

    document.getElementById('map-zoom-out')?.addEventListener('click', () => {
      this.map.zoomOut({ duration: 300 });
    });

    document.getElementById('map-reset-view')?.addEventListener('click', () => {
      this.flyToLocation([78.9629, 21.5937], 4.8);
    });

    document.getElementById('map-select-tool')?.addEventListener('click', () => {
      this.toggleSelectionTool();
    });

    document.getElementById('map-fullscreen-btn')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    document.getElementById('map-cancel-selection-btn')?.addEventListener('click', () => {
      this.cancelSelection();
    });

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      const fsIcon = document.getElementById('map-fullscreen-icon');
      const fsBtn = document.getElementById('map-fullscreen-btn');
      if (fsIcon) fsIcon.setAttribute('data-lucide', isFs ? 'minimize' : 'maximize');
      if (fsBtn) fsBtn.setAttribute('title', isFs ? 'Exit Fullscreen' : 'Toggle Fullscreen View');
      if (typeof lucide !== 'undefined') lucide.createIcons();
      setTimeout(() => this.map?.resize(), 200);
    });
  },

  toggleFullscreen() {
    const mapEl = document.getElementById('map-container') || document.documentElement;
    if (!document.fullscreenElement) {
      if (mapEl.requestFullscreen) {
        mapEl.requestFullscreen().catch(err => console.warn('Fullscreen error:', err));
      } else if (mapEl.webkitRequestFullscreen) {
        mapEl.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn('Exit fullscreen error:', err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  },

  flyToLocation(center, zoom = 11) {
    if (this.map) {
      this.map.flyTo({
        center: center,
        zoom: zoom,
        speed: 1.4,
        curve: 1.42,
        essential: true
      });
    }
  },

  updateViewportCount() {
    if (!this.map || !this.geojsonData || !this.geojsonData.features) return;
    
    const bounds = this.map.getBounds();
    const visibleCount = this.geojsonData.features.filter(f => {
      const [lng, lat] = f.geometry.coordinates;
      return lat >= bounds.getSouth() && lat <= bounds.getNorth() &&
             lng >= bounds.getWest() && lng <= bounds.getEast();
    }).length;

    const countEl = document.getElementById('viewport-count-num');
    if (countEl) {
      countEl.textContent = visibleCount > 0 ? visibleCount.toLocaleString() : this.geojsonData.features.length.toLocaleString();
    }
  },

  // ── Area Selection Tool for Geographic Export ──
  toggleSelectionTool() {
    this.isSelectToolActive = !this.isSelectToolActive;
    const btn = document.getElementById('map-select-tool');
    const toolbar = document.getElementById('map-selection-toolbar');

    if (this.isSelectToolActive) {
      btn?.classList.add('active');
      toolbar.style.display = 'flex';
      this.map.getCanvas().style.cursor = 'crosshair';
      TrinetApp.showToast('Click and drag a box on the map to select factories.', 'info');
    } else {
      this.cancelSelection();
    }
  },

  setupSelectionTool() {
    const canvas = this.map.getCanvasContainer();

    canvas.addEventListener('mousedown', (e) => {
      if (!this.isSelectToolActive) return;
      this.selectStartPoint = this.map.unproject([e.clientX, e.clientY]);

      this.selectRectEl = document.createElement('div');
      this.selectRectEl.className = 'map-selection-rect';
      document.getElementById('map-container').appendChild(this.selectRectEl);

      const onMouseMove = (moveEvent) => {
        const minX = Math.min(e.clientX, moveEvent.clientX);
        const maxX = Math.max(e.clientX, moveEvent.clientX);
        const minY = Math.min(e.clientY, moveEvent.clientY);
        const maxY = Math.max(e.clientY, moveEvent.clientY);

        this.selectRectEl.style.left = `${minX}px`;
        this.selectRectEl.style.top = `${minY - 56}px`;
        this.selectRectEl.style.width = `${maxX - minX}px`;
        this.selectRectEl.style.height = `${maxY - minY}px`;
      };

      const onMouseUp = (upEvent) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (!this.selectStartPoint) return;
        const selectEndPoint = this.map.unproject([upEvent.clientX, upEvent.clientY]);

        const swLat = Math.min(this.selectStartPoint.lat, selectEndPoint.lat);
        const neLat = Math.max(this.selectStartPoint.lat, selectEndPoint.lat);
        const swLng = Math.min(this.selectStartPoint.lng, selectEndPoint.lng);
        const neLng = Math.max(this.selectStartPoint.lng, selectEndPoint.lng);

        const selectedFeatures = (this.geojsonData.features || []).filter(f => {
          const [lng, lat] = f.geometry.coordinates;
          return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
        });

        document.getElementById('map-selected-count').textContent = `${selectedFeatures.length} facilities`;

        const exportBtn = document.getElementById('map-export-selection-btn');
        if (exportBtn) {
          exportBtn.onclick = () => {
            const compIds = Array.from(new Set(selectedFeatures.map(f => f.properties.company_id)));
            TrinetExport.serverExport({ selectedCompanyIds: compIds }, 'xlsx', `TRINET_Area_Selected_${compIds.length}_Companies.xlsx`);
            this.cancelSelection();
          };
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  },

  cancelSelection() {
    this.isSelectToolActive = false;
    document.getElementById('map-select-tool')?.classList.remove('active');
    document.getElementById('map-selection-toolbar').style.display = 'none';
    this.map.getCanvas().style.cursor = '';
    if (this.selectRectEl) {
      this.selectRectEl.remove();
      this.selectRectEl = null;
    }
  }
};
