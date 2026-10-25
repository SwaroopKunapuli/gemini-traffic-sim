/**
 * Real-Time Simulation Analytics & Engineering Metrics Bar
 */
import React from 'react';
import { SimulationMetrics } from '../types/traffic';

interface MetricsBarProps {
  metrics: SimulationMetrics;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  return (
    <div className="flex items-center justify-between px-6 py-2 bg-slate-950 border-t border-slate-800 text-slate-300 text-xs font-mono">
      {/* Metric 1: Active Agents */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-sans">Active Agents:</span>
        <span className="text-white font-bold tabular-nums">
          {metrics.activeVehicles}
        </span>
      </div>

      <div className="w-px h-3.5 bg-slate-800" />

      {/* Metric 2: Average Speed */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-sans">Avg Speed:</span>
        <span
          className={`font-bold tabular-nums ${
            metrics.averageSpeedKmh < 15
              ? 'text-red-400'
              : metrics.averageSpeedKmh < 30
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}
        >
          {metrics.averageSpeedKmh} km/h
        </span>
      </div>

      <div className="w-px h-3.5 bg-slate-800" />

      {/* Metric 3: Throughput */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-sans">Throughput:</span>
        <span className="text-sky-400 font-bold tabular-nums">
          {metrics.throughputPerMinute} veh/min
        </span>
      </div>

      <div className="w-px h-3.5 bg-slate-800" />

      {/* Metric 4: Congestion Index */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-sans">Congestion Index:</span>
        <span
          className={`font-bold tabular-nums ${
            metrics.congestionIndexPercent > 40
              ? 'text-red-400'
              : metrics.congestionIndexPercent > 20
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}
        >
          {metrics.congestionIndexPercent}%
        </span>
      </div>

      <div className="w-px h-3.5 bg-slate-800" />

      {/* Metric 5: Average Signal Delay */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-sans">Avg Wait Delay:</span>
        <span className="text-slate-200 font-bold tabular-nums">
          {metrics.averageDelaySeconds}s
        </span>
      </div>

      <div className="w-px h-3.5 bg-slate-800" />

      {/* Metric 6: Completed Trips */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-sans">Trips Completed:</span>
        <span className="text-slate-200 font-bold tabular-nums">
          {metrics.completedTrips}
        </span>
      </div>
    </div>
  );
};
