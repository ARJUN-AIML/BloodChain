import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Building2, Droplets, Truck, Search, AlertTriangle, CheckCircle2,
  Clock, ShieldAlert, Navigation, ArrowRight, Eye, RefreshCw, Activity, Layers, Package
} from 'lucide-react';
import { cn, formatBloodGroup } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { DEMO_ORGANIZATIONS, DEMO_TRANSFERS, DEMO_SHORTAGES } from '@/lib/demo-data';

// Helper component to programmatically pan/zoom Leaflet map
function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// Custom Marker Icons for Operational Status
const createMarkerIcon = (status: 'ADEQUATE' | 'WATCH' | 'CRITICAL' | 'OFFLINE', type: string) => {
  let color = '#059669'; // GREEN (Adequate)
  if (status === 'WATCH') color = '#D97706'; // YELLOW (Watch)
  if (status === 'CRITICAL') color = '#DC2626'; // RED (Critical)
  if (status === 'OFFLINE') color = '#6B7280'; // GRAY (Offline)

  const iconSymbol = type === 'BLOOD_BANK' ? '🩸' : type === 'LOGISTICS' ? '🚛' : '🏥';

  const svg = `
    <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-4" y="-2" width="40" height="46" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3"/>
      </filter>
      <path d="M16 0C7.163 0 0 7.163 0 16C0 27 16 38 16 38C16 38 32 27 32 16C32 7.163 24.837 0 16 0Z" fill="${color}" filter="url(#shadow)"/>
      <circle cx="16" cy="15" r="9" fill="#FFFFFF"/>
      <text x="16" y="19" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#1F2937">${iconSymbol}</text>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-leaflet-facility-marker',
    html: svg,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -34],
  });
};

// Calculate Haversine distance between two coordinates in kilometers
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface FacilityGeographicMapProps {
  height?: string;
  showSearch?: boolean;
  showDetailsPanel?: boolean;
  compact?: boolean;
}

export function FacilityGeographicMap({
  height = '520px',
  showSearch = true,
  showDetailsPanel = true,
  compact = false,
}: FacilityGeographicMapProps) {
  // State from API/DB
  const [facilities, setFacilities] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [shortages, setShortages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.8100, 78.6900]); // Tiruchirappalli Center
  const [mapZoom, setMapZoom] = useState<number>(10.5);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Load data from Django REST APIs
  const loadMapData = async () => {
    setLoading(true);
    try {
      const [facData, invData, transData, shortData] = await Promise.all([
        apiClient.getFacilities().catch(() => DEMO_ORGANIZATIONS),
        apiClient.getInventory().catch(() => []),
        apiClient.getTransfers().catch(() => DEMO_TRANSFERS),
        apiClient.getAnalyticsSummary().then(res => res.shortages || []).catch(() => DEMO_SHORTAGES),
      ]);

      setFacilities(facData && facData.length > 0 ? facData : DEMO_ORGANIZATIONS);
      setInventoryList(invData || []);
      setTransfers(transData || []);
      setShortages(shortData || []);
    } catch (err) {
      console.warn('Backend API fallback to default facilities dataset:', err);
      setFacilities(DEMO_ORGANIZATIONS);
      setTransfers(DEMO_TRANSFERS);
      setShortages(DEMO_SHORTAGES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  // Compute facility operational status dynamically from inventory and active shortages
  const facilityStatusMap = useMemo(() => {
    const statusMap: Record<string, { status: 'ADEQUATE' | 'WATCH' | 'CRITICAL' | 'OFFLINE'; label: string; availableUnits: number }> = {};

    facilities.forEach(fac => {
      if (!fac.is_active && fac.isActive !== undefined && !fac.isActive) {
        statusMap[fac.id] = { status: 'OFFLINE', label: 'Offline', availableUnits: 0 };
        return;
      }

      // Find shortages for this facility
      const facShortages = shortages.filter(s => s.organizationId === fac.id || s.facility === fac.id);
      const hasCriticalShortage = facShortages.some(s => s.severity === 'CRITICAL' || s.severity === 'HIGH');
      const hasModerateShortage = facShortages.some(s => s.severity === 'MODERATE' || s.severity === 'LOW');

      // Calculate available inventory
      const facInv = inventoryList.filter(i => i.facility === fac.id || i.organizationId === fac.id);
      const totalUnits = facInv.length > 0
        ? facInv.reduce((acc, curr) => acc + (curr.usable_units || curr.usableUnits || 0), 0)
        : (fac.availableUnits || 180);

      if (hasCriticalShortage || fac.hasDeficit || totalUnits < 40) {
        statusMap[fac.id] = { status: 'CRITICAL', label: 'Critical Shortage', availableUnits: totalUnits };
      } else if (hasModerateShortage || totalUnits < 90) {
        statusMap[fac.id] = { status: 'WATCH', label: 'Watch Reserve', availableUnits: totalUnits };
      } else {
        statusMap[fac.id] = { status: 'ADEQUATE', label: 'Adequate Inventory', availableUnits: totalUnits };
      }
    });

    return statusMap;
  }, [facilities, inventoryList, shortages]);

  // Active Transfers between facilities (IN_TRANSIT, APPROVED, PENDING_APPROVAL)
  const activeTransferRoutes = useMemo(() => {
    return transfers
      .filter(t => t.status === 'IN_TRANSIT' || t.status === 'APPROVED' || t.status === 'PENDING_APPROVAL' || t.status === 'PREPARING')
      .map(t => {
        const sourceId = t.sourceFacilityId || t.source_facility || t.sourceFacility;
        const destId = t.destinationFacilityId || t.destination_facility || t.destinationFacility;

        const source = facilities.find(f => f.id === sourceId || f.name.toLowerCase() === String(sourceId).toLowerCase());
        const dest = facilities.find(f => f.id === destId || f.name.toLowerCase() === String(destId).toLowerCase());

        if (source && dest && source.latitude && source.longitude && dest.latitude && dest.longitude) {
          const distanceKm = calculateHaversineDistance(
            source.latitude, source.longitude,
            dest.latitude, dest.longitude
          );

          return {
            ...t,
            sourceFacilityObj: source,
            destinationFacilityObj: dest,
            sourceCoords: [source.latitude, source.longitude] as [number, number],
            destCoords: [dest.latitude, dest.longitude] as [number, number],
            distanceKm,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [transfers, facilities]);

  // Filtered facilities based on search and type
  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      const matchQuery =
        !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.city && f.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.region && f.region.toLowerCase().includes(searchQuery.toLowerCase()));

      const fType = f.type || f.facility_type;
      const matchType = typeFilter === 'ALL' || fType === typeFilter;

      return matchQuery && matchType;
    });
  }, [facilities, searchQuery, typeFilter]);

  // Selected Facility Object
  const selectedFacility = useMemo(() => {
    return facilities.find(f => f.id === selectedFacilityId);
  }, [facilities, selectedFacilityId]);

  // Transfers for selected facility
  const selectedFacilityTransfers = useMemo(() => {
    if (!selectedFacilityId) return [];
    return activeTransferRoutes.filter(
      r => r?.sourceFacilityObj.id === selectedFacilityId || r?.destinationFacilityObj.id === selectedFacilityId
    );
  }, [activeTransferRoutes, selectedFacilityId]);

  const handleSelectFacility = (fac: any) => {
    setSelectedFacilityId(fac.id);
    if (fac.latitude && fac.longitude) {
      setMapCenter([fac.latitude, fac.longitude]);
      setMapZoom(13);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      {showSearch && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search facility name, region, or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 rounded-xl border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#841A2B] focus:ring-1 focus:ring-[#841A2B]"
            />
          </div>

          {/* Facility Type Selector */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-stone-50 rounded-xl border border-stone-200 text-stone-800 font-medium focus:outline-none focus:border-[#841A2B]"
            >
              <option value="ALL">All Facility Types</option>
              <option value="HOSPITAL">Hospitals</option>
              <option value="BLOOD_BANK">Blood Banks</option>
              <option value="LOGISTICS">Logistics Centers</option>
            </select>

            <button
              type="button"
              onClick={loadMapData}
              className="p-2 text-stone-600 hover:text-stone-900 bg-stone-50 rounded-xl border border-stone-200 transition-colors"
              title="Refresh facility data from database"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Map & Detailed Info Panel */}
      <div className={cn('grid grid-cols-1 gap-4', showDetailsPanel && 'lg:grid-cols-12')}>
        {/* Leaflet Geographic Map Container */}
        <div className={cn('bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs relative', showDetailsPanel ? 'lg:col-span-8' : 'w-full')}>
          <div style={{ height }} className="w-full relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <MapFlyTo center={mapCenter} zoom={mapZoom} />

              {/* OpenStreetMap Basemap Layer */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Active Transfer Polyline Routes */}
              {activeTransferRoutes.map((route: any) => {
                const isSelected = selectedFacilityId === route.sourceFacilityObj.id || selectedFacilityId === route.destinationFacilityObj.id;

                return (
                  <Polyline
                    key={route.id}
                    positions={[route.sourceCoords, route.destCoords]}
                    pathOptions={{
                      color: route.status === 'IN_TRANSIT' ? '#0284C7' : '#D97706',
                      weight: isSelected ? 4 : 3,
                      dashArray: route.status === 'IN_TRANSIT' ? '6, 8' : '4, 4',
                      opacity: 0.85,
                    }}
                  >
                    <Tooltip sticky direction="top" className="custom-transfer-tooltip">
                      <div className="p-1 font-sans text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-stone-900 border-b pb-1">
                          <Truck className="w-3.5 h-3.5 text-sky-600" />
                          <span>Active Transfer #{route.id}</span>
                        </div>
                        <p className="text-[11px] text-stone-700 font-semibold">
                          {route.sourceFacilityObj.name} → {route.destinationFacilityObj.name}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-stone-600 font-mono">
                          <span>Product: <strong>{formatBloodGroup(route.bloodGroup || route.blood_group)} ({route.quantity || route.requested_quantity} units)</strong></span>
                          <span>Status: <strong className="text-sky-700">{route.status}</strong></span>
                        </div>
                        <p className="text-[10px] text-stone-500 font-mono pt-0.5">
                          Geographic distance: {route.distanceKm} km
                        </p>
                      </div>
                    </Tooltip>
                  </Polyline>
                );
              })}

              {/* Database Facility Markers */}
              {filteredFacilities.map(f => {
                const statusInfo = facilityStatusMap[f.id] || { status: 'ADEQUATE', label: 'Adequate Inventory', availableUnits: f.availableUnits || 180 };
                const fType = f.type || f.facility_type;

                return (
                  <Marker
                    key={f.id}
                    position={[f.latitude, f.longitude]}
                    icon={createMarkerIcon(statusInfo.status, fType)}
                    eventHandlers={{
                      click: () => handleSelectFacility(f),
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-2 font-sans text-xs max-w-xs">
                        <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-1.5">
                          <div>
                            <span className="font-bold text-stone-900 text-sm block">{f.name}</span>
                            <span className="text-[10px] text-stone-500 font-medium uppercase">{fType} • {f.city}</span>
                          </div>
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider',
                            statusInfo.status === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                            statusInfo.status === 'WATCH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            statusInfo.status === 'OFFLINE' ? 'bg-stone-200 text-stone-700' :
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          )}>
                            {statusInfo.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-stone-600">{f.address}</p>

                        <div className="bg-stone-50 p-2 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs font-mono">
                          <span className="text-stone-500 text-[10px]">Usable Stock:</span>
                          <span className="font-bold text-[#841A2B] text-sm">{statusInfo.availableUnits} units</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectFacility(f)}
                          className="w-full py-1.5 rounded-lg bg-[#841A2B] hover:bg-[#701524] text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Detailed Facility Record
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-stone-200/90 shadow-md text-[10px] space-y-1.5 font-medium text-stone-700">
              <span className="font-bold text-stone-900 block border-b pb-1 text-[11px]">Operational Status Legend</span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Adequate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Watch
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  Critical Shortage
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                  Offline
                </span>
              </div>
              <div className="pt-1 border-t border-stone-100 flex items-center gap-1.5 text-sky-700 font-semibold">
                <span className="w-3 h-0.5 bg-sky-600 border-t border-dashed" />
                Active Transfer Route
              </div>
            </div>
          </div>
        </div>

        {/* Right Details Panel for Selected Facility */}
        {showDetailsPanel && (
          <div className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            {selectedFacility ? (
              <div className="space-y-4 text-xs">
                {/* Header */}
                <div className="pb-3 border-b border-stone-100 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#841A2B] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                      {selectedFacility.type || selectedFacility.facility_type}
                    </span>
                    <h3 className="text-base font-bold text-stone-900 mt-1">{selectedFacility.name}</h3>
                    <p className="text-[11px] text-stone-500 font-medium">{selectedFacility.region} • {selectedFacility.city}</p>
                  </div>
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    facilityStatusMap[selectedFacility.id]?.status === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                    facilityStatusMap[selectedFacility.id]?.status === 'WATCH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  )}>
                    {facilityStatusMap[selectedFacility.id]?.status || 'ADEQUATE'}
                  </span>
                </div>

                {/* Location & Contact */}
                <div className="space-y-1 text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <p><strong>Address:</strong> {selectedFacility.address}</p>
                  <p><strong>Phone:</strong> {selectedFacility.phone || '+91 431 240 0000'}</p>
                  <p className="font-mono text-[10px] text-stone-400">
                    GPS: {selectedFacility.latitude?.toFixed(4)}°N, {selectedFacility.longitude?.toFixed(4)}°E
                  </p>
                </div>

                {/* Database Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-500 block">Total Usable Stock</span>
                    <span className="text-base font-mono font-bold text-[#841A2B]">
                      {facilityStatusMap[selectedFacility.id]?.availableUnits || 180} units
                    </span>
                  </div>
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-500 block">Bed Capacity</span>
                    <span className="text-base font-mono font-bold text-stone-900">
                      {selectedFacility.bed_capacity || selectedFacility.bedCapacity || '—'} beds
                    </span>
                  </div>
                </div>

                {/* Active Transfers involving this facility */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-600" />
                    Active Facility Transfers
                  </h4>
                  {selectedFacilityTransfers.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {selectedFacilityTransfers.map((tr: any) => (
                        <div key={tr.id} className="p-2 bg-sky-50/60 rounded-xl border border-sky-200 space-y-1">
                          <div className="flex justify-between font-mono text-[10px] font-bold text-stone-900">
                            <span>#{tr.id}</span>
                            <span className="text-sky-700">{tr.status}</span>
                          </div>
                          <p className="text-[11px] text-stone-700">
                            {tr.sourceFacilityObj.name} → {tr.destinationFacilityObj.name}
                          </p>
                          <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                            <span>{formatBloodGroup(tr.bloodGroup || tr.blood_group)} ({tr.quantity || tr.requested_quantity} units)</span>
                            <span>{tr.distanceKm} km</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-400 italic">No active transfer legs for this facility.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                <Building2 className="w-8 h-8 text-stone-300" />
                <p className="text-xs font-semibold text-stone-600">Select a facility marker on the geographic map to view database records.</p>
                <p className="text-[11px] text-stone-400">Click any marker or search using the top selector.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
