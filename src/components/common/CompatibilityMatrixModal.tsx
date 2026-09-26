import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Activity, Info, Droplets } from 'lucide-react';
import type { BloodGroup, ComponentType } from '@/types';
import { DEMO_INVENTORY } from '@/lib/demo-data';

interface CompatibilityMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_BLOOD_GROUPS: BloodGroup[] = [
  'O_NEGATIVE', 'O_POSITIVE',
  'A_NEGATIVE', 'A_POSITIVE',
  'B_NEGATIVE', 'B_POSITIVE',
  'AB_NEGATIVE', 'AB_POSITIVE'
];

const DISPLAY_BG: Record<BloodGroup, string> = {
  O_NEGATIVE: 'O-',
  O_POSITIVE: 'O+',
  A_NEGATIVE: 'A-',
  A_POSITIVE: 'A+',
  B_NEGATIVE: 'B-',
  B_POSITIVE: 'B+',
  AB_NEGATIVE: 'AB-',
  AB_POSITIVE: 'AB+',
};

// Compatible Donors for Red Blood Cells / Whole Blood
const RBC_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  O_NEGATIVE: ['O_NEGATIVE'],
  O_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE'],
  A_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE'],
  A_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE'],
  B_NEGATIVE: ['O_NEGATIVE', 'B_NEGATIVE'],
  B_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE'],
  AB_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE', 'B_NEGATIVE', 'AB_NEGATIVE'],
  AB_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
};

// Compatible Donors for Plasma (Reverse Compatibility)
const PLASMA_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  O_NEGATIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  O_POSITIVE: ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'],
  A_NEGATIVE: ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  A_POSITIVE: ['A_POSITIVE', 'AB_POSITIVE'],
  B_NEGATIVE: ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  B_POSITIVE: ['B_POSITIVE', 'AB_POSITIVE'],
  AB_NEGATIVE: ['AB_NEGATIVE', 'AB_POSITIVE'],
  AB_POSITIVE: ['AB_POSITIVE', 'AB_NEGATIVE'],
};

export const CompatibilityMatrixModal: React.FC<CompatibilityMatrixModalProps> = ({ isOpen, onClose }) => {
  const [selectedRecipient, setSelectedRecipient] = useState<BloodGroup>('O_NEGATIVE');
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('RBC');

  if (!isOpen) return null;

  const isPlasma = selectedComponent === 'PLASMA';
  const compatibleDonors = isPlasma ? PLASMA_COMPATIBILITY[selectedRecipient] : RBC_COMPATIBILITY[selectedRecipient];

  // Calculate live Trichy 30km network inventory for compatible blood groups
  const inventoryByGroup = ALL_BLOOD_GROUPS.reduce((acc, bg) => {
    const total = DEMO_INVENTORY
      .filter(i => i.bloodGroup === bg && (selectedComponent === 'WHOLE_BLOOD' ? true : i.componentType === selectedComponent))
      .reduce((sum, i) => sum + i.availableUnits, 0);
    acc[bg] = total;
    return acc;
  }, {} as Record<BloodGroup, number>);

  const totalCompatibleUnits = compatibleDonors.reduce((sum, bg) => sum + (inventoryByGroup[bg] || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (Pinned) */}
        <div className="bg-gradient-to-r from-[#841A2B] to-[#5C121E] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20">
              <Droplets className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg leading-tight">Clinical Blood Group & Component Compatibility Solver</h2>
              <p className="text-xs text-red-100 font-mono">Tiruchirappalli Regional Network Standard • Serological Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-stone-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* Component & Recipient Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                1. Select Recipient Patient Blood Group
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ALL_BLOOD_GROUPS.map(bg => (
                  <button
                    key={bg}
                    onClick={() => setSelectedRecipient(bg)}
                    className={`py-2 px-3 rounded-lg font-mono font-bold text-xs transition border flex items-center justify-center gap-1 ${
                      selectedRecipient === bg
                        ? 'bg-[#841A2B] text-white border-[#841A2B] shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {DISPLAY_BG[bg]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                2. Select Required Component
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['RBC', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'] as ComponentType[]).map(comp => (
                  <button
                    key={comp}
                    onClick={() => setSelectedComponent(comp)}
                    className={`py-2.5 px-3 rounded-lg font-mono font-bold text-xs transition border ${
                      selectedComponent === comp
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {comp === 'RBC' ? 'Packed Red Cells (PRBC)' : comp === 'PLASMA' ? 'Fresh Frozen Plasma' : comp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result Banner */}
          <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Compatibility Summary</p>
                <p className="text-sm font-bold text-stone-900">
                  Patient <span className="font-mono text-[#841A2B] bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{DISPLAY_BG[selectedRecipient]}</span> can safely receive <span className="font-mono text-stone-900 font-bold">{selectedComponent}</span> from <span className="font-bold text-emerald-900">{compatibleDonors.length} donor type(s)</span>.
                </p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200 text-right shrink-0">
              <p className="text-[10px] uppercase font-bold text-stone-500">Trichy 30km Stock</p>
              <p className="text-xl font-mono font-extrabold text-emerald-800">{totalCompatibleUnits} <span className="text-xs font-sans font-normal text-stone-600">units</span></p>
            </div>
          </div>

          {/* Full Grid Matrix */}
          <div>
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Full Compatibility Breakdown matrix</span>
              <span className="text-[11px] font-normal text-stone-500 font-mono">Trichy 30km Inventory Pool</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_BLOOD_GROUPS.map(bg => {
                const isCompatible = compatibleDonors.includes(bg);
                const units = inventoryByGroup[bg] || 0;
                return (
                  <div
                    key={bg}
                    className={`p-3 rounded-xl border transition ${
                      isCompatible
                        ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-400'
                        : 'bg-stone-50 border-stone-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-sm text-stone-900">{DISPLAY_BG[bg]}</span>
                      {isCompatible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Compatible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                          Incompatible
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-between mt-2 pt-2 border-t border-stone-200/60">
                      <span className="text-[11px] text-stone-500 font-medium">Available Stock:</span>
                      <span className="font-mono font-bold text-xs text-stone-900">{units} units</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Guidance Footnote */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Clinical Logistics Note — Universal Donor Standards</p>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                <strong className="text-amber-950">O-Negative</strong> is the universal donor for Packed Red Blood Cells (RBC) and Emergency Transfusions.
                <strong className="text-amber-950"> AB-Positive</strong> is the universal recipient for RBC, while <strong className="text-amber-950">AB-Negative/Positive</strong> is the universal donor for Fresh Frozen Plasma (FFP). Cross-matching must be verified at hospital bedside prior to infusion.
              </p>
            </div>
          </div>

        </div>

        {/* Footer (Pinned) */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span className="font-mono">Tiruchirappalli Protocol Rulebook • Version 2.4</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition"
          >
            Close Matrix Solver
          </button>
        </div>

      </div>
    </div>
  );
};
