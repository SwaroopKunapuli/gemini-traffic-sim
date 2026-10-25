/**
 * Top Navigation Bar complying with the Top Bar Contract
 */
import React from 'react';

interface TopNavProps {
  onOpenPresets: () => void;
  onOpenGuide: () => void;
  onExport: () => void;
  onNewNetwork: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenPresets,
  onOpenGuide,
  onExport,
  onNewNetwork,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-2 text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        <span>AgentFlow Traffic Simulator</span>
      </div>

      {/* Zone 2: Nav Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={onOpenPresets}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          Preset Scenarios
        </button>
        <button
          onClick={onOpenGuide}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          Signal & ABM Guide
        </button>
        <button
          onClick={onExport}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          Export / Import Network
        </button>
        <button
          onClick={onNewNetwork}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          Blank Canvas
        </button>
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenPresets}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          Choose Scenario
        </button>
      </div>
    </header>
  );
};
