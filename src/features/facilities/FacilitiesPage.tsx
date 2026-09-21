import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Building2, MapPin, Phone, AlertTriangle, CheckCircle2, Bed, Droplets, Filter, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, SYNTHETIC_DATA_NOTICE } from '@/lib/demo-data';

// Custom Leaflet marker icons with clinical precision styling
const createMarkerIcon = (hasDeficit: boolean, type: string) => {
  const color = hasDeficit ? '#DC2626' : (type === 'BLOOD_BANK' ? '#0284C7' : '#059669');
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

const TRICHY_SUB_REGIONS = [
  'ALL',
  'Tiruchirappalli City',
  'Srirangam',
  'Thuvakudi',
  'Manachanallur',
  'Lalgudi',
  'Thuraiyur',
  'Musiri',
  'Manapparai',
];

export function FacilitiesPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const facilities = DEMO_ORGANIZATIONS.filter(o => {
    if (selectedRegion !== 'ALL' && o.region !== selectedRegion) return false;
    if (selectedType !== 'ALL' && o.type !== selectedType) return false;
    return true;
  });

  // Centered over Tiruchirappalli (Trichy) District, Tamil Nadu
  const mapCenter: [number, number] = [10.8100, 78.6900];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Synthetic Data Governance Header Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold font-mono tracking-wide">{SYNTHETIC_DATA_NOTICE}</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              All facilities, inventory levels, and geographic coordinates are proposed simulation nodes for the Tiruchirappalli regional research cluster. No live institutional participation or real blood availability is claimed.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-amber-200/80 font-mono font-bold text-[10px] text-amber-950 uppercase whitespace-nowrap self-start sm:self-auto">
          Tiruchirappalli Cluster
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tiruchirappalli Regional Facility Network Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic distribution, blood reserve capacity, and live shortage monitoring across simulated Trichy facilities
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Sub-Regions (Trichy District)</option>
              {TRICHY_SUB_REGIONS.filter(r => r !== 'ALL').map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Facility Types</option>
              <option value="HOSPITAL">Hospitals (Simulated)</option>
              <option value="BLOOD_BANK">Blood Banks (Simulated)</option>
              <option value="LOGISTICS">Logistics Depots</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map for Tiruchirappalli */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs p-2">
        <div className="h-96 w-full rounded-xl overflow-hidden relative">
          <MapContainer center={mapCenter} zoom={10} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            />
            {facilities.map(f => (
              <Marker
                key={f.id}
                position={[f.latitude, f.longitude]}
                icon={createMarkerIcon(f.hasDeficit || false, f.type)}
              >
                <Popup>
                  <div className="p-1 space-y-1 font-sans text-xs">
                    <div className="flex items-center justify-between gap-2 border-b pb-1">
                      <span className="font-bold text-slate-900">{f.name}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-bold',
                        f.hasDeficit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                      )}>
                        {f.hasDeficit ? 'CRITICAL DEFICIT' : 'STABLE'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">{f.region} • {f.city}</p>
                    <p className="text-[10px] text-slate-600">{f.address}</p>
                    <div className="flex justify-between pt-1 font-mono text-[11px]">
                      <span>Available: <strong>{f.availableUnits} units</strong></span>
                      {f.bedCapacity > 0 && <span>Beds: {f.bedCapacity}</span>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Facility Inventory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map(facility => (
          <div
            key={facility.id}
            className={cn(
              'bg-white border rounded-2xl p-5 shadow-xs transition-all space-y-3',
              facility.hasDeficit
                ? 'border-red-300 bg-red-50/20 ring-1 ring-red-400/30'
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                    {facility.region}
                  </span>
                  {facility.hasDeficit && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 animate-pulse">
                      SHORTAGE RISK
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{facility.name}</h3>
              </div>

              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                facility.type === 'BLOOD_BANK' ? 'bg-sky-50 text-sky-600' :
                facility.type === 'LOGISTICS' ? 'bg-amber-50 text-amber-600' :
                facility.hasDeficit ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              )}>
                {facility.type === 'BLOOD_BANK' ? <Droplets className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">{facility.address}</p>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Available</span>
                <span className={cn(
                  'text-sm font-mono font-bold',
                  facility.hasDeficit ? 'text-red-600' : 'text-slate-900'
                )}>
                  {facility.availableUnits}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Beds</span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {facility.bedCapacity || '—'}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block">ICU Beds</span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {facility.icuBeds || '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{facility.phone}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {facility.latitude.toFixed(4)}°N, {facility.longitude.toFixed(4)}°E
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
