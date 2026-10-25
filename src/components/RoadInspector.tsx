/**
 * Road Segment Customization & Lane Configuration Inspector
 */
import React from 'react';
import { TrafficSimulationEngine } from '../simulation/engine';
import { getRoadLength } from '../simulation/network';

interface RoadInspectorProps {
  roadId: string;
  engine: TrafficSimulationEngine;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export const RoadInspector: React.FC<RoadInspectorProps> = ({
  roadId,
  engine,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const road = engine.roads.get(roadId);
  if (!road) return null;

  const fromNode = engine.nodes.get(road.fromNodeId);
  const toNode = engine.nodes.get(road.toNodeId);
  const length = fromNode && toNode ? Math.round(getRoadLength(road, fromNode, toNode)) : 0;
  const vehiclesOnRoad = Array.from(engine.vehicles.values()).filter((v) => v.currentRoadId === road.id);

  const handleLanesChange = (lanes: number) => {
    road.lanes = lanes;
    onUpdate();
  };

  const handleSpeedLimitChange = (speed: number) => {
    road.speedLimit = speed;
    onUpdate();
  };

  const handleSpawnRateChange = (rate: number) => {
    road.spawnRate = rate;
    onUpdate();
  };

  return (
    <div className="w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-5 text-slate-200 flex flex-col gap-4 text-sm font-sans backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            {road.name || `Road ${road.id}`}
          </h2>
          <div className="text-xs text-slate-400 font-mono">
            Length: {length}m · {vehiclesOnRoad.length} active agent{vehiclesOnRoad.length === 1 ? '' : 's'}
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

      {/* Number of Lanes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Number of Lanes</label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-lg border border-slate-800">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => handleLanesChange(num)}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                road.lanes === num
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {num} {num === 1 ? 'Lane' : 'Lanes'}
            </button>
          ))}
        </div>
      </div>

      {/* Speed Limit Slider */}
      <div className="flex flex-col gap-1.5 p-3 bg-slate-950/40 rounded-lg border border-slate-800/80">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-medium">Speed Limit</span>
          <span className="font-mono text-slate-200 tabular-nums">{road.speedLimit} km/h</span>
        </div>
        <input
          type="range"
          min="30"
          max="90"
          step="5"
          value={road.speedLimit}
          onChange={(e) => handleSpeedLimitChange(Number(e.target.value))}
          className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>30 km/h (Urban)</span>
          <span>90 km/h (Express)</span>
        </div>
      </div>

      {/* Spawn Rate Slider (if entrance) */}
      <div className="flex flex-col gap-1.5 p-3 bg-slate-950/40 rounded-lg border border-slate-800/80">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-medium">Vehicle Inflow / Spawn Rate</span>
          <span className="font-mono text-slate-200 tabular-nums">
            {road.spawnRate} veh/min
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="40"
          step="2"
          value={road.spawnRate}
          onChange={(e) => handleSpawnRateChange(Number(e.target.value))}
          className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0 (Pass-through)</span>
          <span>40 (Heavy rush)</span>
        </div>
      </div>

      {/* Delete Road */}
      <div className="pt-2 border-t border-slate-800 flex justify-end">
        <button
          onClick={onDelete}
          className="py-1.5 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-200 rounded-lg text-xs font-medium transition-colors"
        >
          Delete Road Segment
        </button>
      </div>
    </div>
  );
};
