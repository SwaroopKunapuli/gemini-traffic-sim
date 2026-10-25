/**
 * Network Export & Import Modal (JSON)
 */
import React, { useState } from 'react';
import { TrafficSimulationEngine } from '../simulation/engine';
import { NetworkNode, RoadEdge } from '../types/traffic';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: TrafficSimulationEngine;
  onImportNetwork: (nodes: NetworkNode[], roads: RoadEdge[]) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  engine,
  onImportNetwork,
}) => {
  if (!isOpen) return null;

  const currentExport = JSON.stringify(
    {
      nodes: Array.from(engine.nodes.values()),
      roads: Array.from(engine.roads.values()),
    },
    null,
    2
  );

  const [jsonText, setJsonText] = useState(currentExport);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.roads)) {
        throw new Error('JSON must include "nodes" and "roads" arrays.');
      }
      onImportNetwork(parsed.nodes, parsed.roads);
      setErrorMsg(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid JSON format');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Export / Import Scenario JSON</h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Copy current configuration or paste custom network topology to load
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
        <div className="p-6 flex flex-col gap-3">
          {errorMsg && (
            <div className="p-2.5 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full h-64 p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 focus:outline-none focus:border-sky-500/70 resize-none"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              {copyFeedback ? 'Copied to Clipboard!' : 'Copy JSON'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Import & Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
