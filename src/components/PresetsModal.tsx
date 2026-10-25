/**
 * Preset Scenarios Selection Modal
 */
import React from 'react';
import { PRESET_SCENARIOS, PresetScenario } from '../simulation/presets';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetScenario) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Preset Road Networks & Scenarios</h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Select a scenario to inspect traffic signal phasing, rotation, and agent behaviors
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* List of Presets */}
        <div className="p-6 overflow-y-auto flex flex-col gap-3">
          {PRESET_SCENARIOS.map((preset) => (
            <div
              key={preset.id}
              className="p-4 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-sky-500/50 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-1.5 max-w-md">
                <div className="text-sm font-semibold text-white">
                  {preset.name}
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  {preset.description}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>{preset.nodes.length} Nodes</span>
                  <span aria-hidden="true">·</span>
                  <span>{preset.roads.length} Road Segments</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {preset.nodes.filter((n) => n.isIntersection).length} Junction
                    {preset.nodes.filter((n) => n.isIntersection).length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap self-start sm:self-center shadow-sm"
              >
                Load Scenario
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
