import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { BusRouteInfo, BusStop } from '../../types';
import { Crosshair, Layers, MapPin, ZoomIn, ZoomOut, CheckCircle2 } from 'lucide-react';

interface BusMapLeafletProps {
  busRoute: BusRouteInfo;
  currentLat: number;
  currentLng: number;
  headingDeg: number;
  selectedStopId: number | null;
  onSelectStop: (stopId: number) => void;
  isDark: boolean;
  mapTileMode: 'street' | 'satellite' | 'dark';
  onChangeMapTileMode: (mode: 'street' | 'satellite' | 'dark') => void;
  followBus: boolean;
  onToggleFollowBus: () => void;
  onJumpBusToStop?: (stopId: number) => void;
  routeCoordinates: [number, number][];
}

export const BusMapLeaflet: React.FC<BusMapLeafletProps> = ({
  busRoute,
  currentLat,
  currentLng,
  headingDeg,
  selectedStopId,
  onSelectStop,
  isDark,
  mapTileMode,
  onChangeMapTileMode,
  followBus,
  onToggleFollowBus,
  onJumpBusToStop,
  routeCoordinates,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const stopMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const geofenceCirclesGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = [currentLat || 13.0675, currentLng || 77.5912];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Tile layers
    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const selectedUrl =
      mapTileMode === 'satellite'
        ? satelliteUrl
        : mapTileMode === 'dark' || (mapTileMode === 'street' && isDark)
        ? darkUrl
        : streetUrl;

    const tileLayer = L.tileLayer(selectedUrl, {
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups for markers
    stopMarkersGroupRef.current = L.layerGroup().addTo(map);
    geofenceCirclesGroupRef.current = L.layerGroup().addTo(map);

    // Route Polyline
    const polyline = L.polyline(routeCoordinates, {
      color: '#ea580c',
      weight: 6,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    routePolylineRef.current = polyline;

    // Background glow line
    L.polyline(routeCoordinates, {
      color: '#fb923c',
      weight: 12,
      opacity: 0.3,
    }).addTo(map);

    // Initial bus marker
    const busIcon = L.divIcon({
      className: 'custom-bus-leaflet-icon',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: rgba(234, 88, 12, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: linear-gradient(135deg, #f59e0b, #ea580c); border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transform: rotate(${headingDeg}deg); transition: transform 0.2s ease;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"></path>
              <path d="M15 6v6"></path>
              <path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path>
              <circle cx="7" cy="18" r="2"></circle>
              <circle cx="17" cy="18" r="2"></circle>
            </svg>
          </div>
          <div style="position: absolute; top: -14px; background-color: #1c1917; color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 6px; border: 1px solid #ea580c; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ${busRoute.currentSpeedKmH} km/h
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const marker = L.marker([currentLat, currentLng], { icon: busIcon, zIndexOffset: 1000 }).addTo(map);
    busMarkerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer if mode or isDark changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const selectedUrl =
      mapTileMode === 'satellite'
        ? satelliteUrl
        : mapTileMode === 'dark' || (mapTileMode === 'street' && isDark)
        ? darkUrl
        : streetUrl;

    tileLayerRef.current.setUrl(selectedUrl);
  }, [mapTileMode, isDark]);

  // Update Route Polyline if coordinates change
  useEffect(() => {
    if (!routePolylineRef.current) return;
    routePolylineRef.current.setLatLngs(routeCoordinates);
  }, [routeCoordinates]);

  // Update Bus Marker Position, Icon, and Heading
  useEffect(() => {
    if (!busMarkerRef.current || !mapInstanceRef.current) return;
    busMarkerRef.current.setLatLng([currentLat, currentLng]);

    const busIcon = L.divIcon({
      className: 'custom-bus-leaflet-icon',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: rgba(234, 88, 12, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: linear-gradient(135deg, #f59e0b, #ea580c); border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transform: rotate(${headingDeg}deg); transition: transform 0.2s ease;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"></path>
              <path d="M15 6v6"></path>
              <path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path>
              <circle cx="7" cy="18" r="2"></circle>
              <circle cx="17" cy="18" r="2"></circle>
            </svg>
          </div>
          <div style="position: absolute; top: -14px; background-color: #1c1917; color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 6px; border: 1px solid #ea580c; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ${busRoute.currentSpeedKmH} km/h
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    busMarkerRef.current.setIcon(busIcon);

    if (followBus) {
      mapInstanceRef.current.panTo([currentLat, currentLng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [currentLat, currentLng, headingDeg, busRoute.currentSpeedKmH, followBus]);

  // Update Stop Markers & Geofences
  useEffect(() => {
    if (!mapInstanceRef.current || !stopMarkersGroupRef.current || !geofenceCirclesGroupRef.current) return;

    stopMarkersGroupRef.current.clearLayers();
    geofenceCirclesGroupRef.current.clearLayers();

    busRoute.stops.forEach((stop, index) => {
      const lat = stop.lat || 13.0675;
      const lng = stop.lng || 77.5912;
      const isSelected = selectedStopId === (stop.id || index + 1);
      const isDestination = index === busRoute.stops.length - 1;
      const isOrigin = index === 0;

      // Calculate distance from bus to stop in meters
      const distM = L.latLng(currentLat, currentLng).distanceTo(L.latLng(lat, lng));
      const isInsideGeofence = distM <= 400;

      // Geofence Circle
      const geofenceCircle = L.circle([lat, lng], {
        radius: 400,
        color: isInsideGeofence ? '#10b981' : isSelected ? '#ea580c' : '#f97316',
        weight: isInsideGeofence ? 2 : 1,
        dashArray: isInsideGeofence ? undefined : '4 4',
        fillColor: isInsideGeofence ? '#10b981' : '#f97316',
        fillOpacity: isInsideGeofence ? 0.18 : 0.05,
      });
      geofenceCirclesGroupRef.current?.addLayer(geofenceCircle);

      // Stop Icon
      let badgeHtml = '';
      if (stop.status === 'passed') {
        badgeHtml = `
          <div style="width: 28px; height: 28px; border-radius: 9999px; background-color: #10b981; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 13px;">
            ✓
          </div>
        `;
      } else if (stop.status === 'current') {
        badgeHtml = `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: rgba(234, 88, 12, 0.4); animation: ping 1.2s infinite;"></div>
            <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background-color: #ea580c; border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 12px;">
              ${index + 1}
            </div>
          </div>
        `;
      } else if (isDestination) {
        badgeHtml = `
          <div style="width: 32px; height: 32px; border-radius: 9999px; background: linear-gradient(135deg, #ea580c, #b45309); border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 13px;">
            ★
          </div>
        `;
      } else {
        badgeHtml = `
          <div style="width: 26px; height: 26px; border-radius: 9999px; background-color: #3b82f6; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 11px;">
            ${index + 1}
          </div>
        `;
      }

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            ${badgeHtml}
            <div style="margin-top: 2px; background-color: ${isSelected ? '#ea580c' : '#1c1917'}; color: #ffffff; font-size: 9.5px; font-weight: 700; padding: 1.5px 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.18);">
              ${stop.shortName || stop.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [80, 48],
        iconAnchor: [40, 16],
      });

      const stopMarker = L.marker([lat, lng], { icon: stopIcon });

      stopMarker.on('click', () => {
        onSelectStop(stop.id || index + 1);
      });

      // Bind informative popup
      const studentCount = stop.students?.length || 0;
      const popupContent = document.createElement('div');
      popupContent.className = 'text-xs font-sans space-y-1.5 p-1';
      popupContent.innerHTML = `
        <div style="font-weight: 800; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
          ${stop.name}
        </div>
        <div style="font-size: 11px; color: #78716c;">
          ${stop.landmark || 'Route 14 Station'}
        </div>
        <div style="display: flex; gap: 8px; font-family: monospace; font-size: 11px; font-weight: bold; margin-top: 4px;">
          <span style="color: #ea580c;">Scheduled: ${stop.timeScheduled}</span>
          <span>•</span>
          <span style="color: #059669;">ETA: ${stop.eta}</span>
        </div>
        <div style="font-size: 11px; color: #44403c; border-top: 1px solid #e7e5e4; padding-top: 4px; margin-top: 4px;">
          Scholars: <strong>${studentCount} students</strong> at this stop
        </div>
      `;

      stopMarker.bindPopup(popupContent);
      stopMarkersGroupRef.current?.addLayer(stopMarker);
    });
  }, [busRoute.stops, selectedStopId, currentLat, currentLng]);

  // Center on entire route
  const handleFitRouteBounds = () => {
    if (!mapInstanceRef.current || routeCoordinates.length === 0) return;
    mapInstanceRef.current.fitBounds(L.latLngBounds(routeCoordinates), {
      padding: [40, 40],
      animate: true,
    });
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className="relative w-full h-[400px] sm:h-[460px] md:h-[500px] rounded-2xl overflow-hidden shadow-inner border border-stone-200 dark:border-stone-800">
      {/* Map DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Control Tools (Top Right) */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        {/* Tile Layer Selector */}
        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-stone-200/90 dark:border-stone-700 flex flex-col gap-1 text-[11px] font-bold">
          <button
            onClick={() => onChangeMapTileMode('street')}
            className={`px-2 py-1 rounded-lg transition text-left flex items-center gap-1.5 ${
              mapTileMode === 'street'
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Street Map (OpenStreetMap)"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Street</span>
          </button>
          <button
            onClick={() => onChangeMapTileMode('satellite')}
            className={`px-2 py-1 rounded-lg transition text-left flex items-center gap-1.5 ${
              mapTileMode === 'satellite'
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Satellite Aerial Imagery (Esri)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>
          <button
            onClick={() => onChangeMapTileMode('dark')}
            className={`px-2 py-1 rounded-lg transition text-left flex items-center gap-1.5 ${
              mapTileMode === 'dark'
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Dark Matter Map (CartoDB)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-stone-700 border border-stone-400 inline-block" />
            <span>Dark</span>
          </button>
        </div>

        {/* Follow Vehicle Toggle */}
        <button
          onClick={onToggleFollowBus}
          className={`p-2 rounded-xl shadow-md border backdrop-blur-md transition flex items-center justify-center ${
            followBus
              ? 'bg-orange-600 text-white border-orange-700 shadow-orange-500/20'
              : 'bg-white/95 dark:bg-stone-900/95 text-stone-700 dark:text-stone-300 border-stone-200/90 dark:border-stone-700 hover:bg-stone-100'
          }`}
          title={followBus ? 'Auto-following Bus • Click to unlock map' : 'Lock map onto Bus location'}
        >
          <Crosshair className={`w-4 h-4 ${followBus ? 'animate-spin' : ''}`} />
        </button>

        {/* Fit Bounds */}
        <button
          onClick={handleFitRouteBounds}
          className="p-2 rounded-xl bg-white/95 dark:bg-stone-900/95 text-stone-700 dark:text-stone-300 border border-stone-200/90 dark:border-stone-700 shadow-md hover:bg-stone-100 backdrop-blur-md transition flex items-center justify-center text-xs font-bold"
          title="Fit full Route 14 bounds"
        >
          <span className="font-mono text-[10px]">ALL</span>
        </button>

        {/* Zoom In & Out */}
        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-xl shadow-md border border-stone-200/90 dark:border-stone-700 flex flex-col overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-px bg-stone-200 dark:bg-stone-700 w-full" />
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend (Left) */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-stone-700 shadow-md flex items-center gap-3 text-[10px] font-bold text-stone-600 dark:text-stone-300">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Passed</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse inline-block" />
          <span>Current</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          <span>Upcoming</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-stone-400">
          <span>• 400m Geofence</span>
        </span>
      </div>
    </div>
  );
};
