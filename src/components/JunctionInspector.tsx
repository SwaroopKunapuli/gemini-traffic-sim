/**
 * Traffic Junction Inspector & Signal Timing Customization Deck
 */
import React from 'react';
import { TrafficSimulationEngine } from '../simulation/engine';
import { getSortedApproachesForJunction } from '../simulation/network';
import { getJunctionSignalSnapshot } from '../simulation/signals';
import { JunctionType, NetworkNode, RotationSense } from '../types/traffic';

interface JunctionInspectorProps {
  nodeId: string;
  engine: TrafficSimulationEngine;
  onClose: () => void;
  onUpdate: () => void;
}

export const JunctionInspector: React.FC<JunctionInspectorProps> = ({
  nodeId,
  engine,
  onClose,
  onUpdate,
}) => {
  const node = engine.nodes.get(nodeId);
  if (!node || !node.isIntersection || !node.intersectionConfig) return null;

  const config = node.intersectionConfig;
  const roadsList = Array.from(engine.roads.values());
  const queues = engine.calculateQueues();
  const snapshot = getJunctionSignalSnapshot(node, roadsList, engine.nodes, queues);

  const handleTypeChange = (type: JunctionType) => {
    config.type = type;
    config.phaseTimer = 0;
    config.subPhase = 'green';
    onUpdate();
  };

  const handleRotationChange = (sense: RotationSense) => {
    config.rotationSense = sense;
    config.currentPhaseIndex = 0;
    config.phaseTimer = 0;
    config.subPhase = 'green';
    onUpdate();
  };

  const handleGreenDurationChange = (val: number) => {
    config.greenDuration = val;
    onUpdate();
  };

  const handleYellowDurationChange = (val: number) => {
    config.yellowDuration = val;
    onUpdate();
  };

  const handleAllRedDurationChange = (val: number) => {
    config.allRedDuration = val;
    onUpdate();
  };

  const handleAdvancePhase = () => {
    config.phaseTimer = 0;
    config.subPhase = 'green';
    const approaches = getSortedApproachesForJunction(node, roadsList, engine.nodes);
    const n = Math.max(1, approaches.length);
    config.currentPhaseIndex = (config.currentPhaseIndex + 1) % n;
    onUpdate();
  };

  const handleToggleHold = (roadId: string) => {
    if (config.manualGreenApproach === roadId) {
      config.manualGreenApproach = null;
    } else {
      config.manualGreenApproach = roadId;
    }
    onUpdate();
  };

  const cycleLength = (config.greenDuration + config.yellowDuration + config.allRedDuration) * (snapshot?.totalPhases || 1);

  return (
    <div className="w-84 max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-5 text-slate-200 flex flex-col gap-4 text-sm font-sans backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            {node.name || `Junction ${node.id}`}
          </h2>
          <div className="text-xs text-slate-400 mt-0.5">
            Intersection Controller & Phasing
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

      {/* Junction Control Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Control Type</label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 rounded-lg border border-slate-800">
          <button
            onClick={() => handleTypeChange('traffic_light')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
              config.type === 'traffic_light'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Traffic Light
          </button>
          <button
            onClick={() => handleTypeChange('roundabout')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
              config.type === 'roundabout'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Roundabout
          </button>
          <button
            onClick={() => handleTypeChange('priority_yield')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
              config.type === 'priority_yield'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Priority / Yield
          </button>
          <button
            onClick={() => handleTypeChange('all_way_stop')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
              config.type === 'all_way_stop'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All-Way Stop
          </button>
        </div>
      </div>

      {config.type === 'traffic_light' && (
        <>
          {/* Sense of Rotation of Green Light */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              Sense of Green Rotation Around Junction
            </label>
            <div className="flex flex-col gap-1">
              {[
                { id: 'clockwise', label: 'Clockwise (N → E → S → W)' },
                { id: 'counter_clockwise', label: 'Counter-Clockwise (N → W → S → E)' },
                { id: 'opposing_pairs', label: 'Opposing Pairs (N+S then E+W)' },
                { id: 'split_phase', label: 'Split Phase (Protected Approach)' },
                { id: 'sensor_actuated', label: 'Sensor-Actuated (Queue Adaptive)' },
              ].map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => handleRotationChange(scheme.id as RotationSense)}
                  className={`px-3 py-2 text-xs rounded-lg text-left transition-colors flex items-center justify-between border ${
                    config.rotationSense === scheme.id
                      ? 'bg-sky-950/70 border-sky-500/60 text-sky-200 font-medium'
                      : 'bg-slate-950/30 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span>{scheme.label}</span>
                  {config.rotationSense === scheme.id && (
                    <span className="text-[10px] text-sky-400 font-mono">Active</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Phase Timers */}
          <div className="flex flex-col gap-3 p-3 bg-slate-950/40 rounded-lg border border-slate-800/80">
            <div className="text-xs font-medium text-slate-300">Signal Interval Timings</div>

            {/* Green Light Duration */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span>●</span> Green Light Duration
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {config.greenDuration}s
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="40"
                step="1"
                value={config.greenDuration}
                onChange={(e) => handleGreenDurationChange(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Yellow Light Duration */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 flex items-center gap-1">
                  <span>●</span> Yellow Light Duration
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {config.yellowDuration}s
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="6"
                step="0.5"
                value={config.yellowDuration}
                onChange={(e) => handleYellowDurationChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* All-Red Clearance Duration */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-red-400 flex items-center gap-1">
                  <span>●</span> All-Red Clearance
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {config.allRedDuration}s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={config.allRedDuration}
                onChange={(e) => handleAllRedDurationChange(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
              <span>Full Cycle Length:</span>
              <span className="font-mono text-slate-200">{Math.round(cycleLength)}s</span>
            </div>
          </div>

          {/* Real-Time Approach Status & Override */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">
                Connected Approaches ({snapshot?.approaches.length || 0})
              </label>
              <button
                onClick={handleAdvancePhase}
                className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                title="Immediately advance to next green phase"
              >
                Skip to Next Phase
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {snapshot?.approaches.map((app, idx) => {
                const road = engine.roads.get(app.roadId);
                const isHeld = config.manualGreenApproach === app.roadId;

                return (
                  <div
                    key={app.roadId}
                    className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          app.state === 'green'
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                            : app.state === 'yellow'
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                            : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                        }`}
                      />
                      <div>
                        <div className="font-medium text-slate-200">
                          {road?.name || `Approach #${idx + 1}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Queue: {app.queueCount} vehicle{app.queueCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleHold(app.roadId)}
                      className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                        isHeld
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isHeld ? 'Locked Green' : 'Force Green'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
