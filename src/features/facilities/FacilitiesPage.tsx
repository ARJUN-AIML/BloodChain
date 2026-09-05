import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Building2, MapPin, Phone, AlertTriangle, CheckCircle2, Bed, Droplets, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_ORGANIZATIONS } from '@/lib/demo-data';

// Custom Leaflet marker icons matching warm rust / sage theme
const createMarkerIcon = (hasDeficit: boolean, type: string) => {
  const color = hasDeficit ? '#C85A3F' : '#5B8C7A';
  const svg = `
    <svg width="28" height="34" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 30 12 30C12 30 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="#FFFFFF"/>
    </svg>
  `;
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svg,
    iconSize: [28, 34],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
};

export function FacilitiesPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const facilities = DEMO_ORGANIZATIONS.filter(o => {
    if (selectedRegion !== 'ALL' && o.region !== selectedRegion) return false;
    if (selectedType !== 'ALL' && o.type !== selectedType) return false;
    return true;
  });

  const mapCenter: [number, number] = [28.6139, 77.2090]; // Delhi / Regional Metropolis center

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E2DC]">
        <div>
          <h2 className="text-xl font-bold text-[#1A1F26] tracking-tight">Regional Facility Network Map</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Geographic distribution, blood reserve capacity, and live shortage monitoring across facilities
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E2E2DC] text-xs">
            <Filter className="w-3.5 h-3.5 text-[#64748B]" />
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="bg-transparent font-medium text-[#1A1F26] focus:outline-none"
            >
              <option value="ALL">All Regions</option>
              <option value="Central">Central Region</option>
              <option value="North">North Region</option>
              <option value="South">South Region</option>
              <option value="East">East Region</option>
              <option value="West">West Region</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E2E2DC] text-xs">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-transparent font-medium text-[#1A1F26] focus:outline-none"
            >
              <option value="ALL">All Facility Types</option>
              <option value="HOSPITAL">Hospitals</option>
              <option value="BLOOD_BANK">Blood Banks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map Preview (CartoDB Positron style) */}
      <div className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl overflow-hidden shadow-flat p-2">
        <div className="h-80 w-full rounded-lg overflow-hidden relative">
          <MapContainer center={mapCenter} zoom={11} scrollWheelZoom={false} className="h-full w-full">
            {/* Light Cartographic Tile Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            />
            {facilities.map(f => (
              <Marker
                key={f.id}
                position={[f.latitude, f.longitude]}
                icon={createMarkerIcon(!!f.hasDeficit, f.type)}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <p className="font-bold text-[#1A1F26]">{f.name}</p>
                    <p className="text-[10px] text-[#64748B] uppercase">{f.type} • {f.region} Region</p>
                    <p className="text-xs font-semibold text-[#1A1F26] pt-1">
                      Available Stock: <strong className="text-[#5B8C7A]">{f.availableUnits || 180} units</strong>
                    </p>
                    {f.hasDeficit && (
                      <p className="text-[10px] font-bold text-[#C85A3F] flex items-center gap-1">
                        ⚠ Deficit Reported
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map Legend overlay */}
          <div className="absolute bottom-3 right-3 bg-[#FFFFFF]/90 backdrop-blur border border-[#E2E2DC] rounded-lg p-2.5 shadow-soft z-[1000] text-[11px] space-y-1">
            <p className="font-bold text-[#1A1F26] mb-1">Map Legend</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B8C7A]" />
              <span className="text-[#64748B]">Optimal Stock</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C85A3F]" />
              <span className="text-[#64748B]">Active Deficit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map(f => {
          const isHospital = f.type === 'HOSPITAL';
          return (
            <div
              key={f.id}
              className="bg-[#FFFFFF] border border-[#E2E2DC] rounded-xl p-4 shadow-flat hover:border-[#D4D4CE] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F4F0] text-[#64748B] border border-[#E2E2DC]">
                      {f.region} • {f.type}
                    </span>
                    <h3 className="text-sm font-bold text-[#1A1F26] mt-1.5">{f.name}</h3>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0',
                    f.hasDeficit
                      ? 'bg-[#FDF6F0] text-[#C85A3F] border-[#F1D6C5]'
                      : 'bg-[#E3EFEA] text-[#5B8C7A] border-[#5B8C7A]/20'
                  )}>
                    {f.hasDeficit ? 'Deficit' : 'Optimal'}
                  </span>
                </div>

                <p className="text-xs text-[#64748B] flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                  {f.address}
                </p>
                <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                  {f.phone}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#E2E2DC]">
                  <div className="bg-[#F7F7F5] p-2 rounded-lg text-center">
                    <p className="text-[10px] text-[#64748B]">Available Stock</p>
                    <p className="text-base font-bold text-[#1A1F26] font-mono mt-0.5">
                      {f.availableUnits || 180} <span className="text-[10px] font-normal text-[#64748B]">units</span>
                    </p>
                  </div>

                  <div className="bg-[#F7F7F5] p-2 rounded-lg text-center">
                    <p className="text-[10px] text-[#64748B]">{isHospital ? 'Bed Capacity' : 'Storage Capacity'}</p>
                    <p className="text-base font-bold text-[#1A1F26] font-mono mt-0.5">
                      {isHospital ? `${f.bedCapacity || 450} beds` : `${f.storageCapacityUnits || 2500} units`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#E2E2DC] flex items-center justify-between text-[11px]">
                <span className="text-[#64748B]">Node ID: <strong className="font-mono text-[#1A1F26]">{f.id}</strong></span>
                <span className="text-[#5C768D] font-medium hover:underline cursor-pointer">View Node Details →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
