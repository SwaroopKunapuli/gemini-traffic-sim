/**
 * Microscopic Vehicle Agent Inspector & Telemetry Deck
 */
import React from 'react';
import { TrafficSimulationEngine } from '../simulation/engine';

interface VehicleInspectorProps {
  vehicleId: string;
  engine: TrafficSimulationEngine;
  followVehicle: boolean;
  onToggleFollow: () => void;
  onClose: () => void;
  onRemove: () => void;
}

export const VehicleInspector: React.FC<VehicleInspectorProps> = ({
  vehicleId,
  engine,
  followVehicle,
  onToggleFollow,
  onClose,
  onRemove,
}) => {
  const agent = engine.vehicles.get(vehicleId);
  if (!agent) return null;

  const currentRoad = engine.roads.get(agent.currentRoadId);
  const speedKmh = Math.round(agent.speed * 3.6);
  const desiredKmh = Math.round(agent.profile.desiredSpeed);
  const speedRatio = Math.min(100, Math.round((speedKmh / desiredKmh) * 100));

  return (
    <div className="w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-5 text-slate-200 flex flex-col gap-4 text-sm font-sans backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-sm border border-slate-950"
            style={{ backgroundColor: agent.color }}
          />
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight capitalize">
              {agent.type} Agent
            </h2>
            <div className="text-xs text-slate-400 font-mono">
              ID: {agent.id.replace('veh_', '')}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          ✕
        </button>
      </div>

      {/* Speedometer & Kinematics */}
      <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800 flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-400">Current Velocity</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {speedKmh}
            </span>
            <span className="text-xs text-slate-400">km/h</span>
          </div>
        </div>

        {/* Speed Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              speedRatio < 30 ? 'bg-amber-500' : 'bg-sky-500'
            }`}
            style={{ width: `${speedRatio}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>0 km/h</span>
          <span>Target: {desiredKmh} km/h</span>
        </div>
      </div>

      {/* Driver Archetype & IDM Parameters */}
      <div className="flex flex-col gap-2 text-xs">
        <div className="text-slate-400 font-medium">Driver Agent Behavioral Profile</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800">
            <div className="text-slate-500 text-[10px]">Personality</div>
            <div className="font-semibold text-sky-400 capitalize">
              {agent.personality}
            </div>
          </div>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800">
            <div className="text-slate-500 text-[10px]">Safe Headway (T)</div>
            <div className="font-mono text-slate-200">{agent.profile.timeHeadway}s</div>
          </div>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800">
            <div className="text-slate-500 text-[10px]">Min Jam Gap (s₀)</div>
            <div className="font-mono text-slate-200">{agent.profile.minDistance}m</div>
          </div>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800">
            <div className="text-slate-500 text-[10px]">Max Accel (a)</div>
            <div className="font-mono text-slate-200">
              {agent.profile.maxAcceleration} m/s²
            </div>
          </div>
        </div>
      </div>

      {/* Current State & Maneuver */}
      <div className="flex flex-col gap-2 text-xs border-t border-slate-800 pt-3">
        <div className="flex justify-between">
          <span className="text-slate-400">Current Road</span>
          <span className="text-slate-200 font-mono truncate max-w-[150px]">
            {currentRoad?.name || agent.currentRoadId}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Current Lane</span>
          <span className="text-slate-200 font-mono">
            Lane {agent.laneIndex + 1} of {currentRoad?.lanes || 1}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Braking State</span>
          <span
            className={`font-medium ${
              agent.brakeLight ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {agent.brakeLight ? 'Active Braking' : 'Coast / Accel'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Signal Indicator</span>
          <span className="text-slate-200 font-mono uppercase">
            {agent.turnSignal === 'none' ? 'Straight' : `${agent.turnSignal} Turn`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Wait / Delay Time</span>
          <span className="text-slate-200 font-mono tabular-nums">
            {Math.round(agent.totalWaitTime)}s
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={onToggleFollow}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
            followVehicle
              ? 'bg-sky-500 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          {followVehicle ? 'Camera Tracking' : 'Track Vehicle'}
        </button>
        <button
          onClick={onRemove}
          className="py-1.5 px-3 bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 text-red-200 rounded-lg text-xs font-medium transition-colors"
        >
          Despawn
        </button>
      </div>
    </div>
  );
};
