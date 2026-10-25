/**
 * Top & Bottom Simulation Toolbar
 */
import React from 'react';
import { ToolMode } from '../types/traffic';

interface ToolbarProps {
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  simSpeed: number;
  onSetSimSpeed: (speed: number) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  trafficDensity: number;
  onSetTrafficDensity: (density: number) => void;
  onSpawnEmergency: () => void;
  onClearVehicles: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  toolMode,
  onSetToolMode,
  isPlaying,
  onTogglePlay,
  onStep,
  simSpeed,
  onSetSimSpeed,
  showHeatmap,
  onToggleHeatmap,
  trafficDensity,
  onSetTrafficDensity,
  onSpawnEmergency,
  onClearVehicles,
}) => {
  const tools: { id: ToolMode; label: string; icon: string; desc: string }[] = [
    { id: 'select', label: 'Select', icon: '↖', desc: 'Inspect vehicles, junctions, or roads' },
    { id: 'add_road', label: 'Add Road', icon: '🛣', desc: 'Connect nodes or click empty space' },
    { id: 'add_junction', label: 'Add Junction', icon: '🚦', desc: 'Place signalized intersection' },
    { id: 'spawn_agent', label: 'Spawn Car', icon: '🚗', desc: 'Click road to drop agent' },
    { id: 'delete', label: 'Delete', icon: '✕', desc: 'Click to remove road or junction' },
    { id: 'pan', label: 'Pan', icon: '✋', desc: 'Drag canvas view' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-900/95 border-b border-slate-800 text-slate-200 backdrop-blur-md">
      {/* Zone 1: Editor Tool Selector */}
      <div className="flex items-center gap-1 p-1 bg-slate-950/70 rounded-lg border border-slate-800">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => onSetToolMode(t.id)}
            title={t.desc}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              toolMode === t.id
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Zone 2: Simulation Playback & Speed Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
        >
          <span>{isPlaying ? '⏸' : '▶'}</span>
          <span>{isPlaying ? 'Pause' : 'Play Simulation'}</span>
        </button>

        <button
          onClick={onStep}
          disabled={isPlaying}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800 transition-colors ${
            isPlaying
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : 'hover:bg-slate-700 text-slate-200'
          }`}
          title="Step frame forward 0.1s"
        >
          Step ⏭
        </button>

        {/* Speed multiplier segmented control */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950/70 rounded-lg border border-slate-800 text-xs font-mono">
          {[0.5, 1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => onSetSimSpeed(spd)}
              className={`px-2 py-1 rounded transition-colors ${
                simSpeed === spd
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Zone 3: Traffic Density, Emergency & Heatmap Controls */}
      <div className="flex items-center gap-3">
        {/* Global Spawn Rate Slider */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 whitespace-nowrap">Traffic Density:</span>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.1"
            value={trafficDensity}
            onChange={(e) => onSetTrafficDensity(Number(e.target.value))}
            className="w-20 accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            title={`Traffic inflow factor: ${trafficDensity}x`}
          />
          <span className="text-[11px] font-mono text-slate-400 tabular-nums w-8">
            {trafficDensity}x
          </span>
        </div>

        {/* Heatmap toggle */}
        <button
          onClick={onToggleHeatmap}
          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
            showHeatmap
              ? 'bg-rose-950/70 border-rose-500/80 text-rose-200 font-medium'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle velocity & congestion heatmap visualization"
        >
          Heatmap
        </button>

        {/* Spawn Ambulance */}
        <button
          onClick={onSpawnEmergency}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-700/80 text-red-200 font-medium transition-colors whitespace-nowrap"
          title="Inject emergency ambulance with lights and sirens"
        >
          🚑 Ambulance
        </button>

        {/* Clear vehicles */}
        <button
          onClick={onClearVehicles}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap"
          title="Clear all vehicles from network"
        >
          Clear Cars
        </button>
      </div>
    </div>
  );
};
