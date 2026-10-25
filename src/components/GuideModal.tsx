/**
 * Guide Modal explaining Agent-Based Modeling & Traffic Signal Rotation Dynamics
 */
import React from 'react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Traffic Engineering & ABM Guide</h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Principles of Microscopic Simulation, Signal Rotation, and Driver Personalities
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-sky-400">
              01. Intersection Signal Phasing & Rotation Sense
            </h3>
            <p>
              In urban traffic engineering, junction signal controllers govern conflicting vehicular movements. In this simulator, each intersection allows you to customize:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>
                <strong className="text-slate-200">Clockwise Rotation:</strong> Green light cycles consecutively around the junction clockwise (e.g. North → East → South → West). Useful for single-lane roundabouts or protected single-leg stages.
              </li>
              <li>
                <strong className="text-slate-200">Counter-Clockwise Rotation:</strong> Green light cycles in reverse compass order (North → West → South → East).
              </li>
              <li>
                <strong className="text-slate-200">Opposing Pairs:</strong> Dual-phase standard cycle where opposing avenues (North & South) proceed concurrently, followed by the cross-streets (East & West). Generally provides the highest vehicle capacity.
              </li>
              <li>
                <strong className="text-slate-200">Sensor-Actuated:</strong> Detects real-time queue length on each incoming approach. If an approach queue clears early, green is cut short to grant right-of-way to backlogged legs.
              </li>
              <li>
                <strong className="text-slate-200">Red & Green Durations:</strong> Customize green times (4–40s), amber yellow (2–6s), and all-red clearance intervals to prevent t-bone intersection collisions.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-sky-400">
              02. Microscopic Agent-Based Modeling (IDM)
            </h3>
            <p>
              Rather than simulating traffic as a continuous fluid, each vehicle is an autonomous agent executing the <em>Intelligent Driver Model (IDM)</em>:
            </p>
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg font-mono text-[11px] text-sky-200">
              a = a_max * [ 1 - (v / v_0)^4 - (s*(v, Δv) / s)^2 ]
            </div>
            <p>
              Where <code className="text-slate-200">v_0</code> is desired speed, <code className="text-slate-200">T</code> is safe time headway, <code className="text-slate-200">s_0</code> is minimum jam distance, and <code className="text-slate-200">s*(v, Δv)</code> is dynamic following gap.
            </p>
          </div>

          {/* Section 3 */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-sky-400">
              03. Driver Personalities & Emergency Right-of-Way
            </h3>
            <p>
              Vehicles spawn with heterogeneous behavioral profiles:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-950/50 rounded border border-slate-800">
                <span className="font-semibold text-emerald-400">Cautious:</span> Larger time headway (2.1s), lower acceleration, stops early for yellow lights.
              </div>
              <div className="p-2 bg-slate-950/50 rounded border border-slate-800">
                <span className="font-semibold text-sky-400">Normal:</span> Standard commuter settings (1.4s headway, 52 km/h cruise).
              </div>
              <div className="p-2 bg-slate-950/50 rounded border border-slate-800">
                <span className="font-semibold text-amber-400">Aggressive:</span> Tight following distance (0.95s headway), fast acceleration, agile lane changes.
              </div>
              <div className="p-2 bg-slate-950/50 rounded border border-slate-800">
                <span className="font-semibold text-red-400">Ambulance:</span> Emergency priority with active sirens, high speed limit, other drivers yield.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
