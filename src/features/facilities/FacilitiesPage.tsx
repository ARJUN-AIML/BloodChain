import { useState } from 'react';
import { Building2, MapPin, Phone, AlertTriangle, CheckCircle2, Bed, Droplets, Filter, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_ORGANIZATIONS, SYNTHETIC_DATA_NOTICE } from '@/lib/demo-data';
import { FacilityGeographicMap } from '@/components/map/FacilityGeographicMap';

const TRICHY_SUB_REGIONS = [
  'ALL',
  'Tiruchirappalli City',
  'Srirangam',
  'Kattur',
  'Navalpattu',
  'Thuvakudi',
  'Manachanallur',
  'Lalgudi',
  'Musiri',
  'Viralimalai',
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Governance Header Notice */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold font-mono tracking-wide">{SYNTHETIC_DATA_NOTICE}</p>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              Live facility records, inventory levels, and OpenStreetMap geographic coordinates for the Tiruchirappalli regional blood logistics network.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 font-mono font-bold text-[10px] text-emerald-400 uppercase whitespace-nowrap self-start sm:self-auto">
          Tiruchirappalli Cluster
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tiruchirappalli Regional Facility Network Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic distribution, blood reserve capacity, and live shortage monitoring across Trichy regional facilities
          </p>
        </div>
      </div>

      {/* Interactive Geographic Leaflet Map */}
      <FacilityGeographicMap height="520px" showSearch={true} showDetailsPanel={true} />

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
                  {facility.bedCapacity || '-'}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block">ICU Beds</span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {facility.icuBeds || '-'}
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
