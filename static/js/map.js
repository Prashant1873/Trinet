/**
 * TRINET™ - Native WebGL Interactive Map Engine
 * Powered by MapLibre GL JS with native GPU-accelerated GeoJSON layers,
 * strictly planar-locked coordinates, crisp vector clustering, and area selection.
 */

const TrinetMap = {
  map: null,
  currentPopup: null,
  isSelectToolActive: false,
  selectStartPoint: null,
  selectRectEl: null,
  geojsonData: { type: 'FeatureCollection', features: [] },

  init() {
    this.map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
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
    // 1. Add GeoJSON Source with Native Clustering
    this.map.addSource('facilities', {
      type: 'geojson',
      data: this.geojsonData,
      cluster: true,
      clusterMaxZoom: 14, // Cluster points up to zoom 14
      clusterRadius: 50   // Radius of each cluster when clustering points
    });

    // 2. Clustered Circles Layer (Fixed to map plane, size & color scaled by density)
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'facilities',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#00A06C', // Base TRINET Green
          20,
          '#0B8A5D', // Medium cluster
          60,
          '#076E4A', // Large cluster
          150,
          '#045237'  // Enterprise hub
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          16,
          20,
          22,
          60,
          28,
          150,
          36
        ],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.94
      }
    });

    // 3. Cluster Count Numbers Layer
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'facilities',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 12,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
      },
      paint: {
        'text-color': '#FFFFFF'
      }
    });

    // 4. Unclustered Individual Factory Markers (Fixed strictly on land coordinates)
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
          '#00A06C' // fallback
        ],
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.95
      }
    });

    // ── Click Handlers ──

    // Cluster Click -> Smooth Expansion Zoom
    this.map.on('click', 'clusters', (e) => {
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      
      const clusterId = features[0].properties.cluster_id;
      this.map.getSource('facilities').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        this.map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: Math.min(zoom, 16),
          duration: 400
        });
      });
    });

    // Unclustered Point Click -> Show Facility Intelligence Popup
    this.map.on('click', 'unclustered-point', (e) => {
      if (!e.features.length) return;
      const feat = e.features[0];
      const coords = feat.geometry.coordinates.slice();
      const props = feat.properties;

      while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
        coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
      }

      this.showFacilityPopup(props, coords);
    });

    // Cursor Styling on Hover
    this.map.on('mouseenter', 'clusters', () => { this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'clusters', () => { this.map.getCanvas().style.cursor = ''; });
    this.map.on('mouseenter', 'unclustered-point', () => { this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'unclustered-point', () => { this.map.getCanvas().style.cursor = ''; });
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
