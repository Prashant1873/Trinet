/**
 * TRINET (TM) - Interactive Map Module
 * Powered by MapLibre GL JS with custom markers, clustering, bounds sync, and area selection
 */

const TrinetMap = {
  map: null,
  markers: [],
  currentPopup: null,
  isSelectToolActive: false,
  selectStartPoint: null,
  selectRectEl: null,
  facilitiesData: [],

  init() {
    // MapLibre GL Map initialization centered on India
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
      center: [78.9629, 21.5937], // India center
      zoom: 4.8,
      minZoom: 3.5,
      maxZoom: 18
    });

    this.map.on('load', () => {
      this.refreshMarkers();
      this.setupControls();
      this.setupSelectionTool();
    });

    // Viewport debounced change listener
    let moveTimeout;
    this.map.on('moveend', () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        this.refreshMarkers();
        this.updateViewportCount();
      }, 250);
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
    
    // Clear existing DOM markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    const bounds = this.map.getBounds();
    if (!bounds) return;
    
    const zoom = this.map.getZoom();
    const filters = typeof TrinetFilters !== 'undefined' ? TrinetFilters.getFilterPayload() : {};

    const queryParams = new URLSearchParams({
      zoom: (zoom || 5).toFixed(1),
      sw_lat: bounds.getSouth(),
      sw_lng: bounds.getWest(),
      ne_lat: bounds.getNorth(),
      ne_lng: bounds.getEast(),
      ...filters
    });

    try {
      const res = await fetch(`/api/facilities/clusters?${queryParams}`);
      const data = await res.json();
      
      this.facilitiesData = data.points || [];

      // 1. Render Clusters
      if (data.clusters) {
        data.clusters.forEach(c => {
          this.createClusterMarker(c);
        });
      }

      // 2. Render Individual Points
      if (data.points) {
        data.points.forEach(f => {
          this.createFacilityMarker(f);
        });
      }

      this.updateViewportCount();
    } catch (e) {
      console.error('Error fetching facility clusters', e);
    }
  },

  createClusterMarker(cluster) {
    const el = document.createElement('div');
    el.className = 'cluster-marker';
    
    // Size class based on count
    if (cluster.count > 50) el.classList.add('cluster-xlarge');
    else if (cluster.count > 20) el.classList.add('cluster-large');
    else if (cluster.count > 5) el.classList.add('cluster-medium');
    else el.classList.add('cluster-small');

    el.innerHTML = `<span>${cluster.count}</span>`;

    el.addEventListener('click', () => {
      this.map.flyTo({
        center: [cluster.longitude, cluster.latitude],
        zoom: cluster.expansion_zoom || this.map.getZoom() + 2.5,
        speed: 1.2,
        curve: 1.42
      });
    });

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([cluster.longitude, cluster.latitude])
      .addTo(this.map);

    this.markers.push(marker);
  },

  createFacilityMarker(facility) {
    const el = document.createElement('div');
    el.className = 'facility-marker';
    
    // Industry Color
    const indColor = this.getIndustryColor(facility.industry);

    el.innerHTML = `
      <svg viewBox="0 0 24 24" width="28" height="28" fill="${indColor}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showFacilityPopup(facility);
    });

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([facility.longitude, facility.latitude])
      .addTo(this.map);

    this.markers.push(marker);
  },

  showFacilityPopup(facility) {
    if (this.currentPopup) this.currentPopup.remove();

    const popupHtml = `
      <div class="facility-popup">
        <div class="facility-popup-header">
          <div class="facility-popup-company">${facility.company_name}</div>
          <div class="facility-popup-name">${facility.facility_name || 'Manufacturing Unit'}</div>
        </div>
        <div class="facility-popup-body">
          <div class="facility-popup-row">
            <span class="facility-popup-label">Industry:</span>
            <span class="badge badge-primary">${facility.industry || 'General'}</span>
          </div>
          <div class="facility-popup-row">
            <span class="facility-popup-label">Location:</span>
            <span class="facility-popup-value">${facility.city || ''}, ${facility.state || ''}</span>
          </div>
          <div class="facility-popup-row">
            <span class="facility-popup-label">Scale Score:</span>
            <span class="facility-popup-value text-accent font-semibold">${facility.scale_score || 0}/100</span>
          </div>
          <div class="facility-popup-row">
            <span class="facility-popup-label">Total Facilities:</span>
            <span class="facility-popup-value">${facility.facility_count || 1} Known Sites</span>
          </div>
        </div>
        <div class="facility-popup-actions">
          <button class="btn btn-primary btn-sm" onclick="TrinetCompany.openModal('${facility.company_id}')">
            View Intelligence
          </button>
        </div>
      </div>
    `;

    this.currentPopup = new maplibregl.Popup({ offset: [0, -14], closeOnClick: true })
      .setLngLat([facility.longitude, facility.latitude])
      .setHTML(popupHtml)
      .addTo(this.map);
  },

  getIndustryColor(industry) {
    const colors = {
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
    };
    return colors[industry] || '#00A06C';
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
    if (!this.map) return;
    const bounds = this.map.getBounds();
    const visibleCount = this.facilitiesData.filter(f => {
      return f.latitude >= bounds.getSouth() && f.latitude <= bounds.getNorth() &&
             f.longitude >= bounds.getWest() && f.longitude <= bounds.getEast();
    }).length;

    const countEl = document.getElementById('viewport-count-num');
    if (countEl) {
      countEl.textContent = visibleCount > 0 ? visibleCount : this.markers.length;
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
        const currentPt = [moveEvent.clientX, moveEvent.clientY];
        const minX = Math.min(e.clientX, moveEvent.clientX);
        const maxX = Math.max(e.clientX, moveEvent.clientX);
        const minY = Math.min(e.clientY, moveEvent.clientY);
        const maxY = Math.max(e.clientY, moveEvent.clientY);

        this.selectRectEl.style.left = `${minX}px`;
        this.selectRectEl.style.top = `${minY - 56}px`; // header offset
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

        // Find facilities in selected bounding box
        const selectedFacilities = this.facilitiesData.filter(f => 
          f.latitude >= swLat && f.latitude <= neLat && f.longitude >= swLng && f.longitude <= neLng
        );

        document.getElementById('map-selected-count').textContent = `${selectedFacilities.length} facilities`;

        const exportBtn = document.getElementById('map-export-selection-btn');
        if (exportBtn) {
          exportBtn.onclick = () => {
            const compIds = Array.from(new Set(selectedFacilities.map(f => f.company_id)));
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
