/**
 * TRINET™ - Native WebGL Interactive Map Engine
 * Powered by MapLibre GL JS with native GPU-accelerated GeoJSON layers,
 * basemap switcher (Street/Satellite/Dark), interactive industry legend, and area selection.
 */

const TrinetMap = {
  map: null,
  currentPopup: null,
  currentBasemap: 'light',
  isSelectToolActive: false,
  selectStartPoint: null,
  selectRectEl: null,
  geojsonData: { type: 'FeatureCollection', features: [] },

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
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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
      this.setupNativeLayers();
      this.setupControls();
      this.setupBasemapSwitcher();
      this.setupLegend();
      this.setupSelectionTool();
      this.refreshMarkers();
    });

    // Viewport count update on move
    let moveTimeout;
    this.map.on('moveend', () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        this.updateViewportCount();
      }, 200);
    });
  },

  setupNativeLayers() {
    if (this.map.getSource('facilities')) return;

    // 1. Add GeoJSON Source with Native Clustering
    this.map.addSource('facilities', {
      type: 'geojson',
      data: this.geojsonData,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // 2. Clustered Circles Glow Layer (Apple translucent halo)
    this.map.addLayer({
      id: 'clusters-glow',
      type: 'circle',
      source: 'facilities',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#00A06C',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          22,
          20,
          28,
          60,
          36,
          150,
          44
        ],
        'circle-opacity': 0.28
      }
    });

    // 3. Clustered Circles Core Layer
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'facilities',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#00A06C',
          20,
          '#0B8A5D',
          60,
          '#076E4A',
          150,
          '#045237'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          14,
          20,
          18,
          60,
          24,
          150,
          30
        ],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.95
      }
    });

    // 4. Unclustered Individual Factory Markers
    this.map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'facilities',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'industry'],
          'Automotive', '#EF4444',
          'Aerospace & Defence', '#8B5CF6',
          'Electronics', '#3B82F6',
          'Pharmaceuticals', '#10B981',
          'Chemicals', '#F59E0B',
          'Textiles', '#EC4899',
          'Food & Beverage', '#F97316',
          'Steel & Metals', '#6B7280',
          'Machinery', '#14B8A6',
          'Industrial Equipment', '#0EA5E9',
          'Plastics', '#A855F7',
          'Packaging', '#84CC16',
          '#00A06C'
        ],
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.95
      }
    });

    // ── Click Handlers for Clusters ──
    const handleClusterClick = (e) => {
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['clusters', 'clusters-glow'] });
      if (!features.length) return;
      
      const feature = features[0];
      const clusterId = feature.properties.cluster_id;
      const coordinates = feature.geometry.coordinates.slice();
      
      const source = this.map.getSource('facilities');
      if (source && clusterId !== undefined) {
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          const targetZoom = (!err && zoom) ? zoom : (this.map.getZoom() + 2.5);
          this.map.easeTo({
            center: coordinates,
            zoom: Math.min(targetZoom, 16),
            duration: 400
          });
        });
      } else {
        this.map.easeTo({
          center: coordinates,
          zoom: Math.min(this.map.getZoom() + 2.5, 16),
          duration: 400
        });
      }
    };

    this.map.on('click', 'clusters', handleClusterClick);
    this.map.on('click', 'clusters-glow', handleClusterClick);

    // ── Click Handler for Individual Factory Points ──
    this.map.on('click', 'unclustered-point', (e) => {
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] });
      if (!features.length) return;
      const feat = features[0];
      const coords = feat.geometry.coordinates.slice();
      const props = feat.properties;

      while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
        coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
      }

      this.showFacilityPopup(props, coords);
    });

    // ── Dismiss popup on background map click ──
    this.map.on('click', (e) => {
      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ['clusters', 'clusters-glow', 'unclustered-point']
      });
      if (!features.length && this.currentPopup) {
        this.currentPopup.remove();
        this.currentPopup = null;
      }
    });

    // Cursor Styling on Hover
    this.map.on('mouseenter', 'clusters', () => { this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'clusters', () => { this.map.getCanvas().style.cursor = ''; });
    this.map.on('mouseenter', 'clusters-glow', () => { this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'clusters-glow', () => { this.map.getCanvas().style.cursor = ''; });
    this.map.on('mouseenter', 'unclustered-point', () => { this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'unclustered-point', () => { this.map.getCanvas().style.cursor = ''; });
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
    
    // Safely remove layers if present
    ['unclustered-point', 'clusters', 'clusters-glow', 'basemap-layer'].forEach(layerId => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    if (this.map.getSource('basemap-tiles')) {
      this.map.removeSource('basemap-tiles');
    }
    if (this.map.getSource('facilities')) {
      this.map.removeSource('facilities');
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

    this.setupNativeLayers();
    if (this.map.getSource('facilities')) {
      this.map.getSource('facilities').setData(this.geojsonData);
    }
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

  async refreshMarkers() {
    if (!this.map) return;

    const filters = typeof TrinetFilters !== 'undefined' ? TrinetFilters.getFilterPayload() : {};
    const queryParams = new URLSearchParams(filters);

    try {
      const res = await fetch(`/api/facilities/geojson?${queryParams}`);
      const geojson = await res.json();
      
      this.geojsonData = geojson;

      if (this.map && this.map.getSource('facilities')) {
        this.map.getSource('facilities').setData(geojson);
      }

      this.updateViewportCount();
    } catch (e) {
      console.error('Failed to load map GeoJSON data', e);
    }
  },

  showFacilityPopup(props, coordinates) {
    if (this.currentPopup) this.currentPopup.remove();

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

    this.currentPopup = new maplibregl.Popup({ offset: [0, -10], closeOnClick: true })
      .setLngLat(coordinates)
      .setHTML(popupHtml)
      .addTo(this.map);
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
