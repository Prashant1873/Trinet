/**
 * TRINET™ - Native Interactive Map Engine
 * Powered by MapLibre GL JS with Apple-style HTML cluster markers with visible counts,
 * instantaneous click expansion, zero drag interference, basemap switcher, and area selection.
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

  INDUSTRY_COLORS: {
    'Automotive': '#EF4444',
    'Aerospace & Defence': '#8B5CF6',
    'Electronics': '#3B82F6',
    'Pharmaceuticals': '#10B981',
    'Chemicals': '#F59E0B',
    'Textiles': '#EC4899',
    'Food & Beverage': '#F97316',
    'Steel & Metals': '#6B7280',
    'Machinery': '#14B8A6',
    'Industrial Equipment': '#0EA5E9',
    'Plastics': '#A855F7',
    'Packaging': '#84CC16'
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

    // Re-cluster markers on zoom or pan end
    let updateTimeout;
    this.map.on('moveend', () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        this.renderClustersAndPoints();
        this.updateViewportCount();
      }, 120);
    });
  },

  async refreshMarkers() {
    const filters = typeof TrinetFilters !== 'undefined' ? TrinetFilters.getFilterPayload() : {};
    const queryParams = new URLSearchParams(filters);

    try {
      const res = await fetch(`/api/facilities/geojson?${queryParams}`);
      const geojson = await res.json();
      this.geojsonData = geojson;
      this.renderClustersAndPoints();
      this.updateViewportCount();
    } catch (e) {
      console.error('Failed to load map GeoJSON data', e);
    }
  },

  renderClustersAndPoints() {
    if (!this.map || !this.geojsonData || !this.geojsonData.features) return;

    // Remove existing markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    const zoom = this.map.getZoom();
    const bounds = this.map.getBounds();
    const features = this.geojsonData.features;

    // Filter features in visible viewport
    const visibleFeatures = features.filter(f => {
      const [lng, lat] = f.geometry.coordinates;
      return lat >= bounds.getSouth() - 0.5 && lat <= bounds.getNorth() + 0.5 &&
             lng >= bounds.getWest() - 0.5 && lng <= bounds.getEast() + 0.5;
    });

    // If high zoom (>= 13), render individual factory pins
    if (zoom >= 13 || visibleFeatures.length <= 25) {
      visibleFeatures.forEach(feat => {
        const [lng, lat] = feat.geometry.coordinates;
        const props = feat.properties;
        const color = this.INDUSTRY_COLORS[props.industry] || '#00A06C';

        const el = document.createElement('div');
        el.className = 'trinet-pin';
        el.style.setProperty('--pin-color', color);
        el.innerHTML = `<div class="trinet-pin-dot"></div>`;
        el.title = `${props.company_name} - ${props.city}`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showFacilityPopup(props, [lng, lat]);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(this.map);

        this.markers.push(marker);
      });
      return;
    }

    // Grid-based spatial clustering
    const clusterRadiusPx = 55;
    const worldWidth = 360 / (Math.pow(2, zoom) * (512 / clusterRadiusPx));
    const grid = {};

    visibleFeatures.forEach(feat => {
      const [lng, lat] = feat.geometry.coordinates;
      const gx = Math.floor(lng / worldWidth);
      const gy = Math.floor(lat / worldWidth);
      const key = `${gx}_${gy}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(feat);
    });

    Object.values(grid).forEach(group => {
      if (group.length === 1) {
        const feat = group[0];
        const [lng, lat] = feat.geometry.coordinates;
        const props = feat.properties;
        const color = this.INDUSTRY_COLORS[props.industry] || '#00A06C';

        const el = document.createElement('div');
        el.className = 'trinet-pin';
        el.style.setProperty('--pin-color', color);
        el.innerHTML = `<div class="trinet-pin-dot"></div>`;
        el.title = `${props.company_name} - ${props.city}`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showFacilityPopup(props, [lng, lat]);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(this.map);

        this.markers.push(marker);
      } else {
        // Compute cluster centroid
        const avgLng = group.reduce((sum, f) => sum + f.geometry.coordinates[0], 0) / group.length;
        const avgLat = group.reduce((sum, f) => sum + f.geometry.coordinates[1], 0) / group.length;
        const count = group.length;

        let sizeClass = 'trinet-cluster-sm';
        if (count >= 150) sizeClass = 'trinet-cluster-xl';
        else if (count >= 60) sizeClass = 'trinet-cluster-lg';
        else if (count >= 20) sizeClass = 'trinet-cluster-md';

        const el = document.createElement('div');
        el.className = `trinet-cluster ${sizeClass}`;
        el.innerHTML = `
          <div class="trinet-cluster-halo"></div>
          <div class="trinet-cluster-body">
            <span class="trinet-cluster-count">${count >= 1000 ? (count/1000).toFixed(1) + 'k' : count}</span>
          </div>
        `;
        el.title = `${count} manufacturing facilities. Click to expand.`;

        // Instant click expansion without drag interference
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const nextZoom = Math.min(this.map.getZoom() + 2.4, 15);
          this.map.flyTo({
            center: [avgLng, avgLat],
            zoom: nextZoom,
            duration: 400,
            essential: true
          });
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([avgLng, avgLat])
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

    const popupHtml = `
      <div class="facility-popup">
        <div class="facility-popup-header">
          <div class="facility-popup-company">${props.company_name}</div>
          <div class="facility-popup-name">${props.facility_name || 'Manufacturing Plant'}</div>
        </div>
        <div class="facility-popup-body">
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
      offset: [0, -12],
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

    document.getElementById('map-cancel-selection-btn')?.addEventListener('click', () => {
      this.cancelSelection();
    });
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
